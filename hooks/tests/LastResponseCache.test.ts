import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, mkdirSync, symlinkSync } from 'fs';
import { join } from 'path';

describe('LastResponseCache', () => {
  const hook = 'hooks/LastResponseCache.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    // Harness requires PAI_DIR env variable to be '.' so that hooks/ path resolves relative to repo root.
    // We can't change harness's BASE_DIR resolution, so PAI_DIR must be the repo root.
    // Instead we'll let getPaiDir() use the temp directory via an env override if available, or
    // we set process.env.PAI_DIR = tempDir for the hook execution, BUT the harness uses PAI_DIR to find the hook file.
    // So if we set PAI_DIR=tempDir, harness looks for tempDir/hooks/... which doesn't exist.
    // Let's create a symlink in tempDir/hooks -> repo/hooks to allow it to run, OR we just set PAI_DIR='.' in harness and mock the output dir.
    tempDir = createTempDir('pai-last-response-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    // Also symlink hooks and lib to the tempDir so that `bun tempDir/hooks/LastResponseCache.hook.ts` works
    // if harness uses PAI_DIR as the base directory for the hook path.

    symlinkSync(join(process.cwd(), 'hooks'), join(tempDir, 'hooks'));
    symlinkSync(join(process.cwd(), 'PAI'), join(tempDir, 'PAI'));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('provides last_assistant_message -> writes to file', async () => {
    const result = await runHook(
      hook,
      {
        last_assistant_message: 'This is the last message.',
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const cachePath = join(tempDir, 'MEMORY', 'STATE', 'last-response.txt');
    expect(existsSync(cachePath)).toBe(true);
    const content = readFileSync(cachePath, 'utf-8');
    expect(content).toBe('This is the last message.');
  });

  test('no message -> no file written', async () => {
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    const cachePath = join(tempDir, 'MEMORY', 'STATE', 'last-response.txt');
    expect(existsSync(cachePath)).toBe(false);
  });
});
