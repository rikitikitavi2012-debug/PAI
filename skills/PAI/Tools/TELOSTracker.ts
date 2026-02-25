#!/usr/bin/env bun
/**
 * TELOSTracker.ts — Living PAI↔TELOS bidirectional sync
 *
 * After each session, analyzes what was worked on and:
 * 1. Updates [ ] → [x] checkboxes in GOALS.md / PROJECTS.md for completed items
 * 2. Appends new discovered goals as drafts ("Требует подтверждения Ivan")
 * 3. Appends recent victories to STATUS.md
 * 4. Logs all changes to updates.md
 *
 * Usage:
 *   bun TELOSTracker.ts --transcript /path/to/session.jsonl
 *   bun TELOSTracker.ts --transcript /path/to/session.jsonl --dry-run
 *   bun TELOSTracker.ts --session-id <id>   (derives transcript path)
 *
 * Called from: WorkCompletionLearning.hook.ts (fire-and-forget at session end)
 */

import { parseArgs } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { inference } from './Inference';

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_DIR = path.join(process.env.HOME!, '.claude');
const TELOS_DIR = path.join(BASE_DIR, 'skills', 'PAI', 'USER', 'TELOS');

const GOALS_FILE = path.join(TELOS_DIR, 'GOALS.md');
const PROJECTS_FILE = path.join(TELOS_DIR, 'PROJECTS.md');
const STATUS_FILE = path.join(TELOS_DIR, 'STATUS.md');
const UPDATES_FILE = path.join(TELOS_DIR, 'updates.md');

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoalUpdate {
  goal_id: string;          // e.g. "G1", "P0"
  completed_items: string[]; // text that matches checkbox descriptions
  notes: string;
}

interface NewGoal {
  title: string;
  description: string;
  mission: string;           // M0/M1/M2/M3 or ""
  category: string;          // "Бизнес" | "Финансы" | "Личностный рост" | "PAI"
}

interface Victory {
  text: string;
  goal_ref: string;          // "G1", "P0", "" if unknown
}

interface TrackerResult {
  goal_updates: GoalUpdate[];
  new_goals: NewGoal[];
  victories: Victory[];
  session_summary: string;   // 1-2 sentence summary of what was done
}

// ─── Transcript Reader ──────────────────────────────────────────────────────

function extractSessionWork(transcriptPath: string, maxChars = 2000): string {
  if (!fs.existsSync(transcriptPath)) return '';

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());

  // Collect ALL text messages from the full session (user text + assistant text)
  // Note: "user" type entries may contain tool_result arrays (not text) — filter those out
  const allChunks: string[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      let text = '';

      if (entry.type === 'user' && entry.message?.content) {
        if (Array.isArray(entry.message.content)) {
          // Only extract text parts, skip tool_result entries
          const textParts = entry.message.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ');
          if (textParts.trim()) text = `User: ${textParts.slice(0, 300)}`;
        } else {
          const s = String(entry.message.content);
          if (s.trim()) text = `User: ${s.slice(0, 300)}`;
        }
      } else if (entry.type === 'assistant' && entry.message?.content) {
        if (Array.isArray(entry.message.content)) {
          const textParts = entry.message.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ');
          if (textParts.trim()) text = `Navi: ${textParts.slice(0, 400)}`;
        } else {
          const s = String(entry.message.content);
          if (s.trim()) text = `Navi: ${s.slice(0, 400)}`;
        }
      }

      if (text) allChunks.push(text);
    } catch { /* skip malformed */ }
  }

  // Take the last N chars worth of content (most recent context)
  const chunks: string[] = [];
  let totalChars = 0;
  for (const chunk of allChunks.reverse()) {
    if (totalChars + chunk.length >= maxChars) break;
    chunks.unshift(chunk);
    totalChars += chunk.length;
  }

  return chunks.join('\n\n');
}

// ─── TELOS Context Reader ───────────────────────────────────────────────────

function readTelosContext(): { goals: string; projects: string } {
  const goals = fs.existsSync(GOALS_FILE)
    ? fs.readFileSync(GOALS_FILE, 'utf-8').slice(0, 1500)
    : '';
  const projects = fs.existsSync(PROJECTS_FILE)
    ? fs.readFileSync(PROJECTS_FILE, 'utf-8').slice(0, 1000)
    : '';
  return { goals, projects };
}

// ─── Haiku Analysis ─────────────────────────────────────────────────────────

async function analyzeWithHaiku(sessionWork: string, telosContext: { goals: string; projects: string }): Promise<TrackerResult | null> {
  const systemPrompt = `You are analyzing a Claude Code session to find connections to Ivan's TELOS life goals.

Return ONLY valid JSON (no markdown, no explanation):
{
  "goal_updates": [
    {
      "goal_id": "G1",
      "completed_items": ["exact text of checkbox item that was completed"],
      "notes": "brief note on what was done"
    }
  ],
  "new_goals": [
    {
      "title": "Short goal title",
      "description": "What this goal is about (2-3 sentences)",
      "mission": "M0",
      "category": "PAI"
    }
  ],
  "victories": [
    {
      "text": "Specific accomplishment (10-15 words)",
      "goal_ref": "G1"
    }
  ],
  "session_summary": "One sentence: what was accomplished this session"
}

Rules:
- Only mark checkbox items as completed if the session ACTUALLY did that specific work
- "completed_items" must match existing checkbox text CLOSELY (not invent new ones)
- "new_goals" only for genuinely NEW work NOT already covered by existing G#/P# goals
- Maximum 3 new_goals, maximum 5 victories
- If nothing clearly maps to TELOS, return empty arrays (not null)
- session_summary in Russian`;

  const userPrompt = `## TELOS Goals (GOALS.md):
${telosContext.goals}

## TELOS Projects (PROJECTS.md):
${telosContext.projects}

## Session Work (recent messages):
${sessionWork}

Analyze what was accomplished in this session and find TELOS connections.`;

  try {
    const result = await inference({
      level: 'fast',
      systemPrompt,
      userPrompt,
      expectJson: true,
      timeout: 60000,  // TELOS prompts ~4-5kb through VPN proxy; need generous timeout (was 15s → 60s)
    });

    if (!result.success || !result.parsed) {
      console.error('[TELOSTracker] Haiku analysis failed:', result.error);
      return null;
    }

    return result.parsed as TrackerResult;
  } catch (e) {
    console.error('[TELOSTracker] Haiku analysis failed:', e);
    return null;
  }
}

// ─── TELOS File Updaters ────────────────────────────────────────────────────

function updateCheckboxes(filePath: string, goalUpdates: GoalUpdate[], dryRun: boolean): string[] {
  if (!fs.existsSync(filePath)) return [];

  let content = fs.readFileSync(filePath, 'utf-8');
  const changes: string[] = [];

  for (const update of goalUpdates) {
    for (const item of update.completed_items) {
      // Find unchecked checkbox with similar text
      // Try exact match first, then fuzzy (first 30 chars)
      const exactPattern = new RegExp(`- \\[ \\] ${escapeRegex(item)}`, 'i');
      const fuzzyPattern = new RegExp(`- \\[ \\] [^\\n]*${escapeRegex(item.slice(0, 25))}[^\\n]*`, 'i');

      let matched = false;
      for (const pattern of [exactPattern, fuzzyPattern]) {
        if (pattern.test(content)) {
          content = content.replace(pattern, m => m.replace('- [ ]', '- [x]'));
          changes.push(`  ✓ ${update.goal_id}: "${item.slice(0, 60)}"`);
          matched = true;
          break;
        }
      }
      if (!matched && item.length > 10) {
        console.error(`[TELOSTracker] No checkbox match for: "${item.slice(0, 40)}"`);
      }
    }
  }

  if (changes.length > 0 && !dryRun) {
    // Backup before writing
    fs.writeFileSync(filePath + '.telos-tracker-bak', fs.readFileSync(filePath));
    fs.writeFileSync(filePath, content);
  }

  return changes;
}

function appendNewGoals(filePath: string, newGoals: NewGoal[], dryRun: boolean): string[] {
  if (newGoals.length === 0) return [];

  const changes: string[] = [];
  const date = new Date().toISOString().split('T')[0];

  let appendBlock = `\n---\n\n## Новые цели (обнаружены ${date}, требуют подтверждения Ivan)\n\n`;

  for (const goal of newGoals) {
    appendBlock += `### GTEMP: ${goal.title}\n`;
    appendBlock += `**Статус:** 🟡 Требует подтверждения Ivan\n`;
    appendBlock += `**Поддерживает:** ${goal.mission}\n`;
    appendBlock += `**Категория:** ${goal.category}\n`;
    appendBlock += `**Описание:** ${goal.description}\n`;
    appendBlock += `**Добавлено автоматически:** TELOSTracker ${date}\n\n`;
    changes.push(`  + GTEMP: "${goal.title}" → ${goal.mission}`);
  }

  if (!dryRun) {
    fs.appendFileSync(filePath, appendBlock);
  }

  return changes;
}

function appendVictories(victories: Victory[], sessionSummary: string, dryRun: boolean): string[] {
  if (victories.length === 0 || !fs.existsSync(STATUS_FILE)) return [];

  const date = new Date().toISOString().split('T')[0];
  const changes: string[] = [];

  const victoriesBlock = victories
    .map(v => `| ${v.text} | ${date} | ${v.goal_ref} |`)
    .join('\n');

  // Find and update the Недавние победы section
  let content = fs.readFileSync(STATUS_FILE, 'utf-8');

  const victorySection = '## Недавние победы';
  const idx = content.indexOf(victorySection);

  if (idx !== -1) {
    // Find the table header row
    const tableStart = content.indexOf('| Победа |', idx);
    const tableHeaderEnd = content.indexOf('\n', content.indexOf('|---', tableStart)) + 1;

    if (tableHeaderEnd > tableStart) {
      const insertAt = tableHeaderEnd;
      content = content.slice(0, insertAt) + victoriesBlock + '\n' + content.slice(insertAt);

      if (!dryRun) {
        fs.writeFileSync(STATUS_FILE, content);
      }

      victories.forEach(v => changes.push(`  🏆 "${v.text.slice(0, 50)}"`));
    }
  }

  return changes;
}

function appendUpdatesLog(allChanges: string[], sessionSummary: string, dryRun: boolean): void {
  if (allChanges.length === 0) return;

  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const logEntry = `\n## ${date} ${time} — Авто-обновление (TELOSTracker)\n\n${sessionSummary}\n\n**Изменения:**\n${allChanges.join('\n')}\n\n**Источник:** PAI сессия → WorkCompletionLearning → TELOSTracker\n`;

  if (!dryRun && fs.existsSync(UPDATES_FILE)) {
    // Prepend to updates.md (newest first)
    const existing = fs.readFileSync(UPDATES_FILE, 'utf-8');
    const headerEnd = existing.indexOf('\n---\n');
    if (headerEnd !== -1) {
      const newContent = existing.slice(0, headerEnd + 5) + logEntry + existing.slice(headerEnd + 5);
      fs.writeFileSync(UPDATES_FILE, newContent);
    } else {
      fs.appendFileSync(UPDATES_FILE, logEntry);
    }
  }
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    transcript: { type: 'string' },
    'session-id': { type: 'string' },
    'dry-run': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`
TELOSTracker — Living PAI↔TELOS bidirectional sync

Usage:
  bun TELOSTracker.ts --transcript /path/to/session.jsonl
  bun TELOSTracker.ts --transcript /path/to/session.jsonl --dry-run
  bun TELOSTracker.ts --session-id <id>   (auto-finds transcript)

Options:
  --dry-run    Show what would change without writing
  --help, -h   Show this help
`);
  process.exit(0);
}

// Resolve transcript path
let transcriptPath = values.transcript;
if (!transcriptPath && values['session-id']) {
  const candidate = path.join(BASE_DIR, 'projects', '-home-ser', `${values['session-id']}.jsonl`);
  if (fs.existsSync(candidate)) transcriptPath = candidate;
}

if (!transcriptPath || !fs.existsSync(transcriptPath)) {
  console.error('[TELOSTracker] No valid transcript found. Use --transcript or --session-id');
  process.exit(0);
}

const dryRun = values['dry-run'] ?? false;

console.error(`[TELOSTracker] Analyzing session${dryRun ? ' (DRY RUN)' : ''}...`);

// Extract session work
const sessionWork = extractSessionWork(transcriptPath);
if (sessionWork.length < 100) {
  console.error('[TELOSTracker] Session too short to analyze, skipping');
  process.exit(0);
}

// Read TELOS context
const telosContext = readTelosContext();

// Analyze with Haiku
const result = await analyzeWithHaiku(sessionWork, telosContext);
if (!result) {
  console.error('[TELOSTracker] Analysis failed, skipping TELOS update');
  process.exit(0);
}

console.error(`[TELOSTracker] Summary: ${result.session_summary}`);
console.error(`[TELOSTracker] Found: ${result.goal_updates.length} goal updates, ${result.new_goals.length} new goals, ${result.victories.length} victories`);

const allChanges: string[] = [];

// Apply goal checkbox updates
if (result.goal_updates.length > 0) {
  const goalChanges = updateCheckboxes(GOALS_FILE, result.goal_updates, dryRun);
  const projChanges = updateCheckboxes(PROJECTS_FILE, result.goal_updates, dryRun);
  allChanges.push(...goalChanges, ...projChanges);
}

// Append new draft goals
if (result.new_goals.length > 0) {
  const newGoalChanges = appendNewGoals(GOALS_FILE, result.new_goals, dryRun);
  allChanges.push(...newGoalChanges);
}

// Append victories to STATUS.md
if (result.victories.length > 0) {
  const victoryChanges = appendVictories(result.victories, result.session_summary, dryRun);
  allChanges.push(...victoryChanges);
}

// Log to updates.md
if (allChanges.length > 0) {
  appendUpdatesLog(allChanges, result.session_summary, dryRun);
}

// Output summary
if (dryRun) {
  console.log('\n📋 DRY RUN — TELOSTracker would apply:');
  console.log(`Summary: ${result.session_summary}`);
  if (allChanges.length > 0) {
    console.log('\nChanges:');
    allChanges.forEach(c => console.log(c));
  } else {
    console.log('No TELOS changes needed for this session');
  }
} else {
  if (allChanges.length > 0) {
    console.error(`[TELOSTracker] ✅ Applied ${allChanges.length} TELOS updates`);
  } else {
    console.error('[TELOSTracker] No TELOS updates needed for this session');
  }
}
