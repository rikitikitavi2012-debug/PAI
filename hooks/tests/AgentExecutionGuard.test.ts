import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('AgentExecutionGuard', () => {
  const hook = 'hooks/AgentExecutionGuard.hook.ts';

  test('valid input: run_in_background: true → exits 0 silently', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        run_in_background: true,
        subagent_type: 'Engineer',
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  test('valid input: FAST_AGENT_TYPES (Explore) → exits 0 silently', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        run_in_background: false,
        subagent_type: 'Explore',
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('valid input: FAST_MODELS (haiku) → exits 0 silently', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        model: 'haiku',
        subagent_type: 'Engineer',
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('valid input: FAST scope in prompt → exits 0 silently', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        prompt: '## Scope\nTiming: FAST\nDo things quickly',
        subagent_type: 'Engineer',
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('missing fields → exits 0 (fail-open)', async () => {
    // Missing fields leads to "unknown" type/description, which falls through to WARNING.
    // It is effectively fail-safe, returning exit 0 (does not block execution)
    const result = await runHook(hook, {});
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('WARNING: FOREGROUND AGENT DETECTED');
  });

  test('violation: non-fast agent without run_in_background → warns and exits 0', async () => {
    const result = await runHook(hook, {
      tool_name: 'Task',
      tool_input: {
        run_in_background: false,
        subagent_type: 'Engineer',
        description: 'Heavy refactor task',
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('<system-reminder>');
    expect(result.stdout).toContain('WARNING: FOREGROUND AGENT DETECTED');
    expect(result.stdout).toContain('Heavy refactor task');
  });
});
