import { test, expect, describe, afterAll } from 'bun:test';
import { runHook } from './harness';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const WORKTREES_DIR = join(BASE_DIR, '.claude', 'worktrees');

// Track worktrees created during tests for cleanup
const createdWorktrees: string[] = [];

afterAll(() => {
  for (const wt of createdWorktrees) {
    try {
      // Remove git worktree
      Bun.spawnSync(['git', 'worktree', 'remove', '--force', wt], { cwd: BASE_DIR });
      // Delete branch
      const name = wt.split('/').pop()!;
      Bun.spawnSync(['git', 'branch', '-D', name], { cwd: BASE_DIR });
    } catch {}
  }
});

describe('WorktreeCreate', () => {
  const hook = 'hooks/WorktreeCreate.hook.ts';

  test('creates worktree and outputs path on stdout', async () => {
    const name = `test-wc-${Date.now()}`;
    const result = await runHook(hook, {
      session_id: 'test-wc-001',
      cwd: BASE_DIR,
      name,
    });

    const expectedPath = join(WORKTREES_DIR, name);
    createdWorktrees.push(expectedPath);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(expectedPath);
    expect(existsSync(expectedPath)).toBe(true);
    expect(result.stderr).toContain('Created');
  });

  test('generates name when not provided', async () => {
    const result = await runHook(hook, {
      session_id: 'test-wc-002',
      cwd: BASE_DIR,
    });

    expect(result.exitCode).toBe(0);
    const outputPath = result.stdout.trim();
    expect(outputPath).toContain('.claude/worktrees/wt-');
    createdWorktrees.push(outputPath);
  });

  test('fails on invalid stdin (no exit 0 with empty)', async () => {
    // Hook should exit 1 on unparseable input (not fail-open)
    const proc = Bun.spawn(['bun', join(BASE_DIR, hook)], {
      stdin: new Blob(['not json']),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, CLAUDE_CODE_AGENT_TASK_ID: 'test-harness' },
    });
    await proc.exited;
    expect(proc.exitCode).toBe(1);
  });

  test('stdout contains ONLY the path (no extra output)', async () => {
    const name = `test-wc-clean-${Date.now()}`;
    const result = await runHook(hook, {
      session_id: 'test-wc-004',
      cwd: BASE_DIR,
      name,
    });

    const expectedPath = join(WORKTREES_DIR, name);
    createdWorktrees.push(expectedPath);

    // stdout must be exactly the path, no extra lines
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(expectedPath);
  });

  test('executes under 5000ms', async () => {
    const name = `test-wc-perf-${Date.now()}`;
    const result = await runHook(hook, {
      session_id: 'test-wc-005',
      cwd: BASE_DIR,
      name,
    });

    createdWorktrees.push(result.stdout.trim());
    expect(result.duration).toBeLessThan(5000);
  });
});
