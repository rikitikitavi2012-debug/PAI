#!/usr/bin/env bun
/**
 * WorktreeRemove.hook.ts - Worktree Cleanup (WorktreeRemove)
 *
 * PURPOSE:
 * Removes a git worktree created by WorktreeCreate.hook.ts.
 * Fires at session exit or when a subagent finishes.
 *
 * CONTRACT:
 * - Receives worktree_path from Claude Code (the path WorktreeCreate printed)
 * - Removes the git worktree and its branch
 * - No decision control (cannot block removal)
 * - Failures are logged only, non-blocking
 *
 * TRIGGER: WorktreeRemove
 *
 * INPUT (stdin JSON):
 * - session_id: string
 * - worktree_path: string (absolute path from WorktreeCreate stdout)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (fail-open)
 *
 * SIDE EFFECTS:
 * - Removes: git worktree + branch
 * - Logs: worktree_remove event to events.jsonl
 * - Notifies: Voice notification (fire-and-forget)
 */

import { appendEvent } from './lib/event-emitter';
import { getPaiDir } from './lib/paths';
import { basename, resolve } from 'path';
import { existsSync } from 'fs';

interface HookInput {
  session_id: string;
  worktree_path?: string;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const raw = await Bun.stdin.text();
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const worktreePath = input.worktree_path;
  if (!worktreePath) {
    process.stderr.write('[WorktreeRemove] No worktree_path in input\n');
    process.exit(0);
  }

  const branchName = basename(worktreePath);
  const paiDir = getPaiDir();

  // Validate that the worktree_path is inside .claude/worktrees
  // Use resolve() to normalize and trailing slash to prevent sibling-dir traversal
  const worktreesDir = resolve(getPaiDir(), '.claude', 'worktrees') + '/';
  if (!resolve(worktreePath).startsWith(worktreesDir) || worktreePath.includes('..')) {
    process.stderr.write(`[WorktreeRemove] worktree_path is not inside ${worktreesDir}\n`);
    process.exit(0);
  }

  try {
    // Remove git worktree
    if (existsSync(worktreePath)) {
      const removeProc = Bun.spawn(
        ['git', 'worktree', 'remove', '--force', worktreePath],
        {
          cwd: paiDir,
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );
      await removeProc.exited;

      if (removeProc.exitCode !== 0) {
        const stderr = await new Response(removeProc.stderr).text();
        process.stderr.write(`[WorktreeRemove] git worktree remove failed: ${stderr}\n`);
      }
    }

    // Delete the branch (best-effort)
    const branchProc = Bun.spawn(
      ['git', 'branch', '-D', branchName],
      {
        cwd: paiDir,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    await branchProc.exited;

    // Log event
    appendEvent({
      source: 'WorktreeRemove',
      type: 'worktree_remove',
      data: {
        worktree_path: worktreePath,
        branch: branchName,
      },
    });

    // Voice notification (fire-and-forget)
    fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Worktree удалён: ${branchName}`,
        voice_id: 'ogi2DyUAKJb7CEdqqvlU',
        voice_enabled: true,
      }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {});

    process.stderr.write(`[WorktreeRemove] Removed: ${worktreePath} (branch: ${branchName})\n`);
  } catch (err) {
    process.stderr.write(`[WorktreeRemove] Error (non-blocking): ${err}\n`);
  }

  process.exit(0);
}

main();
