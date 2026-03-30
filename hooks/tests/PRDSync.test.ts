import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';
import { join } from 'path';

describe('PRDSync', () => {
  const hook = 'hooks/PRDSync.hook.ts';

  test('ignores non-PRD file paths', async () => {
    const result = await runHook(hook, {
      session_id: 'test-prd-001',
      tool_name: 'Write',
      tool_input: { file_path: '/home/ser/.claude/README.md' },
      hook_event_name: 'PostToolUse',
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('ignores PRD outside MEMORY/WORK/', async () => {
    const result = await runHook(hook, {
      session_id: 'test-prd-002',
      tool_name: 'Edit',
      tool_input: { file_path: '/tmp/PRD.md' },
      hook_event_name: 'PostToolUse',
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('processes valid PRD.md in MEMORY/WORK/', async () => {
    // Use an actual existing PRD
    const prdPath = join(process.env.HOME!, '.claude', 'MEMORY', 'WORK', '20260302-feedback-loop', 'PRD.md');

    const result = await runHook(hook, {
      session_id: 'test-prd-003',
      tool_name: 'Write',
      tool_input: { file_path: prdPath },
      hook_event_name: 'PostToolUse',
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
    // Should process without errors
    expect(result.stderr).not.toContain('Error');
  });

  test('outputs continue: true always', async () => {
    const result = await runHook(hook, {
      session_id: 'test-prd-004',
      tool_name: 'Write',
      tool_input: { file_path: '/nonexistent/PRD.md' },
      hook_event_name: 'PostToolUse',
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
  });

  test('executes under 500ms', async () => {
    const result = await runHook(hook, {
      session_id: 'test-prd-005',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/PRD.md' },
      hook_event_name: 'PostToolUse',
    });
    expect(result.duration).toBeLessThan(500);
  });
});
