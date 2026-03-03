#!/usr/bin/env bun
/**
 * CommunityCheck.ts — Check upstream PAI community activity
 *
 * Shows new PRs, issues, and releases from Daniel's repo since last check.
 * Stores last check timestamp in MEMORY/STATE/community-check.json.
 *
 * Usage:
 *   bun run PAI/Tools/CommunityCheck.ts          # normal check
 *   bun run PAI/Tools/CommunityCheck.ts --force   # ignore cache, show all recent
 *   bun run PAI/Tools/CommunityCheck.ts --brief   # one-line summary only
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { homedir } from 'os';

const UPSTREAM_REPO = 'danielmiessler/Personal_AI_Infrastructure';
const OUR_USER = 'rikitikitavi2012-debug';
const STATE_FILE = join(homedir(), '.claude', 'MEMORY', 'STATE', 'community-check.json');
const CACHE_HOURS = 6; // don't check more often than this

interface CommunityState {
  lastCheck: string; // ISO timestamp
  lastPRCount: number;
  lastIssueCount: number;
  lastRelease: string;
}

interface GHItem {
  number: number;
  title: string;
  author: { login: string };
  createdAt: string;
  url: string;
  labels?: { name: string }[];
}

interface GHRelease {
  tagName: string;
  name: string;
  publishedAt: string;
  url: string;
}

function loadState(): CommunityState | null {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* first run */ }
  return null;
}

function saveState(state: CommunityState): void {
  const dir = join(homedir(), '.claude', 'MEMORY', 'STATE');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function ghQuery(args: string[]): string {
  const result = spawnSync('gh', args, {
    encoding: 'utf-8',
    timeout: 4000,
    env: { ...process.env, NO_COLOR: '1', GH_PAGER: '' },
  });
  if (result.status !== 0) {
    throw new Error(`gh failed: ${result.stderr?.trim()}`);
  }
  return result.stdout?.trim() || '';
}

function getOpenPRs(): GHItem[] {
  try {
    const json = ghQuery([
      'pr', 'list',
      '--repo', UPSTREAM_REPO,
      '--state', 'open',
      '--limit', '20',
      '--json', 'number,title,author,createdAt,url,labels',
    ]);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

function getOpenIssues(): GHItem[] {
  try {
    const json = ghQuery([
      'issue', 'list',
      '--repo', UPSTREAM_REPO,
      '--state', 'open',
      '--limit', '20',
      '--json', 'number,title,author,createdAt,url,labels',
    ]);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

function getLatestRelease(): GHRelease | null {
  try {
    const json = ghQuery([
      'release', 'view',
      '--repo', UPSTREAM_REPO,
      '--json', 'tagName,name,publishedAt,url',
    ]);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

function getOurPRs(): GHItem[] {
  try {
    const json = ghQuery([
      'pr', 'list',
      '--repo', UPSTREAM_REPO,
      '--author', OUR_USER,
      '--state', 'all',
      '--limit', '10',
      '--json', 'number,title,author,createdAt,url,labels',
    ]);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'только что';
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days}д назад`;
  return `${Math.floor(days / 7)}нед назад`;
}

// --- Main ---

const args = process.argv.slice(2);
const forceCheck = args.includes('--force');
const briefMode = args.includes('--brief');

const state = loadState();
const now = new Date();

// Cache check — skip if checked recently (unless --force)
if (!forceCheck && state) {
  const hoursSince = (now.getTime() - new Date(state.lastCheck).getTime()) / 3600000;
  if (hoursSince < CACHE_HOURS) {
    if (!briefMode) {
      console.log(`  ⏭️  Community check cached (${Math.round(hoursSince)}h ago, next in ${Math.round(CACHE_HOURS - hoursSince)}h)`);
    }
    process.exit(0);
  }
}

try {
  const prs = getOpenPRs();
  const issues = getOpenIssues();
  const release = getLatestRelease();
  const ourPRs = getOurPRs();

  // Determine what's new since last check
  const lastCheck = state?.lastCheck ? new Date(state.lastCheck) : new Date(0);
  const newPRs = prs.filter(pr => new Date(pr.createdAt) > lastCheck);
  const newIssues = issues.filter(issue => new Date(issue.createdAt) > lastCheck);
  const isNewRelease = release && state?.lastRelease && release.tagName !== state.lastRelease;

  // Brief mode — one line for LoadContext injection
  if (briefMode) {
    const parts: string[] = [];
    if (newPRs.length > 0) parts.push(`${newPRs.length} new PR${newPRs.length > 1 ? 's' : ''}`);
    if (newIssues.length > 0) parts.push(`${newIssues.length} new issue${newIssues.length > 1 ? 's' : ''}`);
    if (isNewRelease) parts.push(`new release: ${release!.tagName}`);

    if (parts.length > 0) {
      console.log(`  🔔 PAI upstream: ${parts.join(', ')} (${prs.length} PRs / ${issues.length} issues open)`);
    } else {
      console.log(`  ✅ PAI upstream: no new activity (${prs.length} PRs / ${issues.length} issues open)`);
    }

    saveState({
      lastCheck: now.toISOString(),
      lastPRCount: prs.length,
      lastIssueCount: issues.length,
      lastRelease: release?.tagName || state?.lastRelease || '',
    });
    process.exit(0);
  }

  // Full output
  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  🌐 PAI Community — upstream activity           │');
  console.log('└─────────────────────────────────────────────────┘');

  // Release
  if (release) {
    const marker = isNewRelease ? '🆕' : '📦';
    console.log(`  ${marker} Latest release: ${release.tagName} (${timeAgo(release.publishedAt)})`);
  }

  // New PRs
  if (newPRs.length > 0) {
    console.log(`\n  🆕 New PRs since last check (${newPRs.length}):`);
    for (const pr of newPRs.slice(0, 8)) {
      const ours = pr.author.login === OUR_USER ? ' ⭐' : '';
      console.log(`     #${pr.number} ${pr.title} (@${pr.author.login}, ${timeAgo(pr.createdAt)})${ours}`);
    }
  }

  // New Issues
  if (newIssues.length > 0) {
    console.log(`\n  🆕 New issues since last check (${newIssues.length}):`);
    for (const issue of newIssues.slice(0, 8)) {
      console.log(`     #${issue.number} ${issue.title} (@${issue.author.login}, ${timeAgo(issue.createdAt)})`);
    }
  }

  // Our PRs status
  if (ourPRs.length > 0) {
    console.log(`\n  ⭐ Our PRs:`);
    for (const pr of ourPRs.slice(0, 5)) {
      console.log(`     #${pr.number} ${pr.title} (${timeAgo(pr.createdAt)})`);
    }
  }

  // Summary
  console.log(`\n  📊 Total open: ${prs.length} PRs, ${issues.length} issues`);
  if (state) {
    const prDelta = prs.length - state.lastPRCount;
    const issDelta = issues.length - state.lastIssueCount;
    if (prDelta !== 0 || issDelta !== 0) {
      const prStr = prDelta > 0 ? `+${prDelta}` : `${prDelta}`;
      const issStr = issDelta > 0 ? `+${issDelta}` : `${issDelta}`;
      console.log(`     Δ since last check: PRs ${prStr}, Issues ${issStr}`);
    }
  }
  console.log('');

  // Save state
  saveState({
    lastCheck: now.toISOString(),
    lastPRCount: prs.length,
    lastIssueCount: issues.length,
    lastRelease: release?.tagName || state?.lastRelease || '',
  });

} catch (err) {
  console.error(`  ⚠️ Community check failed: ${err}`);
  process.exit(0); // fail-open
}
