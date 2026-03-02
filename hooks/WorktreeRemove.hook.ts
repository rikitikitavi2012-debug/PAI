#!/usr/bin/env bun
/**
 * WorktreeRemove.hook.ts - Worktree Cleanup (WorktreeRemove)
 *
 * PURPOSE:
 * Cleans up PAI state when a worktree is removed.
 * Logs the event and notifies the user.
 *
 * TRIGGER: WorktreeRemove
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, worktree_path, branch)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking, fail-open)
 *
 * SIDE EFFECTS:
 * - Logs: worktree_remove event to events.jsonl
 * - Notifies: Voice notification about worktree removal
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <50ms
 */

import { appendEvent } from './lib/event-emitter';

interface HookInput {
  session_id: string;
  worktree_path?: string;
  branch?: string;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const raw = await Bun.stdin.text();
    input = JSON.parse(raw);
  } catch {
    // Fail-open: can't parse input, exit silently
    process.exit(0);
  }

  try {
    const worktreePath = input.worktree_path || 'unknown';
    const branch = input.branch || 'unknown';

    // Log event
    appendEvent({
      source: 'WorktreeRemove',
      type: 'worktree_remove',
      data: {
        worktree_path: worktreePath,
        branch,
      },
    });

    // Voice notification (fire-and-forget)
    try {
      await fetch('http://localhost:8888/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Worktree удалён: ${branch}`,
          voice_id: 'fTtv3eikoepIosk8dTZ5',
          voice_enabled: true,
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      // Notification failure is non-critical
    }

    process.stderr.write(`[WorktreeRemove] Worktree cleaned: ${worktreePath} (${branch})\n`);
  } catch (err) {
    // Fail-open
    process.stderr.write(`[WorktreeRemove] Error (non-blocking): ${err}\n`);
  }

  process.exit(0);
}

main();
