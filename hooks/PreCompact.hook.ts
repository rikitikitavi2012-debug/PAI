#!/usr/bin/env bun
/**
 * PreCompact.hook.ts — Snapshot dynamic state before context compaction
 *
 * PURPOSE:
 * When /compact fires, Claude loses dynamic context: active task, algorithm phase,
 * PRD progress. This hook saves a snapshot to disk so PostCompactRecovery can
 * restore it alongside static identity context.
 *
 * TRIGGER: PreCompact
 *
 * OUTPUT:
 * - stdout: JSON { continue: true }
 * - stderr: Status messages
 *
 * SIDE EFFECTS:
 * - Writes: MEMORY/STATE/pre-compact-snapshot-{sessionId}.json
 * - Emits: event to events.jsonl
 *
 * PAIR: PostCompactRecovery.hook.ts reads the snapshot and deletes it
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { appendEvent } from './lib/event-emitter';
import { getPaiDir } from './lib/paths';

const BASE_DIR = getPaiDir();
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const ALGORITHMS_DIR = join(STATE_DIR, 'algorithms');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');

interface CompactSnapshot {
  timestamp: string;
  session_id: string;
  algorithm?: {
    active: boolean;
    phase: string;
    effort: string;
    task: string;
    criteria_progress: string;
    prd_path?: string;
  };
  work?: {
    slug: string;
    task?: string;
    phase?: string;
    progress?: string;
  };
}

function getSnapshotPath(sessionId: string): string {
  return join(STATE_DIR, `pre-compact-snapshot-${sessionId}.json`);
}

/** Read algorithm state for this session */
function getAlgorithmState(sessionId: string): CompactSnapshot['algorithm'] | undefined {
  try {
    const statePath = join(ALGORITHMS_DIR, `${sessionId}.json`);
    if (!existsSync(statePath)) return undefined;

    const state = JSON.parse(readFileSync(statePath, 'utf-8'));
    if (!state.active) return undefined;

    const completed = (state.criteria || []).filter((c: any) => c.status === 'completed').length;
    const total = (state.criteria || []).length;

    return {
      active: true,
      phase: state.currentPhase || 'UNKNOWN',
      effort: state.effortLevel || state.sla || 'Standard',
      task: state.taskDescription || '',
      criteria_progress: `${completed}/${total}`,
      prd_path: state.prdPath,
    };
  } catch { return undefined; }
}

/** Read current work state for this session */
function getWorkState(sessionId: string): CompactSnapshot['work'] | undefined {
  try {
    // Try session-scoped first, then legacy
    let statePath = join(STATE_DIR, `current-work-${sessionId}.json`);
    if (!existsSync(statePath)) {
      statePath = join(STATE_DIR, 'current-work.json');
      if (!existsSync(statePath)) return undefined;
    }

    const work = JSON.parse(readFileSync(statePath, 'utf-8'));
    if (sessionId && work.session_id !== sessionId) return undefined;

    // Read PRD frontmatter for phase/progress
    let phase: string | undefined;
    let progress: string | undefined;
    let task: string | undefined;

    if (work.session_dir) {
      const prdPath = join(WORK_DIR, work.session_dir, 'PRD.md');
      if (existsSync(prdPath)) {
        const content = readFileSync(prdPath, 'utf-8');
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const fm = fmMatch[1];
          phase = fm.match(/^phase:\s*(.+)$/m)?.[1]?.trim();
          progress = fm.match(/^progress:\s*(.+)$/m)?.[1]?.trim();
          task = fm.match(/^task:\s*"?(.+?)"?$/m)?.[1]?.trim();
        }
      }
    }

    return {
      slug: work.session_dir || '',
      task,
      phase,
      progress,
    };
  } catch { return undefined; }
}

async function main() {
  let sessionId = 'unknown';

  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) {
      const input = JSON.parse(raw);
      sessionId = input.session_id || 'unknown';
    }
  } catch {
    // Proceed with unknown session_id
  }

  const snapshot: CompactSnapshot = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    algorithm: getAlgorithmState(sessionId),
    work: getWorkState(sessionId),
  };

  // Only write if there's something worth preserving
  if (snapshot.algorithm || snapshot.work) {
    const snapshotPath = getSnapshotPath(sessionId);
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.error(`[PreCompact] Snapshot saved: algorithm=${!!snapshot.algorithm}, work=${!!snapshot.work}`);

    appendEvent({ type: 'custom.pre_compact', source: 'PreCompact', has_algorithm: !!snapshot.algorithm, has_work: !!snapshot.work } as any);
  } else {
    console.error('[PreCompact] No dynamic state to snapshot');
  }

  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

main().catch((err) => {
  console.error(`[PreCompact] Error: ${err}`);
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
