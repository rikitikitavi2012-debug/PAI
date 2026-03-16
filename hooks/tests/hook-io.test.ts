import { describe, expect, test } from 'bun:test';
import { join } from 'path';

const WRAPPER_PATH = join(import.meta.dir, 'hook-io-wrapper.ts');

async function runWrapper(stdinData: string | null): Promise<{ stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', WRAPPER_PATH], {
    stdin: stdinData === null ? 'ignore' : new Blob([stdinData]),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

describe('hook-io', () => {
  test('readHookInput() correctly parses JSON from stdin', async () => {
    const input = {
      session_id: 'test-session',
      transcript_path: '/path/to/transcript.json',
      hook_event_name: 'test-event',
      last_assistant_message: 'hello'
    };
    const { stdout } = await runWrapper(JSON.stringify(input));
    const parsed = JSON.parse(stdout);
    expect(parsed).toEqual(input);
  });

  test('Empty stdin -> returns null', async () => {
    const { stdout } = await runWrapper('');
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeNull();
  });

  test('Invalid JSON -> returns null', async () => {
    const { stdout } = await runWrapper('{ invalid json ');
    // We parse the wrapper's stdout, which prints the result of `readHookInput()`
    // readHookInput should catch the parsing error and return null.
    // The wrapper logs `JSON.stringify(result ?? null)`
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeNull();
  });

  test('Timeout -> returns null', async () => {
    // If we pass 'pipe' to stdin and don't write anything, it will wait for the 500ms timeout
    const proc = Bun.spawn(['bun', WRAPPER_PATH], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // We intentionally don't write or close stdin immediately.
    // Wait for the process to exit naturally (due to 500ms timeout in readHookInput).
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    const parsed = JSON.parse(stdout.trim());
    expect(parsed).toBeNull();
  });

  test('All required fields (session_id, transcript_path) are present in the type', async () => {
    // This is purely a type-level check in TS, but we can verify it as a runtime check
    // to ensure the interface allows and requires these fields.
    // We import HookInput to ensure it satisfies our expectations.
    // However, interface checking is compile-time. We can assert that the keys exist in a mock object.

    // Using dynamic import to check types and properties.
    const { readHookInput } = await import('../lib/hook-io');

    // type check that session_id and transcript_path are required
    const mockInput: import('../lib/hook-io').HookInput = {
      session_id: '123',
      transcript_path: '/a/b/c',
      hook_event_name: 'event'
    };

    expect(mockInput.session_id).toBe('123');
    expect(mockInput.transcript_path).toBe('/a/b/c');
    expect(mockInput.hook_event_name).toBe('event');
  });
});
