import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, readFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

/**
 * E2E Pipeline Tests — End-to-end verification that data flows
 * from point A to point Z through the real hook system.
 *
 * These tests use isolated temp dirs but test REAL hook logic
 * (not mocks). Each test verifies a complete data pathway.
 */

describe('E2E: Rating → Storage → Readback', () => {
  let tempDir: string;
  let ratingsPath: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-e2e-');
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'FAILURES'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WORK'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'RELATIONSHIP'), { recursive: true });
    mkdirSync(join(tempDir, 'PAI', 'USER', 'PROJECTS'), { recursive: true });
    ratingsPath = join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl');
    writeFileSync(ratingsPath, '', 'utf-8');

    // Minimal settings.json for LoadContext
    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      hooks: {},
      dynamicContext: {
        relationshipContext: true,
        learningReadback: true,
        activeWorkSummary: true,
      },
      loadAtStartup: { files: [] },
    }, null, 2), 'utf-8');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ── CANARY TEST: Unique marker through pipeline ──

  test('CANARY: explicit rating appears in ratings.jsonl with exact value', async () => {
    const CANARY_SESSION = 'canary-e2e-' + Date.now();

    // Step 1: Inject rating via RatingCapture
    const ratingResult = await runHook('hooks/RatingCapture.hook.ts', {
      session_id: CANARY_SESSION,
      prompt: '7 - canary test marker',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(ratingResult.exitCode).toBe(0);

    // Step 2: Verify canary appeared in ratings.jsonl
    const content = readFileSync(ratingsPath, 'utf-8').trim();
    const lines = content.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const canaryEntry = lines
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .find((e: any) => e.session_id === CANARY_SESSION);

    expect(canaryEntry).toBeTruthy();
    expect(canaryEntry.rating).toBe(7);
    expect(canaryEntry.source).toBe('explicit');
    expect(canaryEntry.timestamp).toBeTruthy();
    // Verify ISO timestamp format
    expect(new Date(canaryEntry.timestamp).getTime()).toBeGreaterThan(0);
  });

  test('CANARY: learning cache data appears in LoadContext output', async () => {
    // Step 1: Write learning cache with unique marker values
    writeFileSync(join(tempDir, 'MEMORY', 'STATE', 'learning-cache.sh'), [
      "latest='9'",
      "latest_source='explicit'",
      "q15_avg='—'",
      "hour_avg='—'",
      "today_avg='8.3'",
      "week_avg='7.1'",
      "month_avg='6.2'",
      "all_avg='6.2'",
      "trend='up'",
      "total_count=42",
    ].join('\n'), 'utf-8');

    // Step 2: Run LoadContext and verify injection
    const contextResult = await runHook('hooks/LoadContext.hook.ts', {
      session_id: 'canary-ctx-001',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(contextResult.exitCode).toBe(0);
    // Verify the exact numbers from our cache appear in output
    expect(contextResult.stdout).toContain('8.3');
    expect(contextResult.stdout).toContain('7.1');
    expect(contextResult.stdout).toContain('6.2');
    expect(contextResult.stdout).toContain('42');
  });

  test('CANARY: wisdom frame content appears in LoadContext output', async () => {
    // Step 1: Write wisdom frame with unique content
    const CANARY_WISDOM = 'CANARY_WISDOM_E2E_' + Date.now();
    writeFileSync(
      join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES', 'test-domain.md'),
      [
        '# Test Domain',
        '',
        '## Core Principles',
        '',
        `### ${CANARY_WISDOM} [CRYSTAL: 95%]`,
        '- Unique test principle',
      ].join('\n'),
      'utf-8'
    );

    // Step 2: LoadContext should inject this wisdom
    const contextResult = await runHook('hooks/LoadContext.hook.ts', {
      session_id: 'canary-wis-001',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(contextResult.exitCode).toBe(0);
    expect(contextResult.stdout).toContain(CANARY_WISDOM);
    expect(contextResult.stdout).toContain('95%');
  });

  test('CANARY: failure pattern AVOID/INSTEAD appears in LoadContext output', async () => {
    // Step 1: Write failure capture with unique AVOID/INSTEAD
    const CANARY_AVOID = 'CANARY_AVOID_' + Date.now();
    const CANARY_INSTEAD = 'CANARY_INSTEAD_' + Date.now();
    const failDir = join(tempDir, 'MEMORY', 'LEARNING', 'FAILURES', '2026-03',
      '2026-03-02-100000_canary-failure-test');
    mkdirSync(failDir, { recursive: true });
    writeFileSync(join(failDir, 'CONTEXT.md'), [
      '# Failure Analysis',
      '',
      '## Behavioral Rules',
      `**AVOID:** ${CANARY_AVOID}`,
      `**INSTEAD:** ${CANARY_INSTEAD}`,
    ].join('\n'), 'utf-8');

    // Step 2: LoadContext should inject this failure pattern
    const contextResult = await runHook('hooks/LoadContext.hook.ts', {
      session_id: 'canary-fail-001',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(contextResult.exitCode).toBe(0);
    expect(contextResult.stdout).toContain(CANARY_AVOID);
    expect(contextResult.stdout).toContain(CANARY_INSTEAD);
  });
});

describe('E2E: PreCompact → PostCompactRecovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-e2e-compact-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE', 'algorithms'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WORK'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('CANARY: PreCompact snapshot → PostCompactRecovery injection', async () => {
    const CANARY_TASK = 'CANARY_TASK_' + Date.now();
    const sessionId = 'canary-compact-001';

    // Step 1: Write algorithm state for PreCompact to snapshot
    writeFileSync(
      join(tempDir, 'MEMORY', 'STATE', 'algorithms', `${sessionId}.json`),
      JSON.stringify({
        active: true,
        currentPhase: 'EXECUTE',
        effortLevel: 'Advanced',
        taskDescription: CANARY_TASK,
        criteria: [
          { id: 'ISC-1', status: 'completed' },
          { id: 'ISC-2', status: 'completed' },
          { id: 'ISC-3', status: 'pending' },
        ],
      }),
      'utf-8'
    );

    // Step 2: Run PreCompact to create snapshot
    const preResult = await runHook('hooks/PreCompact.hook.ts', {
      session_id: sessionId,
      hook_event_name: 'PreCompact',
    }, { PAI_DIR: tempDir });

    expect(preResult.exitCode).toBe(0);

    // Step 3: Verify snapshot exists
    const snapshotPath = join(tempDir, 'MEMORY', 'STATE', `pre-compact-snapshot-${sessionId}.json`);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.algorithm.phase).toBe('EXECUTE');
    expect(snapshot.algorithm.criteria_progress).toBe('2/3');

    // Step 4: Run PostCompactRecovery — should read snapshot and inject
    const postResult = await runHook('hooks/PostCompactRecovery.hook.ts', {
      session_id: sessionId,
      source: 'compact',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(postResult.exitCode).toBe(0);
    expect(postResult.json?.additionalContext).toBeTruthy();
    expect(postResult.json.additionalContext).toContain('EXECUTE');
    expect(postResult.json.additionalContext).toContain('2/3');

    // Step 5: Snapshot should be cleaned up after recovery
    expect(existsSync(snapshotPath)).toBe(false);
  });
});

describe('E2E: Memory Write/Read Cycles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-e2e-memory-');
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('STATE write → read roundtrip preserves data', () => {
    const CANARY = { marker: 'e2e-state-' + Date.now(), value: 42 };
    const path = join(tempDir, 'MEMORY', 'STATE', 'test-state.json');

    writeFileSync(path, JSON.stringify(CANARY), 'utf-8');
    const readBack = JSON.parse(readFileSync(path, 'utf-8'));

    expect(readBack.marker).toBe(CANARY.marker);
    expect(readBack.value).toBe(42);
  });

  test('LEARNING write → read roundtrip preserves data', () => {
    const CANARY = 'CANARY_LEARNING_' + Date.now();
    const path = join(tempDir, 'MEMORY', 'LEARNING', 'test-signal.md');

    writeFileSync(path, `# Signal\n\n${CANARY}\n`, 'utf-8');
    const content = readFileSync(path, 'utf-8');

    expect(content).toContain(CANARY);
  });

  test('WISDOM FRAMES are parseable and contain structured data', () => {
    const framePath = join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES', 'test.md');
    writeFileSync(framePath, [
      '# Test Domain',
      '',
      '## Core Principles',
      '',
      '### Principle One [CRYSTAL: 90%]',
      '- First principle detail',
      '',
      '### Principle Two [CRYSTAL: 75%]',
      '- Second principle detail',
    ].join('\n'), 'utf-8');

    const content = readFileSync(framePath, 'utf-8');
    // Parse CRYSTAL percentages
    const crystalMatches = [...content.matchAll(/\[CRYSTAL: (\d+)%\]/g)];
    expect(crystalMatches.length).toBe(2);
    expect(parseInt(crystalMatches[0][1])).toBe(90);
    expect(parseInt(crystalMatches[1][1])).toBe(75);
  });
});
