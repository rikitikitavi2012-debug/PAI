import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('WisdomSync', () => {
  const hook = 'hooks/WisdomSync.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-wisdom-');
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('skips when no ratings file exists', async () => {
    const result = await runHook(hook, {
      session_id: 'test-ws-001',
      hook_event_name: 'SessionEnd',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('skipping');
  });

  test('skips when ratings file is empty', async () => {
    writeFileSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl'), '', 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-ws-002',
      hook_event_name: 'SessionEnd',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('skipping');
  });

  test('skips when ratings are old (>2 hours)', async () => {
    const oldTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    writeFileSync(
      join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl'),
      JSON.stringify({ timestamp: oldTimestamp, rating: 7, session_id: 'old', source: 'explicit' }) + '\n',
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: 'test-ws-003',
      hook_event_name: 'SessionEnd',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No recent ratings');
  });

  test('processes when recent ratings exist', async () => {
    const now = new Date().toISOString();
    const ratings = [
      { timestamp: now, rating: 9, session_id: 'test-ws-004', source: 'explicit', comment: 'great work' },
      { timestamp: now, rating: 7, session_id: 'test-ws-004', source: 'implicit', sentiment_summary: 'positive engagement' },
    ];
    writeFileSync(
      join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl'),
      ratings.map(r => JSON.stringify(r)).join('\n') + '\n',
      'utf-8'
    );

    // Write initial wisdom frame for WisdomSync to potentially update
    writeFileSync(
      join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES', 'workflow.md'),
      '# Workflow\n\n## Core Principles\n\n### Test principle [CRYSTAL: 50%]\n- Test data\n',
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: 'test-ws-004',
      hook_event_name: 'SessionEnd',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    // Should process (not skip)
    expect(result.stderr).not.toContain('No recent ratings');
  });

  test('always exits 0 (fail-open)', async () => {
    // Corrupt ratings file
    writeFileSync(
      join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl'),
      'NOT VALID JSON\n{broken\n',
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: 'test-ws-005',
      hook_event_name: 'SessionEnd',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
  });
});
