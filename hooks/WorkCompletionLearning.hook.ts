#!/usr/bin/env bun
/**
 * WorkCompletionLearning.hook.ts - Extract Learnings from Completed Work (SessionEnd)
 *
 * PURPOSE:
 * Bridges the WORK/ system to the LEARNING/ system. When a session ends with
 * significant work completed, this hook captures the work metadata (files changed,
 * tools used, ideal state criteria) and creates a learning file for future reference.
 * This ensures insights compound over time rather than being lost.
 *
 * TRIGGER: SessionEnd
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, transcript_path)
 * - Files: MEMORY/STATE/current-work.json, MEMORY/WORK/<dir>/META.yaml
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Creates: MEMORY/LEARNING/<category>/<YYYY-MM>/<datetime>_work_<slug>.md
 * - Reads: Current work state and work directory metadata
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: AutoWorkCreation (expects WORK/ structure)
 * - COORDINATES WITH: SessionSummary (both run at SessionEnd)
 * - MUST RUN BEFORE: SessionSummary (captures before state is cleared)
 * - MUST RUN AFTER: Stop handlers (captures completed work)
 *
 * SIGNIFICANT WORK CRITERIA:
 * A learning is only captured if:
 * - Files were changed, OR
 * - Multiple items exist in work directory, OR
 * - Work was manually created (source: MANUAL)
 *
 * LEARNING CATEGORIES:
 * - ALGORITHM: Insights about process/approach improvement
 * - SYSTEM: Technical system improvements
 * (Determined by getLearningCategory utility)
 *
 * ERROR HANDLING:
 * - No active work: Silent exit
 * - Missing META.yaml: Silent exit
 * - Write failures: Logged to stderr, silent exit
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (fire-and-forget at session end)
 * - Typical execution: <100ms
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync, openSync } from 'fs';
import { join, dirname } from 'path';
import { getISOTimestamp, getPSTDate } from './lib/time';
import { getLearningCategory } from './lib/learning-utils';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const MEMORY_DIR = join(BASE_DIR, 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const WORK_DIR = join(MEMORY_DIR, 'WORK');
const LEARNING_DIR = join(MEMORY_DIR, 'LEARNING');
const DEBUG_DIR = join(LEARNING_DIR, 'DEBUG');

/** Open append-mode file descriptor for fire-and-forget stderr logging */
function openDebugLog(toolName: string): number | 'ignore' {
  try {
    if (!existsSync(DEBUG_DIR)) mkdirSync(DEBUG_DIR, { recursive: true });
    return openSync(join(DEBUG_DIR, `${toolName}.log`), 'a');
  } catch {
    return 'ignore';
  }
}

// Session-scoped state file lookup with legacy fallback
function findStateFile(sessionId?: string): string | null {
  if (sessionId) {
    const scoped = join(STATE_DIR, `current-work-${sessionId}.json`);
    if (existsSync(scoped)) return scoped;
  }
  const legacy = join(STATE_DIR, 'current-work.json');
  if (existsSync(legacy)) return legacy;
  return null;
}

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_title: string;
  task_count: number;
  created_at: string;
}

interface WorkMeta {
  id: string;
  title: string;
  created_at: string;
  completed_at: string | null;
  source: string;
  status: string;
  session_id: string;
  lineage: {
    tools_used: string[];
    files_changed: string[];
    agents_spawned: string[];
  };
}

function parseYaml(content: string): WorkMeta {
  // Simple YAML parser for our specific format
  const meta: any = {};
  const lines = content.split('\n');
  let currentKey = '';
  let inArray = false;
  let arrayKey = '';
  let currentLineageKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle array items
    if (trimmed.startsWith('- ') && inArray) {
      const value = trimmed.slice(2).replace(/^["']|["']$/g, '');
      if (arrayKey === 'lineage') {
        // Nested array in lineage — use currentLineageKey, not Object.keys().pop()
        if (currentLineageKey) meta.lineage[currentLineageKey].push(value);
      } else {
        meta[arrayKey].push(value);
      }
      continue;
    }

    // Handle key: value pairs
    const match = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      currentKey = key;

      if (key === 'lineage') {
        meta.lineage = { tools_used: [], files_changed: [], agents_spawned: [] };
        inArray = false;
        continue;
      }

      if (value === '[]') {
        if (meta.lineage) {
          meta.lineage[key] = [];
        } else {
          meta[key] = [];
        }
        inArray = false;
      } else if (value === '') {
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = [];
          arrayKey = 'lineage';
          currentLineageKey = key;
          inArray = true;
        } else {
          meta[key] = [];
          arrayKey = key;
          inArray = true;
        }
      } else {
        const cleanValue = value.replace(/^["']|["']$/g, '');
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = cleanValue === 'null' ? [] : [cleanValue];
        } else {
          meta[key] = cleanValue === 'null' ? null : cleanValue;
        }
        inArray = false;
      }
    }
  }

  return meta as WorkMeta;
}

function getMonthDir(category: 'SYSTEM' | 'ALGORITHM'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const monthDir = join(LEARNING_DIR, category, `${year}-${month}`);

  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return monthDir;
}

function writeLearning(workMeta: WorkMeta, idealContent: string): void {
  const category = getLearningCategory(workMeta.title);
  const monthDir = getMonthDir(category);

  const dateStr = getPSTDate();
  const timeStr = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');
  const titleSlug = workMeta.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);

  const filename = `${dateStr}_${timeStr}_work_${titleSlug}.md`;
  const filepath = join(monthDir, filename);

  // Don't overwrite existing learnings
  if (existsSync(filepath)) {
    console.error(`[WorkCompletionLearning] Learning already exists: ${filename}`);
    return;
  }

  // Calculate session duration
  let duration = 'Unknown';
  if (workMeta.created_at && workMeta.completed_at) {
    const start = new Date(workMeta.created_at);
    const end = new Date(workMeta.completed_at);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) {
      duration = `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      duration = `${hours}h ${mins}m`;
    }
  }

  const content = `# Work Completion Learning

**Title:** ${workMeta.title}
**Duration:** ${duration}
**Category:** ${category}
**Session:** ${workMeta.session_id}

---

## Ideal State Criteria

${idealContent || 'Not specified'}

## What Was Done

- **Files Changed:** ${workMeta.lineage?.files_changed?.length || 0}
- **Tools Used:** ${workMeta.lineage?.tools_used?.join(', ') || 'None tracked'}
- **Agents Spawned:** ${workMeta.lineage?.agents_spawned?.length || 0}

## Insights

*This work session completed successfully. Consider what made it effective:*

- Was the approach straightforward or did it require iteration?
- Were there any blockers or surprises?
- What patterns from this work apply to future tasks?

---

*Auto-captured by WorkCompletionLearning hook at session end*
`;

  writeFileSync(filepath, content);
  console.error(`[WorkCompletionLearning] Created learning: ${filename}`);
}

async function main() {
  try {
    // Read input from stdin with timeout — SessionEnd hooks may receive
    // empty or slow stdin. Proceed regardless since state is read from disk.
    let sessionId: string | undefined;
    let transcriptPath: string | undefined;
    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input && input.trim()) {
        const parsed = JSON.parse(input);
        sessionId = parsed.session_id;
        transcriptPath = parsed.transcript_path;
      }
    } catch {
      // Timeout or parse error — proceed without session_id
    }

    // Check if there's an active work session (session-scoped with legacy fallback)
    const stateFile = findStateFile(sessionId);
    if (!stateFile) {
      console.error('[WorkCompletionLearning] No active work session');
      process.exit(0);
    }

    // Read current work state
    const currentWork: CurrentWork = JSON.parse(readFileSync(stateFile, 'utf-8'));

    // Guard: don't process another session's state
    if (sessionId && currentWork.session_id !== sessionId) {
      console.error('[WorkCompletionLearning] State file belongs to different session, skipping');
      process.exit(0);
    }

    if (!currentWork.session_dir) {
      console.error('[WorkCompletionLearning] No work directory in current session');
      process.exit(0);
    }

    // Read work directory metadata
    const workPath = join(WORK_DIR, currentWork.session_dir);
    const metaPath = join(workPath, 'META.yaml');

    if (!existsSync(metaPath)) {
      console.error('[WorkCompletionLearning] No META.yaml found');
      process.exit(0);
    }

    const metaContent = readFileSync(metaPath, 'utf-8');
    const workMeta = parseYaml(metaContent);

    // Update completed_at if not set
    if (!workMeta.completed_at) {
      workMeta.completed_at = getISOTimestamp();
    }

    // Read ISC.json if it exists
    const iscPath = join(workPath, 'ISC.json');
    let idealContent = '';
    if (existsSync(iscPath)) {
      try {
        const iscData = JSON.parse(readFileSync(iscPath, 'utf-8'));
        // Format ISC for human-readable learning
        if (iscData.current?.criteria?.length > 0) {
          idealContent = '**Criteria:**\n' + iscData.current.criteria.map((c: string) => `- ${c}`).join('\n');
        }
        if (iscData.current?.antiCriteria?.length > 0) {
          idealContent += '\n\n**Anti-Criteria:**\n' + iscData.current.antiCriteria.map((c: string) => `- ${c}`).join('\n');
        }
        if (iscData.satisfaction) {
          const s = iscData.satisfaction;
          idealContent += `\n\n**Satisfaction:** ${s.satisfied}/${s.total} satisfied, ${s.partial} partial, ${s.failed} failed`;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Resolve transcript path for extraction tools
    const resolvedTranscript = transcriptPath || (() => {
      // Fallback: derive transcript path from session_id
      const projectDir = join(BASE_DIR, 'projects', '-home-ser');
      const candidate = join(projectDir, `${workMeta.session_id}.jsonl`);
      return existsSync(candidate) ? candidate : null;
    })();

    // Check if this was significant work
    // Primary signal: transcript size > 5KB means real work happened
    // Trivial sessions ("hi", "ok") produce < 1KB transcripts
    const transcriptSize = resolvedTranscript && existsSync(resolvedTranscript)
      ? (() => { try { return Bun.file(resolvedTranscript).size; } catch { return 0; } })()
      : 0;

    const hasSignificantWork = (
      transcriptSize > 5000 ||
      (workMeta.lineage?.files_changed?.length || 0) > 0 ||
      currentWork.task_count > 1 ||
      workMeta.source === 'MANUAL'
    );

    if (hasSignificantWork) {
      writeLearning(workMeta, idealContent);
    } else {
      console.error('[WorkCompletionLearning] Trivial work session, skipping learning capture');
    }

    // Auto-extract Wisdom Frame observations from session transcript (fire-and-forget)
    // Runs independently of hasSignificantWork — Haiku decides if wisdom exists
    if (resolvedTranscript && existsSync(resolvedTranscript)) {
      const wisdomExtractor = join(BASE_DIR, 'skills', 'PAI', 'Tools', 'WisdomExtractor.ts');
      if (existsSync(wisdomExtractor)) {
        Bun.spawn(['bun', wisdomExtractor, '--transcript', resolvedTranscript], {
          stdout: 'ignore',
          stderr: openDebugLog('WisdomExtractor'),
        });
        console.error('[WorkCompletionLearning] Spawned WisdomExtractor for session wisdom');
      }

      // Sync session work with TELOS life goals (fire-and-forget)
      const telosTracker = join(BASE_DIR, 'skills', 'PAI', 'Tools', 'TELOSTracker.ts');
      if (existsSync(telosTracker)) {
        Bun.spawn(['bun', telosTracker, '--transcript', resolvedTranscript], {
          stdout: 'ignore',
          stderr: openDebugLog('TELOSTracker'),
        });
        console.error('[WorkCompletionLearning] Spawned TELOSTracker for TELOS sync');
      }
    }

    process.exit(0);
  } catch (error) {
    // Silent failure - don't disrupt workflow
    console.error(`[WorkCompletionLearning] Error: ${error}`);
    process.exit(0);
  }
}

main();
