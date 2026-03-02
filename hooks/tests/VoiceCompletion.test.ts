import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('VoiceCompletion', () => {
  const hook = 'hooks/VoiceCompletion.hook.ts';

  test('skips voice for subagent sessions', async () => {
    // harness sets CLAUDE_CODE_AGENT_TASK_ID='test-harness' by default
    const result = await runHook(hook, {
      session_id: 'test-vc-001',
      transcript: [
        { role: 'assistant', content: 'Navi: задача выполнена' },
      ],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('not main session');
  });

  test('handles empty input gracefully', async () => {
    const result = await runHook(hook, {});
    expect(result.exitCode).toBe(0);
  });

  test('handles missing transcript gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-vc-003',
    });
    expect(result.exitCode).toBe(0);
  });

  test('executes under 500ms', async () => {
    const result = await runHook(hook, {
      session_id: 'test-vc-004',
      transcript: [],
    });
    expect(result.duration).toBeLessThan(500);
  });
});
