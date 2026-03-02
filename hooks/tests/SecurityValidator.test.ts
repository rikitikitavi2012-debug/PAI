import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('SecurityValidator', () => {
  const hook = 'hooks/SecurityValidator.hook.ts';

  // ── Safe commands (should be allowed) ──

  test('allows safe bash commands', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-001',
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
      hook_event_name: 'PreToolUse',
    });
    expect(result.exitCode).toBe(0);
    // Should output { continue: true } or no block
    if (result.json) {
      expect(result.json.decision).not.toBe('block');
    }
  });

  test('allows git status', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-002',
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
      hook_event_name: 'PreToolUse',
    });
    expect(result.exitCode).toBe(0);
  });

  test('allows reading normal files', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-003',
      tool_name: 'Read',
      tool_input: { file_path: '/home/ser/.claude/CLAUDE.md' },
      hook_event_name: 'PreToolUse',
    });
    expect(result.exitCode).toBe(0);
  });

  // ── Dangerous commands (should be blocked or require confirmation) ──

  test('blocks rm -rf /', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-010',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
      hook_event_name: 'PreToolUse',
    });
    // Should either exit 2 (hard block) or return decision: block/ask
    const isBlocked = result.exitCode === 2 ||
      result.json?.decision === 'block' ||
      result.json?.decision === 'ask';
    expect(isBlocked).toBe(true);
  });

  test('blocks reading SSH keys', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-011',
      tool_name: 'Read',
      tool_input: { file_path: `${process.env.HOME}/.ssh/id_rsa` },
      hook_event_name: 'PreToolUse',
    });
    // SSH keys should be in zeroAccess
    const isBlocked = result.exitCode === 2 ||
      result.json?.decision === 'block' ||
      result.json?.decision === 'ask';
    expect(isBlocked).toBe(true);
  });

  test('flags git push --force for confirmation', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-012',
      tool_name: 'Bash',
      tool_input: { command: 'git push --force origin main' },
      hook_event_name: 'PreToolUse',
    });
    // Force push should require confirmation
    const needsConfirm = result.json?.decision === 'ask' ||
      result.json?.decision === 'block' ||
      result.exitCode === 2;
    expect(needsConfirm).toBe(true);
  });

  // ── Edge cases ──

  test('handles malformed input gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-020',
      // Missing tool_name and tool_input
    });
    // Should not crash — fail-open
    expect(result.exitCode).toBe(0);
  });

  test('executes under 500ms for safe commands', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-021',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
      hook_event_name: 'PreToolUse',
    });
    // Bun subprocess startup adds ~250ms overhead
    expect(result.duration).toBeLessThan(500);
  });
});
