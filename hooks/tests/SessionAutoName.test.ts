import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, symlinkSync } from 'fs';

describe('SessionAutoName', () => {
  const hook = 'hooks/SessionAutoName.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-session-name-');

    symlinkSync(join(process.cwd(), 'hooks'), join(tempDir, 'hooks'));
    symlinkSync(join(process.cwd(), 'PAI'), join(tempDir, 'PAI'));

    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('runs without crash with empty input, exits 0', async () => {
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
  });

  test('runs with basic prompt, verify it exits 0', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-session',
        prompt: 'Fix the login bug',
      },
      { PAI_DIR: tempDir }
    );
    expect(result.exitCode).toBe(0);
  });
});
