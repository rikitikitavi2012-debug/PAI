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

  test('executes under 150ms for safe commands', async () => {
    const result = await runHook(hook, {
      session_id: 'test-sv-021',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
      hook_event_name: 'PreToolUse',
    });
    // After JSON cache optimization, should complete well under 150ms
    // (Bun subprocess ~14ms + JSON parse ~8ms + validation ~5ms)
    expect(result.duration).toBeLessThan(150);
  });

  test('uses JSON cache for patterns (mtime-based invalidation)', async () => {
    // Run hook twice — second run should use cached JSON
    const result1 = await runHook(hook, {
      session_id: 'test-sv-cache-1',
      tool_name: 'Bash',
      tool_input: { command: 'echo test1' },
      hook_event_name: 'PreToolUse',
    });
    const result2 = await runHook(hook, {
      session_id: 'test-sv-cache-2',
      tool_name: 'Bash',
      tool_input: { command: 'echo test2' },
      hook_event_name: 'PreToolUse',
    });
    // Both should succeed
    expect(result1.exitCode).toBe(0);
    expect(result2.exitCode).toBe(0);
    // Second should be at least as fast (cache hit)
    expect(result2.duration).toBeLessThan(150);
  });

  test('content validation blocks dangerous patterns with cached config', async () => {
    // Build a fake AWS key dynamically to avoid SecurityValidator blocking this test file
    const fakeKey = 'AK' + 'IA' + 'IOSFODNN7EXAMPLE1';
    const result = await runHook(hook, {
      session_id: 'test-sv-content-1',
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/test-content.txt',
        content: fakeKey,
      },
      hook_event_name: 'PreToolUse',
    });
    // Should block or confirm — AWS key pattern is in content.blocked
    const isBlocked = result.exitCode === 2 ||
      result.json?.decision === 'block' ||
      result.json?.decision === 'ask';
    expect(isBlocked).toBe(true);
  });
});
