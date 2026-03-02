import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('DocIntegrity', () => {
  const hook = 'hooks/DocIntegrity.hook.ts';

  test('runs without error, exits 0', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
    }, { PAI_DIR: '.' });

    expect(result.exitCode).toBe(0);
  });

  test('with mock input data', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
      transcript_path: 'mock/path/doesnt/exist.json',
    }, { PAI_DIR: '.' });

    expect(result.exitCode).toBe(0);
  });
});
