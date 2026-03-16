import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';

describe('ResearchCapture', () => {
  const hook = 'hooks/ResearchCapture.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-researchcapture-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('Хук завершается без ошибок при PostToolUse Task событии', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Task',
      tool_result: { stdout: 'test research output' }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
  });

  test('Хук игнорирует PostToolUse для других инструментов (не Task)', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_result: { stdout: 'test research output' }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
  });

  test('Хук корректно обрабатывает пустой input', async () => {
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
  });

  test('Хук завершается быстро (< 500ms)', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Task',
      tool_result: { stdout: 'test research output' }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });

  test('Хук не падает при невалидном JSON', async () => {
    const fullPath = join(process.cwd(), hook);
    const proc = Bun.spawn(['bun', fullPath], {
      stdin: new Blob(['{ malformed json oops']),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PAI_DIR: tempDir },
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stderr).toContain('No hook input received');
  });

  test('Хук корректно обрабатывает Unicode в содержимом', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Task',
      tool_result: { stdout: 'тестовый вывод исследования 📝 ✨' }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
  });
});
