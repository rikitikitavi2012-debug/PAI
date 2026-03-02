import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('LoadContext', () => {
  const hook = 'hooks/LoadContext.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-loadctx-');
    // Create minimum directory structure
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'FAILURES'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'WORK'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'RELATIONSHIP'), { recursive: true });
    mkdirSync(join(tempDir, 'PAI', 'USER', 'PROJECTS'), { recursive: true });
    mkdirSync(join(tempDir, 'PAI'), { recursive: true });

    // Minimal settings.json
    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      hooks: {},
      dynamicContext: {
        relationshipContext: true,
        learningReadback: true,
        activeWorkSummary: true,
      },
      loadAtStartup: {
        files: [],
      },
    }, null, 2), 'utf-8');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ── Basic Execution ──

  test('executes without error on minimal setup', async () => {
    const result = await runHook(hook, {
      session_id: 'test-lc-001',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('session initialization complete');
  });

  // ── Learning Context Injection ──

  test('injects learning cache when present', async () => {
    // Write a learning-cache.sh with test data
    writeFileSync(join(tempDir, 'MEMORY', 'STATE', 'learning-cache.sh'), [
      "latest='8'",
      "latest_source='explicit'",
      "q15_avg='—'",
      "hour_avg='—'",
      "today_avg='7.5'",
      "week_avg='6.8'",
      "month_avg='5.9'",
      "all_avg='5.9'",
      "trend='up'",
      "total_count=42",
    ].join('\n'), 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-lc-010',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    // Should contain performance signals from cache
    expect(result.stdout).toContain('Performance Signals');
    expect(result.stdout).toContain('7.5');
    expect(result.stdout).toContain('6.8');
    expect(result.stdout).toContain('trending up');
  });

  test('injects wisdom frames when present', async () => {
    // Write a wisdom frame with high-confidence principle
    writeFileSync(join(tempDir, 'MEMORY', 'WISDOM', 'FRAMES', 'development.md'), [
      '# Development',
      '',
      '## Core Principles',
      '',
      '### MVP first, iterate by feedback [CRYSTAL: 90%]',
      '- Always ship minimum viable first',
      '',
      '### Automation over manual work [CRYSTAL: 85%]',
      '- Scripts beat instructions',
      '',
      '### Low confidence principle [CRYSTAL: 50%]',
      '- Should not appear in output',
    ].join('\n'), 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-lc-011',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    // Should contain high-confidence wisdom
    expect(result.stdout).toContain('Wisdom Frames');
    expect(result.stdout).toContain('MVP first');
    expect(result.stdout).toContain('85%');
    // Should NOT contain low-confidence
    expect(result.stdout).not.toContain('Low confidence principle');
  });

  test('injects failure patterns when present', async () => {
    // Write a failure capture with AVOID/INSTEAD rules
    const failDir = join(tempDir, 'MEMORY', 'LEARNING', 'FAILURES', '2026-03',
      '2026-03-01-120000_test-failure-pattern');
    mkdirSync(failDir, { recursive: true });
    writeFileSync(join(failDir, 'CONTEXT.md'), [
      '# Failure Analysis',
      '',
      '## Behavioral Rules',
      '**AVOID:** responding in English when Russian was expected',
      '**INSTEAD:** always default to Russian for all responses',
    ].join('\n'), 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-lc-012',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    // Should contain failure pattern
    expect(result.stdout).toContain('Failure Patterns');
    expect(result.stdout).toContain('English');
    expect(result.stdout).toContain('Russian');
  });

  // ── Disabled Sections ──

  test('skips learning readback when disabled', async () => {
    // Disable learning in settings
    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      hooks: {},
      dynamicContext: {
        relationshipContext: true,
        learningReadback: false,
        activeWorkSummary: true,
      },
      loadAtStartup: { files: [] },
    }, null, 2), 'utf-8');

    // Write data that should NOT appear
    writeFileSync(join(tempDir, 'MEMORY', 'STATE', 'learning-cache.sh'),
      "today_avg='9.0'\ntrend='up'\ntotal_count=100\n", 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-lc-020',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Skipped learning readback');
    // Should NOT contain learning data
    expect(result.stdout).not.toContain('Performance Signals');
  });

  // ── Subagent Detection ──

  test('skips context loading for subagents', async () => {
    const result = await runHook(hook, {
      session_id: 'test-lc-030',
      hook_event_name: 'SessionStart',
    }, {
      PAI_DIR: tempDir,
      CLAUDE_AGENT_TYPE: 'subagent',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('ubagent');
  });

  // ── Force-loaded Startup Files ──

  test('loads startup files from loadAtStartup config', async () => {
    // Create a test startup file
    writeFileSync(join(tempDir, 'PAI', 'TEST_STARTUP.md'),
      '# Test Startup Content\nThis should be injected.', 'utf-8');

    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      hooks: {},
      dynamicContext: {},
      loadAtStartup: {
        files: ['PAI/TEST_STARTUP.md'],
      },
    }, null, 2), 'utf-8');

    const result = await runHook(hook, {
      session_id: 'test-lc-040',
      hook_event_name: 'SessionStart',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Test Startup Content');
    expect(result.stderr).toContain('Force-loaded');
  });
});
