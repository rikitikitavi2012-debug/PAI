#!/usr/bin/env bun
/**
 * WisdomSync.hook.ts — Sync ratings to WISDOM observations
 *
 * PURPOSE:
 * Bridge the gap between rating capture and wisdom extraction.
 * Reads recent ratings, extracts patterns, updates WISDOM JSON + FRAMES.
 *
 * TRIGGER: SessionEnd (after WorkCompletionLearning, before SessionCleanup)
 *
 * PIPELINE:
 *   ratings.jsonl → filter session ratings → classify → update WISDOM/*.json → update FRAMES/*.md
 *
 * PERFORMANCE: ~100-200ms — file I/O only, no API calls
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from './lib/paths';

const BASE_DIR = getPaiDir();
const WISDOM_DIR = join(BASE_DIR, 'MEMORY', 'WISDOM');
const FRAMES_DIR = join(WISDOM_DIR, 'FRAMES');
const SIGNALS_DIR = join(BASE_DIR, 'MEMORY', 'LEARNING', 'SIGNALS');
const RATINGS_FILE = join(SIGNALS_DIR, 'ratings.jsonl');
const SYNTHESIS_SCRIPT = join(BASE_DIR, 'PAI', 'Tools', 'LearningPatternSynthesis.ts');
const SESSION_COUNTER_FILE = join(BASE_DIR, 'MEMORY', 'STATE', 'wisdom-sync-counter.json');

// ── Types ──

interface RatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  source: string;
  sentiment_summary?: string;
  confidence?: number;
  comment?: string;
}

interface WisdomObservation {
  type: 'principle' | 'contextual-rule' | 'prediction' | 'anti-pattern' | 'evolution';
  observation: string;
  timestamp: string;
  session_id?: string;
  confirmed?: number;
}

interface WisdomJSON {
  domain: string;
  updated: string;
  observations: WisdomObservation[];
}

interface HookInput {
  session_id?: string;
}

// ── Domain Classification (lightweight, no external deps) ──

const DOMAIN_KEYWORDS: Record<string, RegExp[]> = {
  communication: [/response|format|output|tone|style|greeting|language|russian|english/i],
  development: [/code|bug|fix|refactor|hook|skill|tool|build|test|deploy|git|file|path/i],
  workflow: [/task|workflow|process|mvp|agent|delegate|parallel|batch|automat/i],
  system: [/system|architecture|memory|config|settings|pai|infrastructure|pipeline/i],
  learning: [/learn|rating|feedback|pattern|wisdom|improve|mistake/i],
};

function classifyDomain(text: string): string {
  let bestDomain = 'workflow'; // default
  let bestScore = 0;

  for (const [domain, patterns] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

// ── WISDOM JSON Operations ──

function loadWisdomJSON(domain: string): WisdomJSON {
  const path = join(WISDOM_DIR, `${domain}.json`);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) { process.stderr.write(`[WisdomSync] error description: ${err}\n`); /* fall through */ }
  }
  return { domain, updated: new Date().toISOString(), observations: [] };
}

function saveWisdomJSON(data: WisdomJSON): void {
  const path = join(WISDOM_DIR, `${data.domain}.json`);
  data.updated = new Date().toISOString();
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function isDuplicate(observations: WisdomObservation[], text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return observations.some(o =>
    o.observation.toLowerCase().trim() === normalized ||
    // Fuzzy: if 80% of words match
    wordOverlap(o.observation, text) > 0.8
  );
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ── FRAMES Update ──

function updateFrame(domain: string, observation: string, type: string): void {
  if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

  const framePath = join(FRAMES_DIR, `${domain}.md`);
  const dateStr = new Date().toISOString().split('T')[0];

  if (!existsSync(framePath)) {
    // Create minimal frame
    const content = `# Frame: ${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain

## Meta
- **Domain:** ${domain}
- **Confidence:** 50%
- **Observation Count:** 1
- **Last Crystallized:** ${dateStr}
- **Source:** Auto-created by WisdomSync

---

## Core Principles

*No crystallized principles yet.*

---

## Contextual Rules

*None yet.*

---

## Evolution Log
- ${dateStr}: Frame created with observation: ${observation.slice(0, 80)}
`;
    writeFileSync(framePath, content);
    return;
  }

  // Update existing frame
  let content = readFileSync(framePath, 'utf-8');

  // Increment observation count
  const countMatch = content.match(/\*\*Observation Count:\*\*\s*(\d+)/);
  if (countMatch) {
    const newCount = parseInt(countMatch[1], 10) + 1;
    content = content.replace(/(\*\*Observation Count:\*\*\s*)\d+/, `$1${newCount}`);
  }

  // Update crystallized date
  content = content.replace(/(\*\*Last Crystallized:\*\*\s*)\S+/, `$1${dateStr}`);

  // Append to evolution log
  const logSection = content.indexOf('## Evolution Log');
  if (logSection !== -1) {
    const afterLog = content.slice(logSection);
    const nextSection = afterLog.indexOf('\n## ', 1);
    const insertPoint = nextSection === -1
      ? content.length
      : logSection + nextSection;
    content = content.slice(0, insertPoint) +
      `\n- ${dateStr}: [${type}] ${observation.slice(0, 100)}` +
      content.slice(insertPoint);
  }

  writeFileSync(framePath, content);
}

// ── Session Counter (periodic synthesis) ──

function getSessionCount(): number {
  try {
    if (existsSync(SESSION_COUNTER_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_COUNTER_FILE, 'utf-8'));
      return data.count || 0;
    }
  } catch (err) { process.stderr.write(`[WisdomSync] error description: ${err}\n`); /* ignore */ }
  return 0;
}

function incrementSessionCount(): number {
  const count = getSessionCount() + 1;
  writeFileSync(SESSION_COUNTER_FILE, JSON.stringify({ count, updated: new Date().toISOString() }));
  return count;
}

function resetSessionCount(): void {
  writeFileSync(SESSION_COUNTER_FILE, JSON.stringify({ count: 0, updated: new Date().toISOString() }));
}

// ── Main ──

async function main(): Promise<void> {
  let input: HookInput = {};
  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    console.error('[WisdomSync] Failed to parse input — running anyway');
  }

  const sessionId = input.session_id || '';

  // Read ratings
  if (!existsSync(RATINGS_FILE)) {
    console.error('[WisdomSync] No ratings file — skipping');
    process.exit(0);
  }

  const lines = readFileSync(RATINGS_FILE, 'utf-8').split('\n').filter(l => l.trim());
  const allRatings: RatingEntry[] = [];
  for (const line of lines) {
    try { allRatings.push(JSON.parse(line)); } catch (err) { process.stderr.write(`[WisdomSync] error description: ${err}\n`); /* skip */ }
  }

  if (allRatings.length === 0) {
    console.error('[WisdomSync] No ratings — skipping');
    process.exit(0);
  }

  // Filter: last 2 hours of ratings (covers current session + recent)
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recentRatings = allRatings.filter(r =>
    new Date(r.timestamp).getTime() >= twoHoursAgo
  );

  if (recentRatings.length === 0) {
    console.error('[WisdomSync] No recent ratings — skipping');
    process.exit(0);
  }

  let updates = 0;

  // Process low ratings (≤4) — anti-patterns
  const lowRatings = recentRatings.filter(r => r.rating <= 4 && r.sentiment_summary);
  for (const r of lowRatings) {
    const text = r.sentiment_summary || r.comment || '';
    if (!text || text === 'INFERENCE_FAILED') continue;

    const domain = classifyDomain(text);
    const wisdom = loadWisdomJSON(domain);

    if (!isDuplicate(wisdom.observations, text)) {
      wisdom.observations.push({
        type: 'anti-pattern',
        observation: text,
        timestamp: r.timestamp,
        session_id: r.session_id,
        confirmed: 1,
      });
      saveWisdomJSON(wisdom);
      updateFrame(domain, text, 'anti-pattern');
      updates++;
      console.error(`[WisdomSync] Anti-pattern → ${domain}: ${text.slice(0, 60)}`);
    }
  }

  // Process high ratings (≥8) — confirmed patterns
  const highRatings = recentRatings.filter(r => r.rating >= 8 && r.sentiment_summary);
  for (const r of highRatings) {
    const text = r.sentiment_summary || r.comment || '';
    if (!text || text === 'INFERENCE_FAILED') continue;

    const domain = classifyDomain(text);
    const wisdom = loadWisdomJSON(domain);

    // Check if similar observation exists — increment confirmed instead of adding new
    const existing = wisdom.observations.find(o => wordOverlap(o.observation, text) > 0.6);
    if (existing) {
      existing.confirmed = (existing.confirmed || 0) + 1;
      saveWisdomJSON(wisdom);
      console.error(`[WisdomSync] Confirmed (${existing.confirmed}x) → ${domain}: ${existing.observation.slice(0, 60)}`);
      updates++;
    } else if (!isDuplicate(wisdom.observations, text)) {
      wisdom.observations.push({
        type: 'principle',
        observation: text,
        timestamp: r.timestamp,
        session_id: r.session_id,
        confirmed: 1,
      });
      saveWisdomJSON(wisdom);
      updateFrame(domain, text, 'principle');
      updates++;
      console.error(`[WisdomSync] New principle → ${domain}: ${text.slice(0, 60)}`);
    }
  }

  // Periodic synthesis (every 5 sessions)
  const count = incrementSessionCount();
  if (count >= 5 && existsSync(SYNTHESIS_SCRIPT)) {
    console.error(`[WisdomSync] Session #${count} — triggering LearningPatternSynthesis`);
    Bun.spawn(['bun', SYNTHESIS_SCRIPT, '--week'], { stdout: 'ignore', stderr: 'ignore' });
    resetSessionCount();
  }

  console.error(`[WisdomSync] Done: ${updates} updates from ${recentRatings.length} recent ratings`);
  process.exit(0);
}

main().catch(() => process.exit(0));
