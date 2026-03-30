import { test, expect, describe, afterAll } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync } from 'fs';

describe('WorktreeRemove', () => {
  const hook = 'hooks/WorktreeRemove.hook.ts';
  let tempDir: string;

  afterAll(() => {
    if (tempDir) cleanupTempDir(tempDir);
  });

  test('runs without error, exits 0', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
    });

    expect(result.exitCode).toBe(0);
  });

  test('with mock worktree path', async () => {
    tempDir = createTempDir('pai-test-wtr-');
    const mockWtPath = join(tempDir, 'mock_worktree');
    mkdirSync(mockWtPath, { recursive: true });

    const result = await runHook(hook, {
      session_id: 'test-session-123',
      worktree_path: mockWtPath,
    });

    expect(result.exitCode).toBe(0);
  });
});
