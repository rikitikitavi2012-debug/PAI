#!/usr/bin/env bun
/**
 * WorktreeCreate.hook.ts - Worktree Creation (WorktreeCreate)
 *
 * PURPOSE:
 * Creates an isolated git worktree for --worktree / isolation: "worktree".
 * This hook REPLACES Claude Code's default git worktree behavior.
 *
 * CRITICAL CONTRACT:
 * - MUST create the worktree directory
 * - MUST print the absolute path to stdout (ONLY the path, nothing else)
 * - All other output goes to stderr
 * - Non-zero exit = worktree creation fails
 *
 * TRIGGER: WorktreeCreate
 *
 * INPUT (stdin JSON):
 * - session_id: string
 * - cwd: string (current working directory)
 * - name: string (worktree slug, e.g. "bold-oak-a3f2")
 *
 * OUTPUT:
 * - stdout: Absolute path to created worktree (REQUIRED)
 * - stderr: Status messages
 * - exit(0): Success
 * - exit(1): Failure
 *
 * SIDE EFFECTS:
 * - Creates: git worktree at .claude/worktrees/{name}
 * - Logs: worktree_create event to events.jsonl
 * - Notifies: Voice notification (fire-and-forget, non-blocking)
 */

import { appendEvent } from './lib/event-emitter';
import { getPaiDir } from './lib/paths';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

interface HookInput {
  session_id: string;
  cwd?: string;
  name?: string;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const raw = await Bun.stdin.text();
    input = JSON.parse(raw);
  } catch {
    process.stderr.write('[WorktreeCreate] Failed to parse stdin\n');
    process.exit(1);
  }

  const rawName = input.name || `wt-${Date.now()}`;
  // Validate name to prevent path traversal and git flag injection
  const name = rawName.replace(/[^a-zA-Z0-9-_]/g, '');
  if (!name || name.startsWith('-')) {
    process.stderr.write(`[WorktreeCreate] Invalid worktree name: ${rawName}\n`);
    process.exit(1);
  }

  const paiDir = getPaiDir();
  const worktreesDir = join(paiDir, '.claude', 'worktrees');
  const worktreePath = join(worktreesDir, name);

  try {
    // Ensure worktrees directory exists
    mkdirSync(worktreesDir, { recursive: true });

    // Create git worktree — all git output to stderr
    const proc = Bun.spawn(
      ['git', 'worktree', 'add', '-b', name, worktreePath],
      {
        cwd: paiDir,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    if (proc.exitCode !== 0) {
      process.stderr.write(`[WorktreeCreate] git worktree add failed: ${stderr}\n`);
      process.exit(1);
    }

    // Verify worktree was created
    if (!existsSync(worktreePath)) {
      process.stderr.write(`[WorktreeCreate] Worktree path does not exist after creation: ${worktreePath}\n`);
      process.exit(1);
    }

    // Log event (non-blocking)
    appendEvent({
      source: 'WorktreeCreate',
      type: 'worktree_create',
      data: {
        worktree_path: worktreePath,
        branch: name,
      },
    });

    // Voice notification (fire-and-forget, don't await)
    fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Worktree создан: ${name}`,
        voice_id: 'fTtv3eikoepIosk8dTZ5',
        voice_enabled: true,
      }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {});

    process.stderr.write(`[WorktreeCreate] Created: ${worktreePath} (branch: ${name})\n`);

    // CRITICAL: Print ONLY the path to stdout — Claude Code reads this
    console.log(worktreePath);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`[WorktreeCreate] Error: ${err}\n`);
    process.exit(1);
  }
}

main();
