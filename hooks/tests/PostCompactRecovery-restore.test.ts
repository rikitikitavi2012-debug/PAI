import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { existsSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

describe('PostCompactRecovery - restore test', () => {
  const hook = 'hooks/PostCompactRecovery.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-postcompact-restore-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });

    // Copy PAI config to the isolated temp directory so it can load the local configurations
    const paiConfigDir = join(tempDir, 'PAI', 'config');
    mkdirSync(paiConfigDir, { recursive: true });
    copyFileSync(join(process.cwd(), 'PAI', 'config', 'algorithm-phases.yaml'), join(paiConfigDir, 'algorithm-phases.yaml'));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('Сценарий 1: Хук загружает snapshot из PreCompact', async () => {
    const sessionId = 'test-snapshot-1';
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    writeFileSync(snapshotPath, JSON.stringify({
      session_id: sessionId,
      algorithm: { phase: 'BUILD', effort: 'Advanced', task: 'Fix issue', criteria_progress: '2/5', prd_path: 'MEMORY/WORK/issue/PRD.md' },
      work: { slug: 'issue', task: 'Fix it', phase: 'build', progress: '2/5' }
    }));

    const result = await runHook(hook, { session_id: sessionId, source: 'compact', hook_event_name: 'SessionStart' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ACTIVE WORK STATE (captured before compaction by PreCompact.hook.ts)');
    expect(result.json?.additionalContext).toContain('- Algorithm: ACTIVE, phase BUILD, effort Advanced');
    expect(existsSync(snapshotPath)).toBe(false); // Cleanup should happen
  });

  test('Сценарий 2: Восстанавливает identity context (имя DA, principal)', async () => {
    const sessionId = 'test-identity-2';
    // No snapshot needed to inject identity
    const result = await runHook(hook, { session_id: sessionId, source: 'compact', hook_event_name: 'SessionStart' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('IDENTITY:');
    expect(result.json?.additionalContext).toContain('- Assistant name: ');
    expect(result.json?.additionalContext).toContain('- User name: ');
  });

  test('Сценарий 3: Инжектит подсказку с текущей фазой и progress', async () => {
    const sessionId = 'test-hint-3';
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    writeFileSync(snapshotPath, JSON.stringify({
      session_id: sessionId,
      algorithm: { phase: 'THINK', effort: 'Deep', task: 'Analyze feature', criteria_progress: '0/10' },
      work: { slug: 'feature', task: 'Analyze', phase: 'think', progress: '0/10' }
    }));

    const result = await runHook(hook, { session_id: sessionId, source: 'compact', hook_event_name: 'SessionStart' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('- Work phase: think');
    expect(result.json?.additionalContext).toContain('- Work progress: 0/10');
    expect(result.json?.additionalContext).toContain('IMPORTANT: Resume this work. Read the PRD file to restore full context.');
  });

  test('Сценарий 4: Без snapshot файла → работает без краша (fail-open)', async () => {
    const sessionId = 'test-missing-4';
    const result = await runHook(hook, { session_id: sessionId, source: 'compact', hook_event_name: 'SessionStart' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('POST-COMPACTION CONTEXT RECOVERY');
    expect(result.json?.additionalContext).toContain('IDENTITY:');
    // It should not have ACTIVE WORK STATE
    expect(result.json?.additionalContext).not.toContain('ACTIVE WORK STATE');
  });

  test('Сценарий 5: Повреждённый snapshot JSON → fallback на базовый контекст', async () => {
    const sessionId = 'test-corrupt-5';
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    writeFileSync(snapshotPath, '{ invalid json }');

    const result = await runHook(hook, { session_id: sessionId, source: 'compact', hook_event_name: 'SessionStart' }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('POST-COMPACTION CONTEXT RECOVERY');
    expect(result.json?.additionalContext).toContain('IDENTITY:');
    expect(result.json?.additionalContext).not.toContain('ACTIVE WORK STATE');
  });
});
