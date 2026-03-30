import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('SkillGuard', () => {
  const hook = 'hooks/SkillGuard.hook.ts';

  test('blocks keybindings-help skill', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-001',
      tool_name: 'Skill',
      tool_input: { skill: 'keybindings-help' },
    });
    expect(result.exitCode).toBe(0);
    expect(result.json?.decision).toBe('block');
  });

  test('allows legitimate skills', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-002',
      tool_name: 'Skill',
      tool_input: { skill: 'commit' },
    });
    expect(result.exitCode).toBe(0);
    if (result.json) {
      expect(result.json.decision).not.toBe('block');
    }
  });

  test('case-insensitive blocking', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-003',
      tool_name: 'Skill',
      tool_input: { skill: 'Keybindings-Help' },
    });
    expect(result.exitCode).toBe(0);
    expect(result.json?.decision).toBe('block');
  });

  test('handles empty skill name gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-004',
      tool_name: 'Skill',
      tool_input: {},
    });
    expect(result.exitCode).toBe(0);
  });

  test('handles missing tool_input gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-005',
      tool_name: 'Skill',
    });
    expect(result.exitCode).toBe(0);
  });

  test('executes under 200ms', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sg-006',
      tool_name: 'Skill',
      tool_input: { skill: 'commit' },
    });
    expect(result.duration).toBeLessThan(200);
  });
});
