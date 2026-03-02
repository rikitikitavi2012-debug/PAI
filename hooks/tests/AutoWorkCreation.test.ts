import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('AutoWorkCreation', () => {
  const hook = 'hooks/AutoWorkCreation.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-autowork-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('empty prompt → exits 0 silently', async () => {
    const result = await runHook(
      hook,
      { session_id: 'test-aw-01', prompt: '' },
      { PAI_DIR: tempDir }
    );
    expect(result.exitCode).toBe(0);
    // Should not create anything
    expect(existsSync(join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-01.json'))).toBe(false);
  });

  test('new work session → creates session directory and task', async () => {
    const prompt = 'Create a new python script to parse logs';
    const result = await runHook(
      hook,
      { session_id: 'test-aw-02', prompt },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    // Verify current-work state was written
    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-02.json');
    expect(existsSync(stateFile)).toBe(true);

    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.session_id).toBe('test-aw-02');
    expect(stateData.session_dir).toContain('create-a-new-python-script-to-parse-logs');
    expect(stateData.current_task).toBe('001_create-a-new-python-script-to-parse-logs');

    // Verify directory structure exists
    const taskDir = join(tempDir, 'MEMORY', 'WORK', stateData.session_dir, 'tasks', stateData.current_task);
    expect(existsSync(taskDir)).toBe(true);
    expect(existsSync(join(taskDir, 'ISC.json'))).toBe(true);
    expect(existsSync(join(taskDir, 'THREAD.md'))).toBe(true);
  });

  test('existing session, continuation → no new task created', async () => {
    // Setup initial session
    await runHook(
      hook,
      { session_id: 'test-aw-03', prompt: 'Initial task' },
      { PAI_DIR: tempDir }
    );

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-03.json');
    const stateDataBefore = JSON.parse(readFileSync(stateFile, 'utf-8'));

    // Second prompt in same session - should be continuation
    const result = await runHook(
      hook,
      { session_id: 'test-aw-03', prompt: 'Now fix the bugs' },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateDataAfter = JSON.parse(readFileSync(stateFile, 'utf-8'));
    // Task count should remain 1
    expect(stateDataAfter.task_count).toBe(stateDataBefore.task_count);
    expect(stateDataAfter.current_task).toBe(stateDataBefore.current_task);
  });

  test('existing session, conversational → no new task', async () => {
    // Setup initial session
    await runHook(
      hook,
      { session_id: 'test-aw-04', prompt: 'Initial task' },
      { PAI_DIR: tempDir }
    );

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-04.json');
    const stateDataBefore = JSON.parse(readFileSync(stateFile, 'utf-8'));

    // Conversational prompt
    const result = await runHook(
      hook,
      { session_id: 'test-aw-04', prompt: 'ok' },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateDataAfter = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateDataAfter.task_count).toBe(stateDataBefore.task_count);
  });
});
