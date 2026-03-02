import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('WorktreeCreate', () => {
  const hook = 'hooks/WorktreeCreate.hook.ts';

  test('processes worktree creation event', async () => {
    const result = await runHook(hook, {
      session_id: 'test-wc-001',
      worktree_path: '/tmp/test-worktree',
      branch: 'feat/test-branch',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Worktree ready');
  });

  test('handles missing worktree_path', async () => {
    const result = await runHook(hook, {
      session_id: 'test-wc-002',
      branch: 'feat/test-branch',
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('unknown');
  });

  test('handles missing branch', async () => {
    const result = await runHook(hook, {
      session_id: 'test-wc-003',
      worktree_path: '/tmp/test-worktree',
    });
    expect(result.exitCode).toBe(0);
  });

  test('handles empty input gracefully', async () => {
    const result = await runHook(hook, {});
    expect(result.exitCode).toBe(0);
  });

  test('executes under 3000ms', async () => {
    const result = await runHook(hook, {
      session_id: 'test-wc-005',
      worktree_path: '/tmp/test-worktree',
      branch: 'feat/test',
    });
    expect(result.duration).toBeLessThan(3000);
  });
});
