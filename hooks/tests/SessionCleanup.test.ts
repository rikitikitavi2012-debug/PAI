import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('SessionCleanup', () => {
  const hook = 'hooks/SessionCleanup.hook.ts';
  let tempDir: string;
  let stateDir: string;
  let workDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-session-clean-');
    stateDir = join(tempDir, 'MEMORY', 'STATE');
    workDir = join(tempDir, 'MEMORY', 'WORK');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(workDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('empty stdin/no current work → exits 0 without error', async () => {
    const result = await runHook(
      hook,
      {},
      { PAI_DIR: tempDir },
      1000
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No current work to complete');
  });

  test('valid session → marks work complete and cleans state', async () => {
    const sessionId = 'test-cleanup-01';
    const sessionDir = '20240101-120000_test-work';

    // Create state file
    const stateFile = join(stateDir, `current-work-${sessionId}.json`);
    writeFileSync(stateFile, JSON.stringify({
      session_id: sessionId,
      session_dir: sessionDir
    }));

    // Create work directory and PRD
    const workPath = join(workDir, sessionDir);
    mkdirSync(workPath, { recursive: true });
    writeFileSync(join(workPath, 'PRD.md'), '---\nstatus: ACTIVE\ncompleted_at: null\n---');

    // Also create a dummy session in session-names.json
    writeFileSync(join(stateDir, 'session-names.json'), JSON.stringify({
      [sessionId]: 'Test Session Name'
    }));

    const result = await runHook(
      hook,
      { session_id: sessionId },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    // Verify state file was deleted
    expect(existsSync(stateFile)).toBe(false);

    // Verify PRD was updated
    const prdContent = readFileSync(join(workPath, 'PRD.md'), 'utf-8');
    expect(prdContent).toContain('status: COMPLETED');
    expect(prdContent).not.toContain('completed_at: null');

    // Verify session-names.json was cleaned
    const names = JSON.parse(readFileSync(join(stateDir, 'session-names.json'), 'utf-8'));
    expect(names[sessionId]).toBeUndefined();
  });

  test('wrong session id in stdin → skips cleanup and exits 0', async () => {
    const sessionId = 'test-cleanup-02';

    // Create state file for a different session id but legacy name fallback
    const stateFile = join(stateDir, `current-work.json`);
    writeFileSync(stateFile, JSON.stringify({
      session_id: 'different-session-id',
      session_dir: 'dummy-dir'
    }));

    const result = await runHook(
      hook,
      { session_id: sessionId },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('belongs to different session, skipping');

    // File should still exist
    expect(existsSync(stateFile)).toBe(true);
  });
});
