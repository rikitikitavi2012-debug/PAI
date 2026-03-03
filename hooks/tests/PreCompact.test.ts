import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('PreCompact', () => {
  const hook = 'hooks/PreCompact.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-precompact-');
    // Create required directory structure
    mkdirSync(join(tempDir, 'MEMORY', 'STATE', 'algorithms'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WORK'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('creates snapshot when algorithm state exists', async () => {
    const sessionId = 'test-pc-001';

    // Write mock algorithm state
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        currentPhase: 'EXECUTE',
        effortLevel: 'Advanced',
        taskDescription: 'Test task for PreCompact',
        criteria: [
          { id: 'ISC-1', status: 'completed' },
          { id: 'ISC-2', status: 'pending' },
        ],
      }),
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: sessionId,
      hook_event_name: 'PreCompact',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);

    // Check snapshot was created
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.algorithm).toBeTruthy();
    expect(snapshot.algorithm.phase).toBe('EXECUTE');
    expect(snapshot.algorithm.effort).toBe('Advanced');
    expect(snapshot.algorithm.criteria_progress).toBe('1/2');
  });

  test('creates snapshot when work state exists', async () => {
    const sessionId = 'test-pc-002';

    // Write mock work state
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', `current-work-${sessionId}.json`),
      JSON.stringify({
        session_id: sessionId,
        session_dir: '20260302-test-task',
      }),
      'utf-8'
    );

    // Write mock PRD
    const workDir = join(tempDir, 'MEMORY', 'WORK', '20260302-test-task');
    mkdirSync(workDir, { recursive: true });
    writeFileSync(
      join(workDir, 'PRD.md'),
      `---\ntask: "Test task"\nphase: execute\nprogress: 3/5\n---\n`,
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: sessionId,
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.work).toBeTruthy();
    expect(snapshot.work.slug).toBe('20260302-test-task');
    expect(snapshot.work.phase).toBe('execute');
    expect(snapshot.work.progress).toBe('3/5');
  });

  test('skips snapshot when no state exists', async () => {
    const result = await runHook(hook, {
      session_id: 'test-pc-003',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No dynamic state');
  });

  test('always returns continue: true', async () => {
    const result = await runHook(hook, {
      session_id: 'test-pc-004',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('handles malformed JSON state files gracefully', async () => {
    const sessionId = 'test-pc-005';
    const statePath = join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`);
    mkdirSync(join(tempDir, 'MEMORY', 'STATE', 'algorithms'), { recursive: true });
    writeFileSync(statePath, '{ invalid json ', 'utf-8');

    const result = await runHook(hook, {
      session_id: sessionId,
      hook_event_name: 'PreCompact',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('handles empty input gracefully', async () => {
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('executes under 500ms for memory preservation', async () => {
    const result = await runHook(hook, {
      session_id: 'test-pc-006',
      hook_event_name: 'PreCompact',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });
});
