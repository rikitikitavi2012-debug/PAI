import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('IntegrityCheck', () => {
  const hook = 'hooks/IntegrityCheck.hook.ts';

  test('runs without error, exits 0', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
    });

    expect(result.exitCode).toBe(0);
  });
});
