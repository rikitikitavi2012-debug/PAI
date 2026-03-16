import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { createTempDir, cleanupTempDir } from './harness';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('PreCompact State Preservation', () => {
  const hook = 'hooks/PreCompact.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-precompact-state-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE', 'algorithms'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WORK'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('saves the current algorithm phase in the snapshot', async () => {
    const sessionId = 'test-phase-001';
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        currentPhase: 'PLAN',
      }),
      'utf-8'
    );

    const env = { PAI_DIR: tempDir };
    // Call hook using bun spawn instead of runHook to pass env correctly because of the BASE_DIR issue
    const proc = Bun.spawnSync(['bun', join(process.cwd(), hook)], {
      stdin: new Blob([JSON.stringify({ session_id: sessionId })]),
      env: { ...process.env, ...env },
    });

    expect(proc.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.algorithm.phase).toBe('PLAN');
  });

  test('saves progress (N/M) of criteria', async () => {
    const sessionId = 'test-progress-001';
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        criteria: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'completed' },
          { id: '3', status: 'pending' },
        ],
      }),
      'utf-8'
    );

    const env = { PAI_DIR: tempDir };
    const proc = Bun.spawnSync(['bun', join(process.cwd(), hook)], {
      stdin: new Blob([JSON.stringify({ session_id: sessionId })]),
      env: { ...process.env, ...env },
    });

    expect(proc.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.algorithm.criteria_progress).toBe('2/3');
  });

  test('saves effort level', async () => {
    const sessionId = 'test-effort-001';
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        effortLevel: 'Deep',
      }),
      'utf-8'
    );

    const env = { PAI_DIR: tempDir };
    const proc = Bun.spawnSync(['bun', join(process.cwd(), hook)], {
      stdin: new Blob([JSON.stringify({ session_id: sessionId })]),
      env: { ...process.env, ...env },
    });

    expect(proc.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.algorithm.effort).toBe('Deep');
  });

  test('saves the slug of the current PRD', async () => {
    const sessionId = 'test-slug-001';
    const slug = '20261010-test-slug';

    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', `current-work-${sessionId}.json`),
      JSON.stringify({
        session_id: sessionId,
        session_dir: slug,
      }),
      'utf-8'
    );

    const env = { PAI_DIR: tempDir };
    const proc = Bun.spawnSync(['bun', join(process.cwd(), hook)], {
      stdin: new Blob([JSON.stringify({ session_id: sessionId })]),
      env: { ...process.env, ...env },
    });

    expect(proc.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.work.slug).toBe(slug);
  });

  test('creates the snapshot file in MEMORY/STATE/', async () => {
    const sessionId = 'test-location-001';
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        currentPhase: 'OBSERVE',
      }),
      'utf-8'
    );

    const env = { PAI_DIR: tempDir };
    const proc = Bun.spawnSync(['bun', join(process.cwd(), hook)], {
      stdin: new Blob([JSON.stringify({ session_id: sessionId })]),
      env: { ...process.env, ...env },
    });

    expect(proc.exitCode).toBe(0);

    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    // Ensure that it's in the exact directory expected
    const stateDir = join(tempDir, 'MEMORY', 'STATE');
    const snapshotPathExpected = join(stateDir, `pre-compact-snapshot-${sessionId}.json`);
    expect(snapshotPath).toBe(snapshotPathExpected);
  });
});
