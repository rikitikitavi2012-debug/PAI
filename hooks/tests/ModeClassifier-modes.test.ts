import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';

describe('ModeClassifier', () => {
  const hook = 'hooks/ModeClassifier.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-classifier-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('Greeting returns MINIMAL mode', async () => {
    const resultEn = await runHook(hook, { prompt: 'hello' }, { PAI_DIR: tempDir });
    expect(resultEn.exitCode).toBe(0);
    expect(resultEn.json?.additionalContext).toContain('MINIMAL');

    const resultRu = await runHook(hook, { prompt: 'привет' }, { PAI_DIR: tempDir });
    expect(resultRu.exitCode).toBe(0);
    expect(resultRu.json?.additionalContext).toContain('MINIMAL');
  });

  test('Rating returns MINIMAL mode', async () => {
    const result8 = await runHook(hook, { prompt: '8' }, { PAI_DIR: tempDir });
    expect(result8.exitCode).toBe(0);
    expect(result8.json?.additionalContext).toContain('MINIMAL');

    const result910 = await runHook(hook, { prompt: '9/10' }, { PAI_DIR: tempDir });
    expect(result910.exitCode).toBe(0);
    expect(result910.json?.additionalContext).toContain('MINIMAL');
  });

  test('Complex task returns ALGORITHM mode', async () => {
    const result = await runHook(hook, { prompt: 'создай компонент для авторизации пользователей' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ALGORITHM');
  });

  test('Simple task returns ALGORITHM mode (delegates NATIVE to Complexity Gate)', async () => {
    const result = await runHook(hook, { prompt: 'покажи git status' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ALGORITHM');
    expect(result.json?.additionalContext).toContain('downshift to NATIVE');
  });

  test('Empty prompt handled correctly without crash', async () => {
    const result = await runHook(hook, { prompt: '' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });
});
