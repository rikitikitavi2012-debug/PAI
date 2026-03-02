import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, symlinkSync } from 'fs';

describe('ResponseTabReset', () => {
  const hook = 'hooks/ResponseTabReset.hook.ts';
  let tempDir: string;
  let transcriptPath: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-response-tab-');

    symlinkSync(join(process.cwd(), 'hooks'), join(tempDir, 'hooks'));
    symlinkSync(join(process.cwd(), 'PAI'), join(tempDir, 'PAI'));

    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });

    // Create a dummy transcript
    transcriptPath = join(tempDir, 'MEMORY', 'STATE', 'test-transcript.json');
    const mockTranscript = {
      messages: [
        { role: 'user', text: 'Hello' },
        { role: 'assistant', text: 'Hi' }
      ]
    };
    writeFileSync(transcriptPath, JSON.stringify(mockTranscript), 'utf-8');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('runs without error when Kitty not available (fail-open)', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-session',
        transcript_path: transcriptPath,
        hook_event_name: 'Stop'
      },
      { PAI_DIR: tempDir, KITTY_LISTEN_ON: '' }
    );
    expect(result.exitCode).toBe(0);
  });

  test('runs with mock transcript input without error', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-session',
        transcript_path: transcriptPath,
        hook_event_name: 'Stop'
      },
      { PAI_DIR: tempDir }
    );
    expect(result.exitCode).toBe(0);
  });
});
