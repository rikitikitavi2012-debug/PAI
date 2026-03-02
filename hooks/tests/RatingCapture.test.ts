import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * RatingCapture integration tests.
 *
 * NOTE: Only tests explicit rating detection (no API calls needed).
 * Implicit sentiment analysis requires live Anthropic API — tested manually
 * via real session interaction, not in CI/automated tests.
 *
 * Non-explicit prompts (like "3.5", "5 items") trigger inference which
 * hangs without API access, so these edge cases use timeout=3000ms
 * and only verify the hook doesn't crash.
 */

describe('RatingCapture', () => {
  const hook = 'hooks/RatingCapture.hook.ts';
  let tempDir: string;
  let ratingsPath: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-rating-');
    mkdirSync(join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS'), { recursive: true });
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
    ratingsPath = join(tempDir, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl');
    writeFileSync(ratingsPath, '', 'utf-8');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // ── Explicit Rating Detection ──

  test('detects explicit rating "9"', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-001',
      prompt: '9',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Explicit rating: 9');
  });

  test('detects explicit rating with comment "8 - great work"', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-002',
      prompt: '8 - great work',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Explicit rating: 8');
  });

  test('detects rating "10"', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-003',
      prompt: '10',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Explicit rating: 10');
  });

  test('detects rating "6: needs improvement"', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-004',
      prompt: '6: needs improvement',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Explicit rating: 6');
  });

  // ── Schema Validation ──

  test('writes to ratings.jsonl with correct schema', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-010',
      prompt: '7 - schema test',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    const content = readFileSync(ratingsPath, 'utf-8').trim();
    const lines = content.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const entry = JSON.parse(lines[lines.length - 1]);
    // Required fields
    expect(entry.rating).toBe(7);
    expect(entry.session_id).toBe('test-rc-010');
    expect(entry.source).toBe('explicit');
    expect(entry.timestamp).toBeTruthy();
    // Timestamp must be valid ISO
    expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
  });

  test('writes multiple ratings to same file', async () => {
    // First rating
    await runHook(hook, {
      session_id: 'test-rc-011a',
      prompt: '5',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    // Second rating
    await runHook(hook, {
      session_id: 'test-rc-011b',
      prompt: '9',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir });

    const content = readFileSync(ratingsPath, 'utf-8').trim();
    const lines = content.split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(2);

    const entries = lines.map(l => JSON.parse(l));
    const a = entries.find((e: any) => e.session_id === 'test-rc-011a');
    const b = entries.find((e: any) => e.session_id === 'test-rc-011b');
    expect(a?.rating).toBe(5);
    expect(b?.rating).toBe(9);
  });

  // ── Edge Cases (short timeout — these may trigger inference) ──

  test('handles empty prompt without crash', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-020',
      prompt: '',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir }, 3000);

    // May timeout if inference tried, but should not crash
    expect(result.exitCode === 0 || result.exitCode === -1).toBe(true);
  });

  test('handles missing prompt without crash', async () => {
    const result = await runHook(hook, {
      session_id: 'test-rc-021',
      hook_event_name: 'UserPromptSubmit',
    }, { PAI_DIR: tempDir }, 3000);

    expect(result.exitCode === 0 || result.exitCode === -1).toBe(true);
  });
});
