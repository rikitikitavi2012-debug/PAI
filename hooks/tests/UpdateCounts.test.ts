import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, symlinkSync } from 'fs';

describe('UpdateCounts', () => {
  const hook = 'hooks/UpdateCounts.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-update-counts-');
    // harness uses process.env.PAI_DIR if set

    symlinkSync(join(process.cwd(), 'hooks'), join(tempDir, 'hooks'));
    symlinkSync(join(process.cwd(), 'PAI'), join(tempDir, 'PAI'));
    symlinkSync(join(process.cwd(), 'skills'), join(tempDir, 'skills'));

    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('runs without error, exits 0', async () => {
    // We just want to ensure it doesn't crash on standard execution
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
  });
});
