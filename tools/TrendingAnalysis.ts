#!/usr/bin/env bun
/**
 * TrendingAnalysis.ts — Ratings Trend Computation
 *
 * PURPOSE:
 * Reads ratings.jsonl and computes trending metrics for the PAI dashboard.
 * Called by RatingCapture (fire-and-forget) after each rating write.
 *
 * INPUT:
 * - MEMORY/LEARNING/SIGNALS/ratings.jsonl
 *
 * OUTPUT:
 * - MEMORY/LEARNING/SIGNALS/trending.json
 *
 * FLAGS:
 * - --force: Run immediately (ignore scheduling checks)
 *
 * USAGE:
 * bun TrendingAnalysis.ts [--force]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const SIGNALS_DIR = join(BASE_DIR, 'MEMORY', 'LEARNING', 'SIGNALS');
const RATINGS_FILE = join(SIGNALS_DIR, 'ratings.jsonl');
const TRENDING_FILE = join(SIGNALS_DIR, 'trending.json');

interface RatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  source: string;
  sentiment_summary?: string;
  confidence?: number;
  comment?: string;
}

interface TrendingData {
  updated_at: string;
  total_ratings: number;
  all_time_avg: number;
  last_7d_avg: number | null;
  last_30d_avg: number | null;
  last_10_avg: number | null;
  trend: 'up' | 'down' | 'stable' | 'insufficient_data';
  trend_delta: number;
  by_source: {
    explicit: { count: number; avg: number | null };
    implicit: { count: number; avg: number | null };
  };
  distribution: Record<string, number>;
  recent_sessions: Array<{
    session_id: string;
    avg_rating: number;
    count: number;
    last_timestamp: string;
  }>;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function loadRatings(): RatingEntry[] {
  if (!existsSync(RATINGS_FILE)) return [];
  const lines = readFileSync(RATINGS_FILE, 'utf-8').split('\n').filter(l => l.trim());
  const entries: RatingEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as RatingEntry);
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

function computeTrending(entries: RatingEntry[]): TrendingData {
  const now = Date.now();
  const day7ago = now - 7 * 24 * 60 * 60 * 1000;
  const day30ago = now - 30 * 24 * 60 * 60 * 1000;

  const allRatings = entries.map(e => e.rating);
  const last7d = entries.filter(e => new Date(e.timestamp).getTime() >= day7ago).map(e => e.rating);
  const last30d = entries.filter(e => new Date(e.timestamp).getTime() >= day30ago).map(e => e.rating);
  const last10 = entries.slice(-10).map(e => e.rating);

  // Trend: compare last 10 vs previous 10
  const prev10 = entries.slice(-20, -10).map(e => e.rating);
  const last10Avg = avg(last10);
  const prev10Avg = avg(prev10);
  let trend: TrendingData['trend'] = 'insufficient_data';
  let trendDelta = 0;
  if (last10Avg !== null && prev10Avg !== null) {
    trendDelta = Math.round((last10Avg - prev10Avg) * 100) / 100;
    if (Math.abs(trendDelta) < 0.2) trend = 'stable';
    else trend = trendDelta > 0 ? 'up' : 'down';
  } else if (last10Avg !== null && entries.length >= 5) {
    trend = 'stable'; // Not enough history for comparison
  }

  // By source
  const explicit = entries.filter(e => e.source === 'explicit').map(e => e.rating);
  const implicit = entries.filter(e => e.source === 'implicit').map(e => e.rating);

  // Distribution
  const distribution: Record<string, number> = {};
  for (const r of allRatings) {
    const key = String(r);
    distribution[key] = (distribution[key] || 0) + 1;
  }

  // Recent sessions (last 10 unique sessions)
  const sessionMap = new Map<string, { ratings: number[]; last: string }>();
  for (const e of entries) {
    const sid = e.session_id;
    if (!sessionMap.has(sid)) sessionMap.set(sid, { ratings: [], last: e.timestamp });
    const s = sessionMap.get(sid)!;
    s.ratings.push(e.rating);
    if (e.timestamp > s.last) s.last = e.timestamp;
  }
  const recentSessions = Array.from(sessionMap.entries())
    .sort((a, b) => b[1].last.localeCompare(a[1].last))
    .slice(0, 10)
    .map(([sid, data]) => ({
      session_id: sid,
      avg_rating: avg(data.ratings)!,
      count: data.ratings.length,
      last_timestamp: data.last,
    }));

  return {
    updated_at: new Date().toISOString(),
    total_ratings: entries.length,
    all_time_avg: avg(allRatings) ?? 0,
    last_7d_avg: avg(last7d),
    last_30d_avg: avg(last30d),
    last_10_avg: avg(last10),
    trend,
    trend_delta: trendDelta,
    by_source: {
      explicit: { count: explicit.length, avg: avg(explicit) },
      implicit: { count: implicit.length, avg: avg(implicit) },
    },
    distribution,
    recent_sessions: recentSessions,
  };
}

function main() {
  if (!existsSync(SIGNALS_DIR)) mkdirSync(SIGNALS_DIR, { recursive: true });

  const entries = loadRatings();
  if (entries.length === 0) {
    process.stderr.write('[TrendingAnalysis] No ratings found, skipping\n');
    process.exit(0);
  }

  const trending = computeTrending(entries);
  writeFileSync(TRENDING_FILE, JSON.stringify(trending, null, 2), 'utf-8');
  process.stderr.write(`[TrendingAnalysis] Updated trending.json: ${entries.length} ratings, avg=${trending.all_time_avg}, trend=${trending.trend}\n`);
  process.exit(0);
}

main();
