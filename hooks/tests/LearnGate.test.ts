import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('LearnGate Hook', () => {
  const hook = 'hooks/LearnGate.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('learn-gate-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('Edit PRD.md with phase:complete and NO LEARN.md → returns {decision:"block"}', async () => {
    const prdPath = join(tempDir, 'MEMORY/WORK/test-session/PRD.md');

    const result = await runHook(
      hook,
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: prdPath,
          old_string: 'phase: verify',
          new_string: 'phase: complete',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({
      decision: 'block',
      reason: expect.stringContaining('LEARN phase requires persistence: write LEARN.md')
    });
  });

  test('Edit PRD.md with phase:complete and LEARN.md exists → returns {continue:true}', async () => {
    const sessionDir = join(tempDir, 'MEMORY/WORK/test-session');
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, 'LEARN.md'), '# Reflections\n');

    const prdPath = join(sessionDir, 'PRD.md');

    const result = await runHook(
      hook,
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: prdPath,
          old_string: 'phase: learn',
          new_string: 'phase: complete',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Edit non-PRD file with phase:complete → returns {continue:true}', async () => {
    const filePath = join(tempDir, 'MEMORY/WORK/test-session/other.md');

    const result = await runHook(
      hook,
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: filePath,
          old_string: 'phase: verify',
          new_string: 'phase: complete',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Write PRD.md with phase:complete in frontmatter and no LEARN.md → returns {decision:"block"}', async () => {
    const prdPath = join(tempDir, 'MEMORY/WORK/test-session/PRD.md');

    const result = await runHook(
      hook,
      {
        tool_name: 'Write',
        tool_input: {
          file_path: prdPath,
          content: '---\nphase: complete\n---\n# Content',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({
      decision: 'block',
      reason: expect.stringContaining('LEARN phase requires persistence: write LEARN.md')
    });
  });
});
