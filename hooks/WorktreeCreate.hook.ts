#!/usr/bin/env bun
/**
 * WorktreeCreate.hook.ts - Worktree Isolation Setup (WorktreeCreate)
 *
 * PURPOSE:
 * Sets up PAI-specific configuration when a new worktree is created.
 * Logs the event and notifies the user.
 *
 * TRIGGER: WorktreeCreate
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
 * - Logs: worktree_create event to events.jsonl
 * - Notifies: Voice notification about worktree activation
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
      source: 'WorktreeCreate',
      type: 'worktree_create',
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
          message: `Worktree создан: ${branch}`,
          voice_id: 'fTtv3eikoepIosk8dTZ5',
          voice_enabled: true,
        }),
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      // Notification failure is non-critical
    }

    process.stderr.write(`[WorktreeCreate] Worktree ready: ${worktreePath} (${branch})\n`);
  } catch (err) {
    // Fail-open
    process.stderr.write(`[WorktreeCreate] Error (non-blocking): ${err}\n`);
  }

  process.exit(0);
}

main();
