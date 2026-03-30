import { test, expect, describe, afterAll } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('RelationshipMemory', () => {
  const hook = 'hooks/RelationshipMemory.hook.ts';
  let tempDir: string;

  afterAll(() => {
    if (tempDir) cleanupTempDir(tempDir);
  });

  test('runs without error, exits 0', async () => {
    const result = await runHook(hook, {
      session_id: 'test-session-123',
    });

    expect(result.exitCode).toBe(0);
  });

  test('with mock transcript', async () => {
    tempDir = createTempDir('pai-test-rel-');
    const mockTranscriptPath = join(tempDir, 'mock_transcript.json');

    // We just need any valid JSON or even unparseable text file to test the fallback behaviour
    // A simple mock for TranscriptParser to process (or fail safely on)
    writeFileSync(mockTranscriptPath, JSON.stringify({
      userPrompt: 'I prefer when you do this.',
      plainCompletion: 'SUMMARY: I learned a preference'
    }));

    const result = await runHook(hook, {
      session_id: 'test-session-123',
      transcript_path: mockTranscriptPath,
    });

    expect(result.exitCode).toBe(0);
  });
});
