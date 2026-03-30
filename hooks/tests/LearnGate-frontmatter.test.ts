import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('LearnGate.hook.ts - Frontmatter Parsing', () => {
  let tmpDir: string;
  let workDir: string;
  let prdPath: string;

  beforeEach(() => {
    tmpDir = createTempDir('learngate-');
    // LearnGate checks for 'MEMORY/WORK/' in the path
    workDir = join(tmpDir, 'MEMORY', 'WORK', 'test-session');
    mkdirSync(workDir, { recursive: true });
    prdPath = join(workDir, 'PRD.md');
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  test('Write tool with valid frontmatter containing "phase: complete" -> blocked', async () => {
    const input = {
      tool_name: 'Write',
      tool_input: {
        file_path: prdPath,
        content: '---\nphase: complete\n---\nBody content',
      },
    };

    const res = await runHook('hooks/LearnGate.hook.ts', input, { PAI_DIR: process.cwd() });

    expect(res.exitCode).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.decision).toBe('block');
    expect(res.json.reason).toContain('LEARN phase requires persistence');
  });

  test('Write tool with frontmatter containing "phase: Complete" (mixed case) -> blocked', async () => {
    const input = {
      tool_name: 'Write',
      tool_input: {
        file_path: prdPath,
        content: '---\nphase: Complete\n---\nBody content',
      },
    };

    const res = await runHook('hooks/LearnGate.hook.ts', input, { PAI_DIR: process.cwd() });

    expect(res.exitCode).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.decision).toBe('block');
    expect(res.json.reason).toContain('LEARN phase requires persistence');
  });

  test('Write tool with phase in body but NOT in frontmatter -> NOT blocked', async () => {
    const input = {
      tool_name: 'Write',
      tool_input: {
        file_path: prdPath,
        content: 'This is the body content.\nPhase: complete\nLet\'s talk about phase complete.',
      },
    };

    const res = await runHook('hooks/LearnGate.hook.ts', input, { PAI_DIR: process.cwd() });

    expect(res.exitCode).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.continue).toBe(true);
    expect(res.json.decision).toBeUndefined();
  });

  test('Write tool with multiple "---" separators -> only checks first block', async () => {
    // Here frontmatter phase is 'execute', but body has horizontal rule and 'phase: complete'
    const input = {
      tool_name: 'Write',
      tool_input: {
        file_path: prdPath,
        content: '---\nphase: execute\n---\nSome text\n---\nphase: complete\n---',
      },
    };

    const res = await runHook('hooks/LearnGate.hook.ts', input, { PAI_DIR: process.cwd() });

    expect(res.exitCode).toBe(0);
    expect(res.json).not.toBeNull();
    expect(res.json.continue).toBe(true);
    expect(res.json.decision).toBeUndefined();
  });
});
