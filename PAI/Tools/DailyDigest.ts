#!/usr/bin/env bun
/**
 * DailyDigest.ts — Aggregates all PAI data sources into a daily summary.
 *
 * Reads events.jsonl, learning signals, failure patterns, health status,
 * and active work items. Outputs JSON to stdout and saves to
 * MEMORY/STATE/daily-digest-YYYY-MM-DD.json.
 *
 * Usage:
 *   bun PAI/Tools/DailyDigest.ts                # Today's digest
 *   bun PAI/Tools/DailyDigest.ts --date 2026-03-04  # Specific date
 *   bun PAI/Tools/DailyDigest.ts --help          # This help
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

// ── Config ──

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const EVENTS_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'events.jsonl');
const HEALTH_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'health-report.json');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');

// ── Args ──

function parseArgs(): { date: string } {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`DailyDigest — PAI daily summary aggregator

Usage:
  bun PAI/Tools/DailyDigest.ts                  # Today's digest (UTC)
  bun PAI/Tools/DailyDigest.ts --date 2026-03-04  # Specific date

Output: JSON to stdout + saved to MEMORY/STATE/daily-digest-YYYY-MM-DD.json`);
    process.exit(0);
  }

  const dateIdx = args.indexOf('--date');
  if (dateIdx !== -1 && args[dateIdx + 1]) {
    const d = args[dateIdx + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      console.error(`Invalid date format: ${d}. Expected YYYY-MM-DD`);
      process.exit(1);
    }
    return { date: d };
  }

  // Default: today UTC
  return { date: new Date().toISOString().slice(0, 10) };
}

// ── Types ──

interface Event {
  type: string;
  source: string;
  timestamp: string;
  session_id?: string;
  rating?: number;
  data?: { provider?: string; level?: string; model?: string; [k: string]: unknown };
  [key: string]: unknown;
}

interface DigestOutput {
  date: string;
  generated: string;
  ratings: { count: number; avg: number; high_9_10: number; low_1_4: number };
  events: { total: number; by_type: Record<string, number> };
  brigade: { merges_ok: number; merges_fail: number; a0_messages: number; voice_sent: number };
  learning: { signals: number; failures: number };
  work: { active: number; completed_today: number; items: string[] };
  health: { all_healthy: boolean; last_check: string };
  inference: { ok: number; fail: number; parse_fail: number; providers: Record<string, number> };
}

// ── Event Loading ──

function loadEventsForDate(date: string): Event[] {
  if (!existsSync(EVENTS_PATH)) {
    return [];
  }

  const lines = readFileSync(EVENTS_PATH, 'utf-8').trim().split('\n');
  const events: Event[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as Event;
      // Filter by date (compare YYYY-MM-DD prefix of timestamp)
      if (ev.timestamp && ev.timestamp.startsWith(date)) {
        events.push(ev);
      }
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

// ── Ratings ──

function computeRatings(events: Event[]): DigestOutput['ratings'] {
  const ratings = events
    .filter(e => e.type === 'rating.captured' && typeof e.rating === 'number')
    .map(e => e.rating as number);

  if (ratings.length === 0) {
    return { count: 0, avg: 0, high_9_10: 0, low_1_4: 0 };
  }

  const sum = ratings.reduce((a, b) => a + b, 0);
  return {
    count: ratings.length,
    avg: Math.round((sum / ratings.length) * 10) / 10,
    high_9_10: ratings.filter(r => r >= 9).length,
    low_1_4: ratings.filter(r => r <= 4).length,
  };
}

// ── Events by Type ──

function computeEventsByType(events: Event[]): DigestOutput['events'] {
  const byType: Record<string, number> = {};
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return { total: events.length, by_type: byType };
}

// ── Brigade Activity ──

function computeBrigade(events: Event[]): DigestOutput['brigade'] {
  let merges_ok = 0;
  let merges_fail = 0;
  let a0_messages = 0;
  let voice_sent = 0;

  for (const e of events) {
    switch (e.type) {
      case 'pr.merge_ok':
        merges_ok++;
        break;
      case 'pr.merge_fail':
        merges_fail++;
        break;
      case 'a0.message_sent':
      case 'a0.async_sent':
        a0_messages++;
        break;
      case 'a0.response':
        a0_messages++;
        break;
      case 'voice.sent':
        voice_sent++;
        break;
    }
  }

  return { merges_ok, merges_fail, a0_messages, voice_sent };
}

// ── Inference Stats ──

function computeInference(events: Event[]): DigestOutput['inference'] {
  let ok = 0;
  let fail = 0;
  let parse_fail = 0;
  const providers: Record<string, number> = {};

  for (const e of events) {
    const provider = e.data?.provider || 'unknown';

    switch (e.type) {
      case 'inference.ok':
        ok++;
        providers[provider] = (providers[provider] || 0) + 1;
        break;
      case 'inference.fail':
        fail++;
        providers[provider] = (providers[provider] || 0) + 1;
        break;
      case 'inference.parse_fail':
        parse_fail++;
        providers[provider] = (providers[provider] || 0) + 1;
        break;
    }
  }

  return { ok, fail, parse_fail, providers };
}

// ── Learning Signals & Failures ──

function countLearningFiles(date: string): { signals: number; failures: number } {
  const yearMonth = date.slice(0, 7); // YYYY-MM
  const datePrefix = date; // YYYY-MM-DD

  let signals = 0;
  let failures = 0;

  // Count algorithm learning signals
  const algoDir = join(BASE_DIR, 'MEMORY', 'LEARNING', 'ALGORITHM', yearMonth);
  if (existsSync(algoDir)) {
    try {
      const files = readdirSync(algoDir);
      signals = files.filter(f => f.startsWith(datePrefix)).length;
    } catch { /* empty */ }
  }

  // Count failure patterns
  const failDir = join(BASE_DIR, 'MEMORY', 'LEARNING', 'FAILURES', yearMonth);
  if (existsSync(failDir)) {
    try {
      const files = readdirSync(failDir);
      failures = files.filter(f => f.startsWith(datePrefix)).length;
    } catch { /* empty */ }
  }

  return { signals, failures };
}

// ── Active Work Items ──

function computeWork(events: Event[]): DigestOutput['work'] {
  const items: string[] = [];
  let active = 0;

  if (existsSync(WORK_DIR)) {
    try {
      const dirs = readdirSync(WORK_DIR);
      for (const dir of dirs) {
        const prdPath = join(WORK_DIR, dir, 'PRD.md');
        if (!existsSync(prdPath)) continue;

        try {
          const content = readFileSync(prdPath, 'utf-8');
          // Parse YAML frontmatter between --- markers
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (!fmMatch) continue;

          const fm = fmMatch[1];
          const phaseMatch = fm.match(/^phase:\s*(.+)$/m);
          const phase = phaseMatch ? phaseMatch[1].trim() : '';

          if (phase && phase !== 'complete' && phase !== 'completed') {
            active++;
            items.push(dir);
          }
        } catch { /* skip unreadable PRDs */ }
      }
    } catch { /* empty */ }
  }

  // Count work.completed events for today
  const completed_today = events.filter(e => e.type === 'work.completed').length;

  return { active, completed_today, items };
}

// ── Health Status ──

function readHealth(): DigestOutput['health'] {
  if (!existsSync(HEALTH_PATH)) {
    return { all_healthy: false, last_check: '' };
  }

  try {
    const data = JSON.parse(readFileSync(HEALTH_PATH, 'utf-8'));
    const checks: Array<{ status: string }> = data.checks || [];
    const all_healthy = checks.length > 0 && checks.every(c => c.status === 'up');
    const last_check = data.timestamp || '';
    return { all_healthy, last_check };
  } catch {
    return { all_healthy: false, last_check: '' };
  }
}

// ── Main ──

function main() {
  const { date } = parseArgs();
  const events = loadEventsForDate(date);

  const digest: DigestOutput = {
    date,
    generated: new Date().toISOString(),
    ratings: computeRatings(events),
    events: computeEventsByType(events),
    brigade: computeBrigade(events),
    learning: countLearningFiles(date),
    work: computeWork(events),
    health: readHealth(),
    inference: computeInference(events),
  };

  const json = JSON.stringify(digest, null, 2);

  // Save to file
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  const outPath = join(STATE_DIR, `daily-digest-${date}.json`);
  writeFileSync(outPath, json + '\n');

  // Output to stdout
  console.log(json);
}

main();
