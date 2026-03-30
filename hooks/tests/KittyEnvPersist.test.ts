import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('KittyEnvPersist', () => {
  const hook = 'hooks/KittyEnvPersist.hook.ts';

  test('runs without crash when Kitty not available (fail-open pattern)', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
    });

    expect(result.exitCode).toBe(0);
  });
});
