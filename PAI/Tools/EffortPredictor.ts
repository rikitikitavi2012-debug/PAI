#!/usr/bin/env bun
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const STOP = new Set("a an the and or but in on at to for of is it this that with".split(" "));
const HOME = process.env.HOME || "/home/ser";
const WORK_JSON = join(HOME, ".claude/MEMORY/STATE/work.json");
const WORK_DIR = join(HOME, ".claude/MEMORY/WORK");
interface TaskRecord { task: string; effort: string; duration_min: number; isc: number }

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
}
function overlap(a: string[], b: string[]): number {
  const setB = new Set(b); return a.filter(w => setB.has(w)).length;
}
function parseFrontmatter(content: string): Record<string, string> | null {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const kv: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const match = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (match) kv[match[1]] = match[2];
  }
  return kv;
}
function diffMin(a: string, b: string): number {
  const da = new Date(a), db = new Date(b);
  return isNaN(da.getTime()) || isNaN(db.getTime()) ? 0 : Math.max(0, (db.getTime() - da.getTime()) / 60000);
}
function iscCount(p: string): number { const m = p?.match(/(\d+)\/(\d+)/); return m ? parseInt(m[2]) : 0; }

// Collect from PRDs
const records: TaskRecord[] = [];
try {
  for (const dir of readdirSync(WORK_DIR)) {
    try {
      const fm = parseFrontmatter(readFileSync(join(WORK_DIR, dir, "PRD.md"), "utf-8"));
      if (!fm?.task || !fm.started) continue;
      records.push({ task: fm.task, effort: fm.effort || "unknown",
        duration_min: Math.round(diffMin(fm.started, fm.updated || fm.started)), isc: iscCount(fm.progress || "0/0") });
    } catch { /* skip */ }
  }
} catch { /* no WORK_DIR */ }
// Collect from work.json
try {
  const wj = JSON.parse(readFileSync(WORK_JSON, "utf-8"));
  for (const s of Object.values(wj.sessions || {}) as any[]) {
    if (!s.task || !s.started) continue;
    records.push({ task: s.task, effort: s.effort || "unknown",
      duration_min: Math.round(diffMin(s.started, s.updatedAt || s.started)), isc: iscCount(s.progress || "0/0") });
  }
} catch { /* no work.json */ }
// Deduplicate — keep richer record per task
const seen = new Map<string, TaskRecord>();
for (const r of records) {
  const key = r.task.toLowerCase().slice(0, 60);
  const prev = seen.get(key);
  if (!prev || r.duration_min > prev.duration_min || r.isc > prev.isc) seen.set(key, r);
}
// Score & rank
const query = process.argv.slice(2).join(" ");
if (!query) { console.error("Usage: bun EffortPredictor.ts \"task description\""); process.exit(1); }
const qTokens = tokenize(query);
const scored = [...seen.values()].map(r => ({ ...r, score: overlap(qTokens, tokenize(r.task)) }))
  .filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
// Filter out 0-duration records (PRDs with same started/updated timestamps — data quality issue)
const withDuration = scored.filter(r => r.duration_min > 0);
const avgDur = withDuration.length ? withDuration.reduce((s, r) => s + r.duration_min, 0) / withDuration.length : 0;
const avgIsc = scored.length ? Math.round(scored.reduce((s, r) => s + r.isc, 0) / scored.length) : 0;
// If no duration data, fall back to ISC-based prediction
let suggested = "standard";
if (avgDur > 0) {
  if (avgDur >= 32) suggested = "comprehensive";
  else if (avgDur >= 16) suggested = "deep";
  else if (avgDur >= 8) suggested = "advanced";
  else if (avgDur >= 2) suggested = "extended";
} else if (avgIsc > 0) {
  // No duration data — use ISC count as proxy
  if (avgIsc >= 64) suggested = "comprehensive";
  else if (avgIsc >= 40) suggested = "deep";
  else if (avgIsc >= 24) suggested = "advanced";
  else if (avgIsc >= 16) suggested = "extended";
}
const confidence = scored.length >= 4 ? "high" : scored.length >= 2 ? "medium" : "low";
console.log(JSON.stringify({
  suggested_effort: suggested, confidence, similar_tasks: scored.length,
  avg_duration_minutes: Math.round(avgDur * 10) / 10, avg_isc_count: avgIsc,
  history: scored.map(r => ({ task: r.task, effort: r.effort, duration_min: r.duration_min, isc: r.isc })),
}, null, 2));
