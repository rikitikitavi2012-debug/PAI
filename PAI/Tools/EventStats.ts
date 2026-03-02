#!/usr/bin/env bun
/**
 * EventStats.ts — CLI tool for analyzing events.jsonl
 *
 * The consumer for PAI's Unified Event System. Reads events.jsonl
 * and provides distribution, timeline, and recent event analysis.
 *
 * Usage:
 *   bun PAI/Tools/EventStats.ts              # Full overview
 *   bun PAI/Tools/EventStats.ts types        # Event type distribution
 *   bun PAI/Tools/EventStats.ts daily        # Events per day (last 7d)
 *   bun PAI/Tools/EventStats.ts sources      # Top event sources
 *   bun PAI/Tools/EventStats.ts recent [N]   # Last N events (default: 10)
 *   bun PAI/Tools/EventStats.ts --help       # This help
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const EVENTS_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'events.jsonl');

// ── Types ──

interface Event {
  type: string;
  source: string;
  timestamp: string;
  session_id: string;
  [key: string]: unknown;
}

// ── Parser ──

function loadEvents(): Event[] {
  if (!existsSync(EVENTS_PATH)) {
    console.error(`No events file at ${EVENTS_PATH}`);
    process.exit(1);
  }

  const lines = readFileSync(EVENTS_PATH, 'utf-8').trim().split('\n');
  const events: Event[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

// ── Formatters ──

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

function rpad(str: string, len: number): string {
  return str.padStart(len);
}

// ── Commands ──

function showTypes(events: Event[]): void {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.type, (counts.get(e.type) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...sorted.map(([, c]) => c));
  const barWidth = 30;

  console.log(`\n  Event Type Distribution (${events.length} total)\n`);
  console.log(`  ${pad('TYPE', 30)} ${rpad('COUNT', 6)}  BAR`);
  console.log(`  ${'─'.repeat(30)} ${'─'.repeat(6)}  ${'─'.repeat(barWidth)}`);

  for (const [type, count] of sorted) {
    const bar = '█'.repeat(Math.max(1, Math.round((count / maxCount) * barWidth)));
    console.log(`  ${pad(type, 30)} ${rpad(String(count), 6)}  ${bar}`);
  }
  console.log();
}

function showDaily(events: Event[]): void {
  const days = new Map<string, number>();

  for (const e of events) {
    try {
      const day = e.timestamp.slice(0, 10); // YYYY-MM-DD
      days.set(day, (days.get(day) || 0) + 1);
    } catch { /* skip */ }
  }

  const sorted = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const last7 = sorted.slice(-7);
  const maxCount = Math.max(...last7.map(([, c]) => c));
  const barWidth = 40;

  console.log(`\n  Events per Day (last 7 days)\n`);
  console.log(`  ${pad('DATE', 12)} ${rpad('COUNT', 6)}  BAR`);
  console.log(`  ${'─'.repeat(12)} ${'─'.repeat(6)}  ${'─'.repeat(barWidth)}`);

  for (const [day, count] of last7) {
    const bar = '█'.repeat(Math.max(1, Math.round((count / maxCount) * barWidth)));
    console.log(`  ${pad(day, 12)} ${rpad(String(count), 6)}  ${bar}`);
  }
  console.log();
}

function showSources(events: Event[]): void {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.source, (counts.get(e.source) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\n  Top Event Sources\n`);
  console.log(`  ${pad('SOURCE', 30)} ${rpad('COUNT', 6)}  ${rpad('%', 5)}`);
  console.log(`  ${'─'.repeat(30)} ${'─'.repeat(6)}  ${'─'.repeat(5)}`);

  for (const [source, count] of sorted) {
    const pct = ((count / events.length) * 100).toFixed(1);
    console.log(`  ${pad(source, 30)} ${rpad(String(count), 6)}  ${rpad(pct, 5)}`);
  }
  console.log();
}

function showRecent(events: Event[], n: number): void {
  const recent = events.slice(-n);

  console.log(`\n  Last ${n} Events\n`);
  console.log(`  ${pad('TIME', 20)} ${pad('TYPE', 25)} ${pad('SOURCE', 20)} DETAILS`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(25)} ${'─'.repeat(20)} ${'─'.repeat(30)}`);

  for (const e of recent) {
    const time = e.timestamp.replace('T', ' ').slice(0, 19);
    const details = getEventDetails(e);
    console.log(`  ${pad(time, 20)} ${pad(e.type, 25)} ${pad(e.source, 20)} ${details}`);
  }
  console.log();
}

function getEventDetails(e: Event): string {
  switch (e.type) {
    case 'agent.start':
      return `type=${e.agent_type || '?'}`;
    case 'agent.stop':
      return `id=${e.agent_id || '?'}`;
    case 'task.completed':
      return `task=${e.task_subject || e.task_id || '?'}`;
    case 'rating.captured':
      return `rating=${e.rating || '?'} (${e.rating_source || '?'})`;
    case 'prd.synced':
      return `${e.slug || '?'} ${e.phase || ''} ${e.progress || ''}`;
    case 'voice.sent':
      return `${e.character_count || 0} chars`;
    case 'voice.failed':
      return `err: ${String(e.error || '?').slice(0, 40)}`;
    case 'work.completed':
      return `slug=${e.slug || '?'}`;
    case 'session.completed':
      return '';
    default:
      return '';
  }
}

function showOverview(events: Event[]): void {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayEvents = events.filter(e => e.timestamp.startsWith(todayStr));
  const sessions = new Set(events.map(e => e.session_id).filter(s => s !== 'unknown'));

  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║         PAI Event System Overview         ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
  console.log(`  Total events:     ${events.length}`);
  console.log(`  Today's events:   ${todayEvents.length}`);
  console.log(`  Unique sessions:  ${sessions.size}`);
  console.log(`  Event types:      ${new Set(events.map(e => e.type)).size}`);
  console.log(`  Event sources:    ${new Set(events.map(e => e.source)).size}`);

  const first = events[0]?.timestamp?.slice(0, 10) || 'N/A';
  const last = events[events.length - 1]?.timestamp?.slice(0, 10) || 'N/A';
  console.log(`  Date range:       ${first} → ${last}`);
  console.log();

  showTypes(events);
  showDaily(events);
}

// ── Help ──

function showHelp(): void {
  console.log(`
  EventStats — PAI Event System Analyzer

  Usage:
    bun PAI/Tools/EventStats.ts              Full overview (types + daily)
    bun PAI/Tools/EventStats.ts types        Event type distribution
    bun PAI/Tools/EventStats.ts daily        Events per day (last 7d)
    bun PAI/Tools/EventStats.ts sources      Top event sources
    bun PAI/Tools/EventStats.ts recent [N]   Last N events (default: 10)
    bun PAI/Tools/EventStats.ts --help       This help

  Events file: ${EVENTS_PATH}
`);
}

// ── Main ──

const args = process.argv.slice(2);
const command = args[0] || 'overview';

if (command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

const events = loadEvents();

switch (command) {
  case 'overview':
    showOverview(events);
    break;
  case 'types':
    showTypes(events);
    break;
  case 'daily':
    showDaily(events);
    break;
  case 'sources':
    showSources(events);
    break;
  case 'recent':
    showRecent(events, parseInt(args[1]) || 10);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
