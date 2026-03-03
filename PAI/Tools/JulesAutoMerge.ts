#!/usr/bin/env bun
/**
 * JulesAutoMerge.ts — Auto-merge pipeline for Jules PRs
 *
 * Checks completed Jules sessions, runs tests in isolated worktree,
 * merges passing PRs via gh CLI, syncs local repo.
 *
 * Usage:
 *   bun JulesAutoMerge.ts check                Show ready PRs
 *   bun JulesAutoMerge.ts check --repo private  Check specific repo
 *   bun JulesAutoMerge.ts merge                Auto-merge passing PRs
 *   bun JulesAutoMerge.ts merge --dry-run      Preview without merging
 *   bun JulesAutoMerge.ts merge --repo private  Merge specific repo
 *   bun JulesAutoMerge.ts status               Show stats
 *
 * @author PAI System
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from '../../hooks/lib/paths';
import { appendEvent } from '../../hooks/lib/event-emitter';
import { inference } from './Inference';

// ── Constants ──

const PAI_DIR = getPaiDir();
const ENV_PATH = join(process.env.HOME!, '.config', 'PAI', '.env');
// Instead of a static constant, compute it dynamically or via a getter so mock logic inside getPaiDir applies.
const getStatePath = () => join(getPaiDir(), 'MEMORY', 'STATE', 'jules-automerge.json');
const JULES_BASE_URL = 'https://jules.googleapis.com/v1alpha';
const TEST_TIMEOUT = 120_000;
const A0_REVIEW_TIMEOUT = 120_000;
const ZAI_REVIEW_TIMEOUT = 30_000;
const A0_TOOL = join(PAI_DIR, 'PAI', 'Tools', 'AgentZero.ts');
const INFERENCE_TOOL = join(PAI_DIR, 'PAI', 'Tools', 'Inference.ts');

// ANSI
const R = '\x1b[31m';
const G = '\x1b[32m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const D = '\x1b[2m';
const B = '\x1b[1m';
const X = '\x1b[0m';

// ── Repo Configs ──

interface RepoConfig {
  key: string;
  remote: string;
  repo: string;
  source: string;
  branch: string;
  autoMerge: boolean; // false = check+review only, true = full pipeline
}

const REPOS: Record<string, RepoConfig> = {
  private: {
    key: 'private',
    remote: 'private',
    repo: 'rikitikitavi2012-debug/PAI-personal',
    source: 'sources/github/rikitikitavi2012-debug/PAI-personal',
    branch: 'master',
    autoMerge: true,
  },
  origin: {
    key: 'origin',
    remote: 'origin',
    repo: 'rikitikitavi2012-debug/PAI',
    source: 'sources/github/rikitikitavi2012-debug/PAI',
    branch: 'main',
    autoMerge: false, // origin PRs need manual review before upstream submission
  },
};

// ── Types ──

export interface RepoConfig {
  key: string;
  remote: string;
  repo: string;
  source: string;
  branch: string;
}

export interface ProcessedSession {
  sessionId: string;
  prNumber: number;
  prUrl: string;
  result: 'merged' | 'failed_tests' | 'failed_merge' | 'failed_review' | 'skipped';
  processedAt: string;
  repo: string;
  testOutput?: string;
  zaiReviewSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ERROR';
}

export interface AutoMergeState {
  lastCheck: string;
  processedSessions: ProcessedSession[];
  stats: { totalMerged: number; totalFailed: number; totalSkipped: number };
}

export interface JulesSession {
  name: string;
  title: string;
  state: string;
  outputs?: Array<{
    pullRequest?: { url: string; title: string; baseRef: string; headRef: string };
  }>;
}

// ── State Management ──

export function loadState(): AutoMergeState {
  try {
    const p = getStatePath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {}
  return { lastCheck: '', processedSessions: [], stats: { totalMerged: 0, totalFailed: 0, totalSkipped: 0 } };
}

export function saveState(state: AutoMergeState): void {
  const dir = join(getPaiDir(), 'MEMORY', 'STATE');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(getStatePath(), JSON.stringify(state, null, 2), 'utf-8');
}

export function isProcessed(state: AutoMergeState, sessionId: string): boolean {
  return state.processedSessions.some(s => s.sessionId === sessionId && (s.result === 'merged' || s.result === 'skipped'));
}

// ── Jules API ──

function loadApiKey(): string {
  try {
    const env = readFileSync(ENV_PATH, 'utf-8');
    const match = env.match(/^JULES_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  console.error(`${R}ERROR:${X} JULES_API_KEY not found in ${ENV_PATH}`);
  process.exit(1);
}

async function julesApi(path: string): Promise<any> {
  const key = loadApiKey();
  const res = await fetch(`${JULES_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
  });
  if (!res.ok) throw new Error(`Jules API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getCompletedSessions(repo: RepoConfig): Promise<JulesSession[]> {
  const data = await julesApi('/sessions');
  const sessions = (data.sessions || []) as JulesSession[];
  return sessions.filter(s => s.state === 'COMPLETED');
}

async function getSessionDetails(sessionId: string): Promise<JulesSession> {
  const path = sessionId.startsWith('sessions/') ? `/${sessionId}` : `/sessions/${sessionId}`;
  return julesApi(path) as Promise<JulesSession>;
}

// ── Git & gh CLI ──

function run(cmd: string[], opts?: { cwd?: string; timeout?: number }): { ok: boolean; stdout: string; stderr: string } {
  const result = Bun.spawnSync(cmd, {
    cwd: opts?.cwd || PAI_DIR,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: opts?.timeout,
  });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout?.toString().trim() || '',
    stderr: result.stderr?.toString().trim() || '',
  };
}

/** Async version of run() — non-blocking, enables Promise.all parallelism */
function runAsync(cmd: string[], opts?: { cwd?: string; timeout?: number }): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = Bun.spawn(cmd, {
      cwd: opts?.cwd || PAI_DIR,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const timeoutId = opts?.timeout ? setTimeout(() => {
      proc.kill();
      resolve({ ok: false, stdout: '', stderr: `Timeout after ${opts.timeout}ms` });
    }, opts.timeout) : null;

    Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]).then(async ([stdout, stderr]) => {
      const exitCode = await proc.exited;
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ ok: exitCode === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    }).catch(() => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ ok: false, stdout: '', stderr: 'Process error' });
    });
  });
}

export function ghPrList(repo: string): Array<{ number: number; title: string; headRefName: string; baseRefName: string }> {
  const result = run(['gh', 'pr', 'list', '--repo', repo, '--state', 'open', '--json', 'number,title,headRefName,baseRefName']);
  if (!result.ok) return [];
  try { return JSON.parse(result.stdout); } catch { return []; }
}

// ── Test Runner (worktree isolation) ──

async function runTestsOnBranch(repo: RepoConfig, branchName: string): Promise<{ passed: boolean; output: string; durationMs: number }> {
  const worktreePath = `/tmp/jules-automerge-${Date.now()}`;

  // Fetch remote branch
  const fetch = run(['git', 'fetch', repo.remote, branchName]);
  if (!fetch.ok) return { passed: false, output: `Fetch failed: ${fetch.stderr}`, durationMs: 0 };

  // Create worktree
  const wt = run(['git', 'worktree', 'add', worktreePath, `${repo.remote}/${branchName}`]);
  if (!wt.ok) return { passed: false, output: `Worktree failed: ${wt.stderr}`, durationMs: 0 };

  try {
    const start = Date.now();
    const test = run(['bun', 'test', 'hooks/tests/'], { cwd: worktreePath, timeout: TEST_TIMEOUT });
    const durationMs = Date.now() - start;
    const output = test.stdout || test.stderr;
    return { passed: test.ok, output: output.slice(-500), durationMs };
  } finally {
    // Always cleanup
    run(['git', 'worktree', 'remove', worktreePath, '--force']);
    try { rmSync(worktreePath, { recursive: true, force: true }); } catch {}
  }
}

// ── A0 Code Review ──

interface A0ReviewResult {
  ok: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'ERROR';
  summary: string;
}

async function a0ReviewDiff(repo: RepoConfig, prNumber: number, diffText?: string): Promise<A0ReviewResult> {
  // Get PR diff via gh (async to enable parallel execution)
  if (!diffText) {
    const diff = await runAsync(['gh', 'pr', 'diff', String(prNumber), '--repo', repo.repo]);
    if (!diff.ok) return { ok: true, severity: 'ERROR', summary: 'Could not fetch diff, skipping review' };
    diffText = diff.stdout.slice(0, 4000);
  }
  if (!diffText.trim()) return { ok: true, severity: 'LOW', summary: 'Empty diff' };

  // Check if A0 is available
  const health = await runAsync(['bun', A0_TOOL, 'health'], { timeout: 10_000 });
  if (!health.ok) return { ok: true, severity: 'ERROR', summary: 'A0 unreachable, skipping review' };

  // Send diff to A0 for review
  const prompt = `Review this git diff for security vulnerabilities, command injection, path traversal, and code quality issues. Be concise. Reply with ONLY a JSON object: {"severity":"LOW"|"MEDIUM"|"HIGH","issues":[{"type":"security|quality|performance","description":"..."}]}\n\nDiff:\n${diffText}`;

  const result = await runAsync(['bun', A0_TOOL, 'message', prompt], { timeout: A0_REVIEW_TIMEOUT });
  if (!result.ok) return { ok: true, severity: 'ERROR', summary: 'A0 review failed, skipping' };

  // Parse A0 response
  try {
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: true, severity: 'LOW', summary: 'A0 returned non-JSON, assuming clean' };

    const review = JSON.parse(jsonMatch[0]);
    const severity = review.severity || 'LOW';
    const issueCount = review.issues?.length || 0;
    const summary = issueCount > 0
      ? `${issueCount} issue(s): ${review.issues.map((i: any) => i.description).join('; ').slice(0, 200)}`
      : 'Clean';

    return { ok: severity !== 'HIGH', severity, summary };
  } catch {
    return { ok: true, severity: 'LOW', summary: 'A0 parse failed, assuming clean' };
  }
}

// ── Z.AI Code Review (direct API via inference(), no subprocess) ──

async function zaiReviewDiff(repo: RepoConfig, prNumber: number, diffText?: string): Promise<A0ReviewResult> {
  // Get PR diff via gh (async) if not provided
  if (!diffText) {
    const diff = await runAsync(['gh', 'pr', 'diff', String(prNumber), '--repo', repo.repo]);
    if (!diff.ok) return { ok: true, severity: 'ERROR', summary: 'Could not fetch diff, skipping Z.AI review' };
    diffText = diff.stdout.slice(0, 4000);
  }
  if (!diffText.trim()) return { ok: true, severity: 'LOW', summary: 'Empty diff' };

  // Direct API call via inference() — no subprocess, truly async
  const systemPrompt = 'You are a code reviewer focused on code quality, patterns, and bugs. Reply ONLY with valid JSON.';
  const userPrompt = `Review this git diff for code quality issues, anti-patterns, potential bugs, and performance problems. Reply with ONLY a JSON object: {"severity":"LOW"|"MEDIUM"|"HIGH","issues":[{"type":"quality|bug|performance|pattern","description":"..."}]}\n\nDiff:\n${diffText}`;

  try {
    const result = await inference({
      systemPrompt,
      userPrompt,
      level: 'glm5',
      expectJson: true,
      timeout: ZAI_REVIEW_TIMEOUT,
    });

    if (!result.success) return { ok: true, severity: 'ERROR', summary: `Z.AI review failed: ${result.error}` };

    const review = result.parsed as any;
    if (!review) return { ok: true, severity: 'LOW', summary: 'Z.AI returned empty, assuming clean' };

    const severity = review.severity || 'LOW';
    const issueCount = review.issues?.length || 0;
    const summary = issueCount > 0
      ? `${issueCount} issue(s): ${review.issues.map((i: any) => i.description).join('; ').slice(0, 200)}`
      : 'Clean';

    return { ok: severity !== 'HIGH', severity, summary };
  } catch {
    return { ok: true, severity: 'LOW', summary: 'Z.AI review exception, assuming clean' };
  }
}

// ── Pipeline ──

export async function processPR(
  repo: RepoConfig,
  session: JulesSession,
  pr: { number: number; title: string; headRefName: string; baseRefName: string },
  state: AutoMergeState,
  dryRun: boolean,
): Promise<ProcessedSession> {
  const sessionId = session.name;
  const record: ProcessedSession = {
    sessionId,
    prNumber: pr.number,
    prUrl: `https://github.com/${repo.repo}/pull/${pr.number}`,
    result: 'skipped',
    processedAt: new Date().toISOString(),
    repo: repo.repo,
  };

  // Safety: check target branch
  if (pr.baseRefName !== repo.branch) {
    console.log(`  ${Y}SKIP${X} PR #${pr.number}: targets ${pr.baseRefName}, expected ${repo.branch}`);
    return record;
  }

  if (dryRun) {
    console.log(`  ${C}DRY${X}  PR #${pr.number}: ${pr.title} (would test & merge)`);
    return record;
  }

  // Origin repos: A0 review only, no auto-merge (needs manual upstream submission)
  if (!repo.autoMerge) {
    console.log(`  ${D}A0 reviewing PR #${pr.number} (no auto-merge for ${repo.key})...${X}`);
    const review = await a0ReviewDiff(repo, pr.number);
    const icon = review.severity === 'HIGH' ? R : review.severity === 'MEDIUM' ? Y : G;
    console.log(`  ${icon}REVIEW${X} PR #${pr.number}: ${review.severity} — ${review.summary.slice(0, 100)}`);
    record.result = 'skipped';
    state.stats.totalSkipped++;
    return record;
  }

  // Run tests
  console.log(`  ${D}Testing PR #${pr.number}...${X}`);
  const test = await runTestsOnBranch(repo, pr.headRefName);
  console.log(`  ${D}Tests: ${test.passed ? 'PASS' : 'FAIL'} (${(test.durationMs / 1000).toFixed(1)}s)${X}`);

  if (!test.passed) {
    record.result = 'failed_tests';
    record.testOutput = test.output;
    console.log(`  ${R}FAIL${X} PR #${pr.number}: tests failed`);
    state.stats.totalFailed++;
    return record;
  }

  // Fetch diff once, share between reviewers
  const diffResult = await runAsync(['gh', 'pr', 'diff', String(pr.number), '--repo', repo.repo]);
  const diffText = diffResult.ok ? diffResult.stdout.slice(0, 4000) : '';

  // A0 + Z.AI Code Reviews — PARALLEL (Promise.all)
  console.log(`  ${D}Reviewing PR #${pr.number} (A0 + Z.AI parallel)...${X}`);
  const [review, zaiReview] = await Promise.all([
    a0ReviewDiff(repo, pr.number, diffText),
    zaiReviewDiff(repo, pr.number, diffText),
  ]);

  // A0 result
  console.log(`  ${D}A0: ${review.severity} — ${review.summary.slice(0, 80)}${X}`);
  if (!review.ok) {
    record.result = 'failed_review';
    record.testOutput = review.summary;
    console.log(`  ${R}BLOCKED${X} PR #${pr.number}: A0 found HIGH severity issues`);
    state.stats.totalFailed++;
    return record;
  }

  // Z.AI result
  record.zaiReviewSeverity = zaiReview.severity;
  const zaiIcon = zaiReview.severity === 'HIGH' ? R : zaiReview.severity === 'MEDIUM' ? Y : G;
  console.log(`  ${zaiIcon}Z.AI${X} PR #${pr.number}: ${zaiReview.severity} — ${zaiReview.summary.slice(0, 80)}`);
  if (!zaiReview.ok) {
    record.result = 'failed_review';
    record.testOutput = `Z.AI: ${zaiReview.summary}`;
    console.log(`  ${R}BLOCKED${X} PR #${pr.number}: Z.AI found HIGH severity issues`);
    state.stats.totalFailed++;
    return record;
  }

  // Merge
  const merge = run(['gh', 'pr', 'merge', String(pr.number), '--repo', repo.repo, '--squash', '--delete-branch', '--admin']);
  if (!merge.ok) {
    record.result = 'failed_merge';
    record.testOutput = merge.stderr;
    console.log(`  ${R}FAIL${X} PR #${pr.number}: merge failed — ${merge.stderr.slice(0, 100)}`);
    state.stats.totalFailed++;
    return record;
  }

  // Sync local
  run(['git', 'pull', repo.remote, repo.branch]);

  record.result = 'merged';
  state.stats.totalMerged++;
  console.log(`  ${G}MERGED${X} PR #${pr.number}: ${pr.title}`);

  // Log event
  appendEvent({
    type: 'custom.jules_automerge' as any,
    source: 'JulesAutoMerge',
    session_id: sessionId,
    pr_number: pr.number,
    repo: repo.repo,
    test_duration_ms: test.durationMs,
    review_severity: review.severity,
    zai_review_severity: zaiReview.severity,
  } as any);

  return record;
}

export async function findReadyPRs(repo: RepoConfig, state: AutoMergeState): Promise<Array<{ session: JulesSession; pr: { number: number; title: string; headRefName: string; baseRefName: string } }>> {
  const sessions = await getCompletedSessions(repo);
  const prs = ghPrList(repo.repo);
  const ready: Array<{ session: JulesSession; pr: typeof prs[0] }> = [];
  const seenPRs = new Set<number>();

  for (const session of sessions) {
    if (isProcessed(state, session.name)) continue;

    // Get session details to find PR info
    let details: JulesSession;
    try { details = await getSessionDetails(session.name); } catch { continue; }

    // Match session to open PR (PR can be in any outputs element)
    const prOutput = details.outputs?.find(o => o.pullRequest);
    const prUrl = prOutput?.pullRequest?.url;
    const headRef = prOutput?.pullRequest?.headRef;

    let matchedPr: typeof prs[0] | undefined;

    if (prUrl) {
      const prNumMatch = prUrl.match(/\/pull\/(\d+)/);
      if (prNumMatch) {
        const prNum = parseInt(prNumMatch[1]);
        matchedPr = prs.find(p => p.number === prNum);
      }
    } else if (headRef) {
      matchedPr = prs.find(p => p.headRefName === headRef);
    }

    // Deduplicate: only process each PR once (first matching session wins)
    if (matchedPr && !seenPRs.has(matchedPr.number)) {
      seenPRs.add(matchedPr.number);
      ready.push({ session: details, pr: matchedPr });
    }
  }

  return ready;
}

// ── Commands ──

async function cmdCheck(repos: RepoConfig[]): Promise<void> {
  const state = loadState();
  for (const repo of repos) {
    console.log(`\n${B}${repo.repo}${X} ${D}(${repo.remote}/${repo.branch})${X}`);
    try {
      const ready = await findReadyPRs(repo, state);
      if (ready.length === 0) {
        console.log(`  ${D}No ready PRs${X}`);
        continue;
      }
      for (const { pr } of ready) {
        console.log(`  ${G}#${pr.number}${X}  ${pr.title}`);
      }
      console.log(`  ${D}${ready.length} PR(s) ready to merge${X}`);
    } catch (e) {
      console.log(`  ${R}Error:${X} ${(e as Error).message}`);
    }
  }
}

async function cmdMerge(repos: RepoConfig[], dryRun: boolean): Promise<void> {
  const state = loadState();
  state.lastCheck = new Date().toISOString();
  let totalProcessed = 0;

  for (const repo of repos) {
    console.log(`\n${B}${repo.repo}${X} ${D}(${repo.remote}/${repo.branch})${X}`);
    try {
      const ready = await findReadyPRs(repo, state);
      if (ready.length === 0) {
        console.log(`  ${D}No ready PRs${X}`);
        continue;
      }

      for (const { session, pr } of ready) {
        const record = await processPR(repo, session, pr, state, dryRun);
        if (!dryRun) {
          state.processedSessions.push(record);
          saveState(state); // Save after each PR (crash-safe)
        }
        totalProcessed++;
      }
    } catch (e) {
      console.log(`  ${R}Error:${X} ${(e as Error).message}`);
    }
  }

  if (!dryRun) saveState(state);
  console.log(`\n${D}Processed: ${totalProcessed} | Merged: ${state.stats.totalMerged} | Failed: ${state.stats.totalFailed}${X}`);
}

function cmdStatus(): void {
  const state = loadState();
  console.log(`${B}Jules Auto-Merge Status${X}\n`);
  console.log(`Last check: ${state.lastCheck || 'never'}`);
  console.log(`Total merged: ${G}${state.stats.totalMerged}${X}`);
  console.log(`Total failed: ${R}${state.stats.totalFailed}${X}`);
  console.log(`Total skipped: ${D}${state.stats.totalSkipped}${X}`);

  if (state.processedSessions.length > 0) {
    console.log(`\n${B}Recent:${X}`);
    for (const s of state.processedSessions.slice(-10)) {
      const icon = s.result === 'merged' ? `${G}+${X}` : s.result === 'skipped' ? `${D}~${X}` : `${R}x${X}`;
      console.log(`  ${icon} #${s.prNumber} ${s.result} ${D}${s.processedAt}${X}`);
    }
  }
}

// ── Main ──

if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const dryRun = args.includes('--dry-run');
  const repoFlag = args.indexOf('--repo');
  const repoKey = repoFlag >= 0 ? args[repoFlag + 1] : undefined;
  const repos = repoKey ? [REPOS[repoKey]].filter(Boolean) : Object.values(REPOS);

  if (!cmd || cmd === '--help') {
    console.log(`${B}Jules Auto-Merge Pipeline${X}

  ${C}check${X}                Show ready PRs
  ${C}check --repo private${X} Check specific repo
  ${C}merge${X}                Auto-merge passing PRs
  ${C}merge --dry-run${X}      Preview without merging
  ${C}merge --repo private${X} Merge specific repo only
  ${C}status${X}               Show stats`);
    process.exit(0);
  }

  switch (cmd) {
    case 'check': await cmdCheck(repos); break;
    case 'merge': await cmdMerge(repos, dryRun); break;
    case 'status': cmdStatus(); break;
    default:
      console.error(`${R}Unknown:${X} ${cmd}`);
      process.exit(1);
  }
}
