#!/usr/bin/env bun
/**
 * ============================================================================
 * COMMUNITY WATCHER — Smart PAI Upstream Monitor
 * ============================================================================
 *
 * PURPOSE:
 * Monitors danielmiessler/Personal_AI_Infrastructure GitHub repo for:
 * - Our PR status (reviews, comments, merge status)
 * - New PRs/Issues that affect us
 * - New releases
 * - Discussions where we can contribute
 *
 * USAGE:
 *   bun CommunityWatcher.ts              — full report
 *   bun CommunityWatcher.ts --our-prs    — only our PRs
 *   bun CommunityWatcher.ts --new        — new activity (7 days)
 *   bun CommunityWatcher.ts --releases   — releases only
 *   bun CommunityWatcher.ts --brief      — one-line summary for dashboard
 *
 * OUTPUT: JSON to stdout + saves report to MEMORY/STATE/community-report.json
 *
 * ============================================================================
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '/home/ser';
const STATE_DIR = join(HOME, '.claude', 'MEMORY', 'STATE');
const REPORT_PATH = join(STATE_DIR, 'community-report.json');
const UPSTREAM_REPO = 'danielmiessler/Personal_AI_Infrastructure';
const OUR_FORK = 'rikitikitavi2012-debug/PAI-personal';
const OUR_USER = 'rikitikitavi2012-debug';

// Our tracked PRs
const OUR_PRS = [840, 859, 860, 861, 882, 883];
const OUR_ISSUES = [862, 863];

interface PRInfo {
  number: number;
  title: string;
  state: string;
  reviews: number;
  comments: number;
  updatedAt: string;
  action: string;
}

interface CommunityReport {
  timestamp: string;
  our_prs: PRInfo[];
  new_prs: Array<{ number: number; title: string; author: string; created: string }>;
  new_issues: Array<{ number: number; title: string; author: string; created: string; labels: string[] }>;
  our_issues: Array<{ number: number; title: string; state: string; comments: number }>;
  latest_release: { tag: string; date: string; name: string } | null;
  recommendations: string[];
  summary: string;
}

function gh(args: string): string {
  try {
    return execSync(`gh ${args}`, { encoding: 'utf-8', timeout: 15000 }).trim();
  } catch (e: any) {
    return e.stdout?.toString()?.trim() || '';
  }
}

function checkOurPRs(): PRInfo[] {
  const results: PRInfo[] = [];

  for (const num of OUR_PRS) {
    try {
      const raw = gh(`pr view ${num} --repo ${UPSTREAM_REPO} --json number,title,state,reviews,comments,updatedAt`);
      if (!raw) continue;
      const pr = JSON.parse(raw);
      const reviewCount = pr.reviews?.length || 0;
      const commentCount = pr.comments?.length || 0;

      let action = 'ждём review';
      if (pr.state === 'MERGED') action = '✅ смержен';
      else if (pr.state === 'CLOSED') action = '❌ закрыт';
      else if (reviewCount > 0) action = '⚠️ есть review — проверить';
      else if (commentCount > 0) action = '💬 есть комментарии — ответить';

      results.push({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        reviews: reviewCount,
        comments: commentCount,
        updatedAt: pr.updatedAt,
        action,
      });
    } catch { /* skip failed PR */ }
  }

  return results;
}

function checkOurIssues(): Array<{ number: number; title: string; state: string; comments: number }> {
  const results = [];
  for (const num of OUR_ISSUES) {
    try {
      const raw = gh(`issue view ${num} --repo ${UPSTREAM_REPO} --json number,title,state,comments`);
      if (!raw) continue;
      const issue = JSON.parse(raw);
      results.push({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        comments: issue.comments?.length || 0,
      });
    } catch { /* skip */ }
  }
  return results;
}

function getNewActivity(days: number = 7): { prs: any[]; issues: any[] } {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  let prs: any[] = [];
  try {
    const raw = gh(`pr list --repo ${UPSTREAM_REPO} --state all --json number,title,author,createdAt --limit 20`);
    if (raw) {
      prs = JSON.parse(raw)
        .filter((p: any) => p.createdAt >= since && p.author?.login !== OUR_USER)
        .map((p: any) => ({ number: p.number, title: p.title, author: p.author?.login, created: p.createdAt }));
    }
  } catch { /* skip */ }

  let issues: any[] = [];
  try {
    const raw = gh(`issue list --repo ${UPSTREAM_REPO} --state all --json number,title,author,createdAt,labels --limit 20`);
    if (raw) {
      issues = JSON.parse(raw)
        .filter((i: any) => i.createdAt >= since && i.author?.login !== OUR_USER)
        .map((i: any) => ({
          number: i.number,
          title: i.title,
          author: i.author?.login,
          created: i.createdAt,
          labels: (i.labels || []).map((l: any) => l.name),
        }));
    }
  } catch { /* skip */ }

  return { prs, issues };
}

function getLatestRelease(): { tag: string; date: string; name: string } | null {
  try {
    const raw = gh(`release view --repo ${UPSTREAM_REPO} --json tagName,publishedAt,name`);
    if (!raw) return null;
    const rel = JSON.parse(raw);
    return { tag: rel.tagName, date: rel.publishedAt, name: rel.name };
  } catch {
    return null;
  }
}

function generateRecommendations(report: Partial<CommunityReport>): string[] {
  const recs: string[] = [];

  // Check for PRs needing action
  for (const pr of report.our_prs || []) {
    if (pr.reviews > 0) recs.push(`PR #${pr.number}: есть ${pr.reviews} review — прочитать и ответить`);
    if (pr.comments > 0) recs.push(`PR #${pr.number}: есть ${pr.comments} комментарий(ев) — ответить`);
    if (pr.state === 'OPEN' && pr.reviews === 0 && pr.comments === 0) {
      const daysSinceUpdate = (Date.now() - new Date(pr.updatedAt).getTime()) / 86400000;
      if (daysSinceUpdate > 3) recs.push(`PR #${pr.number}: ${Math.floor(daysSinceUpdate)}д без ответа — пингнуть maintainer`);
    }
  }

  // Check for issues with responses
  for (const issue of report.our_issues || []) {
    if (issue.comments > 0) recs.push(`Issue #${issue.number}: есть ${issue.comments} комментарий(ев) — проверить`);
  }

  // Check for relevant new PRs
  for (const pr of report.new_prs || []) {
    const lower = pr.title.toLowerCase();
    if (lower.includes('hook') || lower.includes('rating') || lower.includes('algorithm') || lower.includes('security'))
      recs.push(`Новый PR #${pr.number} от ${pr.author}: "${pr.title}" — может пересекаться с нашей работой`);
  }

  if (recs.length === 0) recs.push('Всё спокойно — нет срочных действий');

  return recs;
}

async function main() {
  const mode = process.argv[2] || '--full';

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });

  const report: CommunityReport = {
    timestamp: new Date().toISOString(),
    our_prs: [],
    new_prs: [],
    new_issues: [],
    our_issues: [],
    latest_release: null,
    recommendations: [],
    summary: '',
  };

  if (mode === '--brief') {
    // Quick check — just our PRs
    report.our_prs = checkOurPRs();
    const needAction = report.our_prs.filter(p => p.reviews > 0 || p.comments > 0).length;
    const open = report.our_prs.filter(p => p.state === 'OPEN').length;
    report.summary = `PRs: ${open} open, ${needAction} need action`;
    console.log(report.summary);
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    return;
  }

  // Full report
  process.stderr.write('Checking our PRs...\n');
  report.our_prs = checkOurPRs();

  if (mode !== '--our-prs') {
    process.stderr.write('Checking new activity...\n');
    const activity = getNewActivity(7);
    report.new_prs = activity.prs;
    report.new_issues = activity.issues;

    process.stderr.write('Checking our issues...\n');
    report.our_issues = checkOurIssues();

    process.stderr.write('Checking releases...\n');
    report.latest_release = getLatestRelease();
  }

  report.recommendations = generateRecommendations(report);

  const needAction = report.our_prs.filter(p => p.reviews > 0 || p.comments > 0).length;
  const open = report.our_prs.filter(p => p.state === 'OPEN').length;
  report.summary = `PRs: ${open} open, ${needAction} need action. New: ${report.new_prs.length} PRs, ${report.new_issues.length} issues. Recs: ${report.recommendations.length}`;

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  // Pretty print
  console.log('\n═══ PAI COMMUNITY REPORT ═══════════════\n');

  console.log('### НАШИ PR');
  console.log('| # | Название | Статус | Reviews | Comments | Действие |');
  console.log('|---|----------|--------|---------|----------|----------|');
  for (const pr of report.our_prs) {
    console.log(`| #${pr.number} | ${pr.title.substring(0, 40)} | ${pr.state} | ${pr.reviews} | ${pr.comments} | ${pr.action} |`);
  }

  if (report.our_issues.length > 0) {
    console.log('\n### НАШИ ISSUES');
    for (const i of report.our_issues) {
      console.log(`  #${i.number}: ${i.title} — ${i.state}, ${i.comments} comments`);
    }
  }

  if (report.new_prs.length > 0) {
    console.log('\n### НОВЫЕ PR (7 дней)');
    for (const pr of report.new_prs) {
      console.log(`  #${pr.number}: ${pr.title} (by ${pr.author})`);
    }
  }

  if (report.new_issues.length > 0) {
    console.log('\n### НОВЫЕ ISSUES (7 дней)');
    for (const i of report.new_issues) {
      console.log(`  #${i.number}: ${i.title} (by ${i.author}) [${i.labels.join(', ')}]`);
    }
  }

  if (report.latest_release) {
    console.log(`\n### ПОСЛЕДНИЙ РЕЛИЗ: ${report.latest_release.tag} (${report.latest_release.date})`);
  }

  console.log('\n### РЕКОМЕНДАЦИИ');
  for (const rec of report.recommendations) {
    console.log(`  → ${rec}`);
  }

  console.log(`\n📊 ${report.summary}`);
  console.log(`💾 Отчёт сохранён: ${REPORT_PATH}`);
}

main().catch(err => {
  process.stderr.write(`[CommunityWatcher] Error: ${err}\n`);
  process.exit(1);
});
