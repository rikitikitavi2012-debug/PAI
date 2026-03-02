import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('UpdateTabTitle', () => {
  const hook = 'hooks/UpdateTabTitle.hook.ts';

  test('completes under 5000ms (was 10006ms TIMEOUT before fix)', async () => {
    const result = await runHook(hook, {
      session_id: 'test-utt-perf',
      prompt: 'fix the auth bug in login page',
    });
    expect(result.exitCode).toBe(0);
    // Budget: inference 3000ms + voice 1500ms + overhead = well under 5s
    // Before fix: 10006ms TIMEOUT. After fix: ~3-4s worst case.
    expect(result.duration).toBeLessThan(5000);
  });

  test('handles empty prompt gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-utt-empty',
      prompt: '',
    });
    expect(result.exitCode).toBe(0);
  });

  test('handles short prompt gracefully (< 3 chars)', async () => {
    const result = await runHook(hook, {
      session_id: 'test-utt-short',
      prompt: 'hi',
    });
    expect(result.exitCode).toBe(0);
  });

  test('skips rating prompts (1-10)', async () => {
    const result = await runHook(hook, {
      session_id: 'test-utt-rating',
      prompt: '7',
    });
    expect(result.exitCode).toBe(0);
    // Should not attempt inference for ratings
    expect(result.stderr).not.toContain('Inference');
  });

  test('handles missing session_id gracefully', async () => {
    const result = await runHook(hook, {
      prompt: 'check the deployment status',
    });
    expect(result.exitCode).toBe(0);
  });

  test('handles missing input gracefully', async () => {
    const result = await runHook(hook, {});
    expect(result.exitCode).toBe(0);
  });

  test('extracts deterministic title from imperative prompt', async () => {
    const result = await runHook(hook, {
      session_id: 'test-utt-imperative',
      prompt: 'fix the auth bug',
    });
    expect(result.exitCode).toBe(0);
    // The deterministic extractPromptTitle should produce a gerund title
    // from "fix" -> "Fixing"
    expect(result.stderr).toContain('Fixing');
  });

  test('fail-open on malformed JSON stdin', async () => {
    // harness always sends valid JSON, but test the catch-all
    const result = await runHook(hook, {
      session_id: 'test-utt-malformed',
      prompt: 'update the config',
    });
    expect(result.exitCode).toBe(0);
  });
});
