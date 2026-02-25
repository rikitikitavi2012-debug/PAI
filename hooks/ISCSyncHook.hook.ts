#!/usr/bin/env bun
/**
 * ISCSyncHook.hook.ts - Sync Working Memory ISC to Disk (SessionEnd)
 *
 * PURPOSE:
 * Solves the "dual tracking" gap: during a session, ISC criteria live only
 * in working memory (TaskCreate/TaskList). When the session ends, they die.
 * This hook parses the session transcript to extract ISC criteria and their
 * final status, then writes them to ISC.json and PRD files on disk.
 *
 * This makes loop mode (algorithm.ts) functional — it reads PRD checkboxes
 * to know which criteria pass/fail across iterations.
 *
 * TRIGGER: SessionEnd
 *
 * INPUT:
 * - stdin: { session_id, transcript_path }
 * - Files: MEMORY/STATE/current-work-{session_id}.json
 *
 * OUTPUT:
 * - ISC.json updated with extracted criteria and status
 * - PRD file updated with ISC checkboxes and frontmatter
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: AutoWorkCreation (expects WORK/ structure with ISC.json + PRD)
 * - RUNS AFTER: WorkCompletionLearning (both SessionEnd, order doesn't matter)
 * - READS: Session transcript JSONL
 *
 * TRANSCRIPT PARSING:
 * - assistant messages contain tool_use blocks: {type: "tool_use", name: "TaskCreate", input: {subject, description}}
 * - assistant messages contain tool_use blocks: {type: "tool_use", name: "TaskUpdate", input: {taskId, status}}
 * - user messages contain tool_result blocks matching tool_use_id
 * - TaskCreate order matches task ID assignment (1, 2, 3, ...)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp } from './lib/time';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');

// ── Types ──

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_title: string;
  task_count: number;
  created_at: string;
  prd_path?: string;
}

interface ISCCriterion {
  id: string;
  subject: string;
  description: string;
  type: 'criterion' | 'anti-criterion';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// ── State File Lookup ──

function findStateFile(sessionId?: string): string | null {
  if (sessionId) {
    const scoped = join(STATE_DIR, `current-work-${sessionId}.json`);
    if (existsSync(scoped)) return scoped;
  }
  const legacy = join(STATE_DIR, 'current-work.json');
  if (existsSync(legacy)) return legacy;
  return null;
}

// ── Transcript Parsing ──

function parseTranscriptForISC(transcriptPath: string): ISCCriterion[] {
  const content = readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Phase 1: Extract all TaskCreate calls (ordered = task IDs)
  const creates: Array<{ toolUseId: string; subject: string; description: string }> = [];
  // Phase 2: Extract all TaskUpdate calls
  const updates: Array<{ taskId: string; status?: string; subject?: string; description?: string }> = [];

  for (const line of lines) {
    let data: any;
    try {
      data = JSON.parse(line);
    } catch {
      continue;
    }

    if (data.type !== 'assistant') continue;

    const content = data.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== 'tool_use') continue;

      if (block.name === 'TaskCreate') {
        const input = block.input || {};
        const subject = input.subject || '';
        // Only capture ISC criteria (subject starts with "ISC-")
        if (subject.startsWith('ISC-')) {
          creates.push({
            toolUseId: block.id || '',
            subject,
            description: input.description || '',
          });
        }
      }

      if (block.name === 'TaskUpdate') {
        const input = block.input || {};
        if (input.taskId) {
          updates.push({
            taskId: String(input.taskId),
            status: input.status,
            subject: input.subject,
            description: input.description,
          });
        }
      }
    }
  }

  if (creates.length === 0) return [];

  // Build criteria map: position → ISCCriterion
  // TaskCreate calls are ordered, first = ID 1, second = ID 2, etc.
  // But we need to find the ACTUAL task IDs from tool_result responses
  // Simpler: parse tool_results to get the mapping
  const toolUseIdToTaskId = new Map<string, string>();

  for (const line of lines) {
    let data: any;
    try {
      data = JSON.parse(line);
    } catch {
      continue;
    }

    if (data.type !== 'user') continue;
    const msgContent = data.message?.content;
    if (!Array.isArray(msgContent)) continue;

    for (const block of msgContent) {
      if (block.type !== 'tool_result') continue;

      // tool_result content can be string or array of text blocks
      let text = '';
      if (typeof block.content === 'string') {
        text = block.content;
      } else if (Array.isArray(block.content)) {
        for (const sub of block.content) {
          if (typeof sub === 'string') text += sub;
          else if (sub?.text) text += sub.text;
        }
      }

      // Match "Task #N created successfully"
      const match = text.match(/Task #(\d+) created/);
      if (match && block.tool_use_id) {
        toolUseIdToTaskId.set(block.tool_use_id, match[1]);
      }
    }
  }

  // Build criteria with resolved task IDs
  const criteria: ISCCriterion[] = creates.map((c, i) => {
    const resolvedId = toolUseIdToTaskId.get(c.toolUseId) || String(i + 1);
    const isAnti = c.subject.includes('ISC-A');
    return {
      id: resolvedId,
      subject: c.subject,
      description: c.description,
      type: isAnti ? 'anti-criterion' as const : 'criterion' as const,
      status: 'pending' as const,
    };
  });

  // Apply updates
  for (const update of updates) {
    const criterion = criteria.find(c => c.id === update.taskId);
    if (criterion) {
      if (update.status) criterion.status = update.status as ISCCriterion['status'];
      if (update.subject) criterion.subject = update.subject;
      if (update.description) criterion.description = update.description;
    }
  }

  return criteria;
}

// ── ISC.json Writer ──

function writeISCJson(taskDir: string, criteria: ISCCriterion[]): void {
  const iscPath = join(taskDir, 'ISC.json');

  const regular = criteria.filter(c => c.type === 'criterion');
  const anti = criteria.filter(c => c.type === 'anti-criterion');
  const passing = criteria.filter(c => c.status === 'completed').length;
  const failed = criteria.filter(c => c.status === 'failed').length;
  const partial = criteria.filter(c => c.status === 'in_progress').length;

  // Read existing ISC.json scaffold to preserve taskId and metadata
  let existing: any = {};
  if (existsSync(iscPath)) {
    try { existing = JSON.parse(readFileSync(iscPath, 'utf-8')); } catch {}
  }

  const isc = {
    taskId: existing.taskId || 'unknown',
    status: passing === criteria.length ? 'COMPLETE' : (failed > 0 ? 'PARTIAL' : 'IN_PROGRESS'),
    effortLevel: existing.effortLevel || 'STANDARD',
    criteria: regular.map(c => ({
      id: c.subject.split(':')[0]?.trim() || `ISC-C${c.id}`,
      text: c.subject.replace(/^ISC-[A-Za-z0-9-]+:\s*/, ''),
      description: c.description,
      status: c.status,
    })),
    antiCriteria: anti.map(c => ({
      id: c.subject.split(':')[0]?.trim() || `ISC-A${c.id}`,
      text: c.subject.replace(/^ISC-[A-Za-z0-9-]+:\s*/, ''),
      description: c.description,
      status: c.status,
    })),
    satisfaction: {
      total: criteria.length,
      satisfied: passing,
      partial,
      failed,
    },
    createdAt: existing.createdAt || getISOTimestamp(),
    updatedAt: getISOTimestamp(),
  };

  writeFileSync(iscPath, JSON.stringify(isc, null, 2));
  console.error(`[ISCSyncHook] Updated ISC.json: ${passing}/${criteria.length} passing`);
}

// ── PRD Updater ──

function updatePRD(taskDir: string, criteria: ISCCriterion[]): void {
  // Find PRD file in task directory
  const files = readdirSync(taskDir).filter(f => f.startsWith('PRD-') && f.endsWith('.md'));
  if (files.length === 0) {
    console.error('[ISCSyncHook] No PRD file found in task directory');
    return;
  }

  const prdPath = join(taskDir, files[0]);
  let prdContent = readFileSync(prdPath, 'utf-8');

  // Build ISC checkbox lines
  const regular = criteria.filter(c => c.type === 'criterion');
  const anti = criteria.filter(c => c.type === 'anti-criterion');

  const checkboxLines: string[] = [];
  for (const c of regular) {
    const checked = c.status === 'completed' ? 'x' : ' ';
    const iscId = c.subject.split(':')[0]?.trim() || `ISC-C${c.id}`;
    const text = c.subject.replace(/^ISC-[A-Za-z0-9-]+:\s*/, '');
    // Extract verify method from description if present
    const verifyMatch = c.description.match(/\|\s*Verify:\s*(.+)$/);
    const verifySuffix = verifyMatch ? ` | Verify: ${verifyMatch[1].trim()}` : '';
    checkboxLines.push(`- [${checked}] ${iscId}: ${text}${verifySuffix}`);
  }
  for (const c of anti) {
    const checked = c.status === 'completed' ? 'x' : ' ';
    const iscId = c.subject.split(':')[0]?.trim() || `ISC-A${c.id}`;
    const text = c.subject.replace(/^ISC-[A-Za-z0-9-]+:\s*/, '');
    const verifyMatch = c.description.match(/\|\s*Verify:\s*(.+)$/);
    const verifySuffix = verifyMatch ? ` | Verify: ${verifyMatch[1].trim()}` : '';
    checkboxLines.push(`- [${checked}] ${iscId}: ${text}${verifySuffix}`);
  }

  const iscSection = checkboxLines.join('\n');

  // Replace ISC section in PRD
  // Look for ## IDEAL STATE CRITERIA section and replace its content until next ## or end
  const iscHeaderRegex = /## IDEAL STATE CRITERIA[^\n]*\n([\s\S]*?)(?=\n## |\n---\s*$|$)/;
  const iscMatch = prdContent.match(iscHeaderRegex);

  if (iscMatch) {
    const header = prdContent.substring(
      prdContent.indexOf(iscMatch[0]),
      prdContent.indexOf(iscMatch[0]) + iscMatch[0].indexOf('\n') + 1
    );
    prdContent = prdContent.replace(
      iscHeaderRegex,
      `## IDEAL STATE CRITERIA (Verification Criteria)\n\n${iscSection}\n`
    );
  } else {
    // No ISC section exists — append before ## DECISIONS or ## LOG or at end
    const insertPoint = prdContent.search(/\n## (DECISIONS|LOG)\b/);
    if (insertPoint >= 0) {
      prdContent = prdContent.substring(0, insertPoint) +
        `\n\n## IDEAL STATE CRITERIA (Verification Criteria)\n\n${iscSection}\n` +
        prdContent.substring(insertPoint);
    } else {
      prdContent += `\n\n## IDEAL STATE CRITERIA (Verification Criteria)\n\n${iscSection}\n`;
    }
  }

  // Update frontmatter
  const passing = criteria.filter(c => c.status === 'completed').length;
  const total = criteria.length;
  const allPass = passing === total;
  const failingIds = criteria
    .filter(c => c.status !== 'completed')
    .map(c => c.subject.split(':')[0]?.trim())
    .filter(Boolean);

  // Update frontmatter fields
  prdContent = prdContent.replace(
    /^(status:\s*).+$/m,
    `$1${allPass ? 'COMPLETE' : 'VERIFYING'}`
  );
  prdContent = prdContent.replace(
    /^(verification_summary:\s*).+$/m,
    `$1"${passing}/${total}"`
  );
  prdContent = prdContent.replace(
    /^(failing_criteria:\s*).+$/m,
    `$1[${failingIds.map(id => `"${id}"`).join(', ')}]`
  );
  prdContent = prdContent.replace(
    /^(last_phase:\s*).+$/m,
    `$1VERIFY`
  );
  prdContent = prdContent.replace(
    /^(updated:\s*).+$/m,
    `$1${new Date().toISOString().split('T')[0]}`
  );

  // Update STATUS table if present
  const statusTableRegex = /(\| Progress \|)\s*[^\n]+/;
  if (statusTableRegex.test(prdContent)) {
    prdContent = prdContent.replace(statusTableRegex, `$1 ${passing}/${total} criteria passing |`);
  }

  writeFileSync(prdPath, prdContent);
  console.error(`[ISCSyncHook] Updated PRD: ${files[0]} (${passing}/${total})`);
}

// ── THREAD.md Updater ──

interface PhaseInfo {
  name: string;
  threadHeader: string;
  found: boolean;
}

function parseTranscriptForPhases(transcriptPath: string): string[] {
  const content = readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const phasesFound: string[] = [];

  const phaseNames = ['OBSERVE', 'THINK', 'PLAN', 'BUILD', 'EXECUTE', 'VERIFY', 'LEARN'];

  for (const line of lines) {
    let data: any;
    try { data = JSON.parse(line); } catch { continue; }
    if (data.type !== 'assistant') continue;

    const msgContent = data.message?.content;
    if (!Array.isArray(msgContent)) continue;

    for (const block of msgContent) {
      if (block.type !== 'text') continue;
      const text = block.text || '';
      for (const phase of phaseNames) {
        if (text.includes('━━━') && text.includes(phase) && !phasesFound.includes(phase)) {
          phasesFound.push(phase);
        }
      }
    }
  }

  return phasesFound;
}

function updateThread(taskDir: string, transcriptPath: string, criteria: ISCCriterion[]): void {
  const threadPath = join(taskDir, 'THREAD.md');
  if (!existsSync(threadPath)) {
    console.error('[ISCSyncHook] No THREAD.md found');
    return;
  }

  let content = readFileSync(threadPath, 'utf-8');
  const phasesFound = parseTranscriptForPhases(transcriptPath);
  const timestamp = getISOTimestamp();

  // Map phase names to THREAD.md header patterns
  const phaseMap: Record<string, string> = {
    'OBSERVE': '### 👀 OBSERVE Phase',
    'THINK': '### 🧠 THINK Phase',
    'PLAN': '### 📋 PLAN Phase',
    'BUILD': '### 🔨 BUILD Phase',
    'EXECUTE': '### ▶️ EXECUTE Phase',
    'VERIFY': '### ✅ VERIFY Phase',
    'LEARN': '### 🎓 LEARN Phase',
  };

  // Update each found phase
  for (const phase of phasesFound) {
    const header = phaseMap[phase];
    if (!header) continue;
    const pendingPattern = new RegExp(
      `(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\n_Pending\\.\\.\\._`
    );
    if (pendingPattern.test(content)) {
      content = content.replace(pendingPattern, `$1\nCompleted at ${timestamp}`);
    }
  }

  // Update ISC Evolution section
  if (criteria.length > 0) {
    const passing = criteria.filter(c => c.status === 'completed').length;
    const failed = criteria.filter(c => c.status === 'failed').length;
    const pending = criteria.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
    const regular = criteria.filter(c => c.type === 'criterion').length;
    const anti = criteria.filter(c => c.type === 'anti-criterion').length;

    const iscSummary = [
      `- Total: ${criteria.length} criteria (${regular} criteria + ${anti} anti-criteria)`,
      `- Passing: ${passing} | Failed: ${failed} | Pending: ${pending}`,
      `- Phases completed: ${phasesFound.join(' → ')}`,
    ].join('\n');

    content = content.replace(
      /## ISC Evolution\n\n_Criteria updates logged here\.\.\._/,
      `## ISC Evolution\n\n${iscSummary}`
    );
  }

  // Update frontmatter status
  const allPhasesComplete = phasesFound.length >= 6; // At least through VERIFY
  if (allPhasesComplete) {
    content = content.replace(/^(status:\s*)"[^"]*"/m, '$1"COMPLETED"');
    content = content.replace(/^(status:\s*)IN_PROGRESS/m, '$1COMPLETED');
  }

  writeFileSync(threadPath, content);
  console.error(`[ISCSyncHook] Updated THREAD.md: ${phasesFound.length} phases marked complete`);
}

// ── Find Task Directory ──

function findTaskDir(sessionDir: string, currentTask: string): string | null {
  const tasksDir = join(WORK_DIR, sessionDir, 'tasks');
  if (!existsSync(tasksDir)) return null;

  // Try current task first
  const taskPath = join(tasksDir, currentTask);
  if (existsSync(taskPath)) return taskPath;

  // Fallback: find any task dir
  const dirs = readdirSync(tasksDir).filter(d =>
    d !== 'current' && existsSync(join(tasksDir, d, 'ISC.json'))
  );
  if (dirs.length > 0) return join(tasksDir, dirs[dirs.length - 1]);

  return null;
}

// ── Main ──

async function main() {
  try {
    // Read input from stdin with timeout
    let sessionId: string | undefined;
    let transcriptPath: string | undefined;
    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input?.trim()) {
        const parsed = JSON.parse(input);
        sessionId = parsed.session_id;
        transcriptPath = parsed.transcript_path;
      }
    } catch {
      // Timeout or parse error — proceed without
    }

    // Find current work state
    const stateFile = findStateFile(sessionId);
    if (!stateFile) {
      console.error('[ISCSyncHook] No active work session');
      process.exit(0);
    }

    const currentWork: CurrentWork = JSON.parse(readFileSync(stateFile, 'utf-8'));

    // Guard: don't process another session's state
    if (sessionId && currentWork.session_id !== sessionId) {
      console.error('[ISCSyncHook] State file belongs to different session');
      process.exit(0);
    }

    // Resolve transcript path
    const resolvedTranscript = transcriptPath || (() => {
      const projectDir = join(BASE_DIR, 'projects', '-home-ser');
      const candidate = join(projectDir, `${currentWork.session_id}.jsonl`);
      return existsSync(candidate) ? candidate : null;
    })();

    if (!resolvedTranscript || !existsSync(resolvedTranscript)) {
      console.error('[ISCSyncHook] No transcript found');
      process.exit(0);
    }

    // Find task directory
    const taskDir = findTaskDir(currentWork.session_dir, currentWork.current_task);
    if (!taskDir) {
      console.error('[ISCSyncHook] No task directory found');
      process.exit(0);
    }

    // Parse transcript for ISC criteria
    const criteria = parseTranscriptForISC(resolvedTranscript);
    console.error(`[ISCSyncHook] Found ${criteria.length} ISC criteria in transcript`);

    // Write ISC.json and update PRD (only if criteria found)
    if (criteria.length > 0) {
      writeISCJson(taskDir, criteria);
      updatePRD(taskDir, criteria);
    }

    // Update THREAD.md (always — even without criteria, phases may exist)
    updateThread(taskDir, resolvedTranscript, criteria);

    process.exit(0);
  } catch (error) {
    console.error(`[ISCSyncHook] Error: ${error}`);
    process.exit(0);
  }
}

main();
