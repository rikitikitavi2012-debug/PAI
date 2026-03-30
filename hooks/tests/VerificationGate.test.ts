import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('VerificationGate', () => {
  const hook = 'hooks/VerificationGate.hook.ts';
  let tempDir: string;
  let memWorkDir: string;
  let prdPath: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-verification-gate-');
    memWorkDir = join(tempDir, 'MEMORY', 'WORK');
    mkdirSync(memWorkDir, { recursive: true });
    prdPath = join(memWorkDir, 'PRD.md');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  function makeStdin(toolName: string, toolInput: any) {
    return {
      tool_name: toolName,
      tool_input: toolInput
    };
  }

  test('allows operations on non-PRD files', async () => {
    const result = await runHook(hook, makeStdin('Edit', {
      file_path: join(memWorkDir, 'Other.md'),
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('allows operations outside MEMORY/WORK', async () => {
    const result = await runHook(hook, makeStdin('Edit', {
      file_path: join(tempDir, 'PRD.md'),
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('allows operations not setting phase: complete', async () => {
    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: 'phase: execute',
      new_string: 'phase: verify'
    }), { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Write: blocks if no Verification section', async () => {
    const content = `---
phase: complete
---
# PRD
No verification here.
`;
    const result = await runHook(hook, makeStdin('Write', {
      file_path: prdPath,
      content
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.json?.hookSpecificOutput?.permissionDecisionReason).toContain('PRD не содержит секцию ## Verification');
  });

  test('Write: blocks if Verification section has no checked items', async () => {
    const content = `---
phase: complete
---
# PRD

## Verification
- [ ] Task 1
- Task 2
`;
    const result = await runHook(hook, makeStdin('Write', {
      file_path: prdPath,
      content
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.json?.hookSpecificOutput?.permissionDecisionReason).toContain('пуста или ничего не отмечено');
  });

  test('Write: allows if Verification section has checked item', async () => {
    const content = `---
phase: complete
---
# PRD

## Verification
- [x] Evidence 1
- [ ] Evidence 2
`;
    const result = await runHook(hook, makeStdin('Write', {
      file_path: prdPath,
      content
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Edit: blocks if Verification section has no checked items', async () => {
    const initialContent = `---
phase: execute
---
# PRD

## Verification
- [ ] Evidence 1
`;
    writeFileSync(prdPath, initialContent);

    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.json?.hookSpecificOutput?.permissionDecisionReason).toContain('пуста или ничего не отмечено');
  });

  test('Edit: allows if Verification section has checked item', async () => {
    const initialContent = `---
phase: execute
---
# PRD

## Verification
- [x] Evidence 1
`;
    writeFileSync(prdPath, initialContent);

    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Edit: allows when editing to add checked item and phase complete at once', async () => {
    const initialContent = `---
phase: execute
---
# PRD

## Verification
- [ ] Evidence 1
`;
    writeFileSync(prdPath, initialContent);

    const newContent = `---
phase: complete
---
# PRD

## Verification
- [X] Evidence 1
`;

    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: initialContent,
      new_string: newContent
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({ continue: true });
  });

  test('Edit: malformed PRD without frontmatter but phase complete transition', async () => {
    const initialContent = `phase: execute\n\n## Verification\n- [ ] test\n`;
    writeFileSync(prdPath, initialContent);

    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.json?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  test('handles file reading failure gracefully for Edit', async () => {
    // PRD doesn't exist, we send an Edit. Since Edit requires file reading,
    // readFileSync will throw.
    const result = await runHook(hook, makeStdin('Edit', {
      file_path: prdPath,
      old_string: 'phase: execute',
      new_string: 'phase: complete'
    }), { PAI_DIR: tempDir });

    // It should block because prdContent will be empty/malformed after failed read
    expect(result.exitCode).toBe(0);
    expect(result.json?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.json?.hookSpecificOutput?.permissionDecisionReason).toContain('PRD не содержит секцию ## Verification');
  });
});
