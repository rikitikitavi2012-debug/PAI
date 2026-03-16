import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('LearnGate edge cases', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'learn-gate-edge-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function runHook(input: any | string): any {
    const hookPath = join(process.cwd(), 'hooks/LearnGate.hook.ts');

    // Pass empty string for empty stdin
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    const result = Bun.spawnSync(['bun', hookPath], {
      stdin: new Blob([inputStr]),
    });

    const stdout = result.stdout.toString().trim();
    try {
      const jsonLines = stdout.split('\n').filter(l => l.startsWith('{'));
      if (jsonLines.length > 0) {
        return JSON.parse(jsonLines[jsonLines.length - 1]);
      }
      return { output: stdout };
    } catch {
      return { output: stdout };
    }
  }

  test('1. Edit PRD.md criteria text mentioning "phase: complete" (old_string does NOT start with "phase:")', () => {
    const filePath = join(tmpDir, 'MEMORY/WORK/PRD.md');
    const result = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: filePath,
        old_string: '- Make sure phase: execute is done',
        new_string: '- Make sure phase: complete is done'
      }
    });

    expect(result).toEqual({ continue: true });
  });

  test('2. Edit PRD.md with old_string="phase: execute" new_string="phase: verify"', () => {
    const filePath = join(tmpDir, 'MEMORY/WORK/PRD.md');
    const result = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: filePath,
        old_string: 'phase: execute',
        new_string: 'phase: verify'
      }
    });

    expect(result).toEqual({ continue: true });
  });

  test('3. Edit PRD.md with old_string="phase: learn" new_string="phase: complete" and LEARN.md is empty (0 bytes)', () => {
    const workDir = join(tmpDir, 'MEMORY/WORK');
    mkdirSync(workDir, { recursive: true });

    // Create empty LEARN.md
    writeFileSync(join(workDir, 'LEARN.md'), '');

    const filePath = join(workDir, 'PRD.md');
    const result = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: filePath,
        old_string: 'phase: learn',
        new_string: 'phase: complete'
      }
    });

    expect(result).toEqual({ continue: true });
  });

  test('4. Write PRD.md with no frontmatter at all', () => {
    const filePath = join(tmpDir, 'MEMORY/WORK/PRD.md');
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: filePath,
        content: '# This is just a PRD\n\nNo frontmatter here.'
      }
    });

    expect(result).toEqual({ continue: true });
  });

  test('5. Empty stdin', () => {
    const result = runHook('');
    expect(result).toEqual({ continue: true });
  });
});
