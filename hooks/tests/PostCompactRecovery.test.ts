import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('PostCompactRecovery', () => {
  const hook = 'hooks/PostCompactRecovery.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-postcompact-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('injects identity context on compact source', async () => {
    const result = await runHook(hook, {
      session_id: 'test-pcr-001',
      source: 'compact',
      hook_event_name: 'SessionStart',
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toBeTruthy();
    expect(result.json.additionalContext).toContain('POST-COMPACTION CONTEXT RECOVERY');
    expect(result.json.additionalContext).toContain('IDENTITY');
    expect(result.json.additionalContext).toContain('FORMAT RULES');
    expect(result.json.additionalContext).toContain('LANGUAGE');
  });

  test('includes snapshot data when PreCompact snapshot exists', async () => {
    const sessionId = 'test-pcr-002';

    // Write a PreCompact snapshot
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        algorithm: {
          active: true,
          phase: 'EXECUTE',
          effort: 'Advanced',
          task: 'Building feedback loop',
          criteria_progress: '5/8',
        },
        work: {
          slug: '20260302-feedback-loop',
          task: 'Close the Feedback Loop',
          phase: 'execute',
          progress: '5/8',
        },
      }),
      'utf-8'
    );

    const result = await runHook(hook, {
      session_id: sessionId,
      source: 'compact',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ACTIVE WORK STATE');
    expect(result.json.additionalContext).toContain('EXECUTE');
    expect(result.json.additionalContext).toContain('5/8');
    expect(result.json.additionalContext).toContain('feedback-loop');

    // Snapshot should be cleaned up
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(false);
  });

  test('exits silently for non-compact source', async () => {
    const result = await runHook(hook, {
      session_id: 'test-pcr-003',
      source: 'normal',
      hook_event_name: 'SessionStart',
    });

    expect(result.exitCode).toBe(0);
    // Should not output additionalContext
    expect(result.json?.additionalContext).toBeUndefined();
  });
});
