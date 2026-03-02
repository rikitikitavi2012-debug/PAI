import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, symlinkSync } from 'fs';

describe('SetQuestionTab', () => {
  const hook = 'hooks/SetQuestionTab.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-question-tab-');

    symlinkSync(join(process.cwd(), 'hooks'), join(tempDir, 'hooks'));
    symlinkSync(join(process.cwd(), 'PAI'), join(tempDir, 'PAI'));

    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('runs without crash when Kitty not available', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-session',
        tool_input: {
          questions: [
            { header: 'Verify', question: 'Does this work?' }
          ]
        }
      },
      { PAI_DIR: tempDir, KITTY_LISTEN_ON: '' }
    );
    expect(result.exitCode).toBe(0);
  });

  test('runs with mock question in tool_input', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-session',
        tool_input: {
          questions: [
            { question: 'What is the root cause of this?' }
          ]
        }
      },
      { PAI_DIR: tempDir }
    );
    expect(result.exitCode).toBe(0);
  });
});
