import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';

describe('AutoSkillProposal', () => {
  const hook = 'hooks/AutoSkillProposal.hook.ts';
  let tempDir: string;
  let stateDir: string;
  let toolsDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-skill-proposal-');
    stateDir = join(tempDir, 'MEMORY', 'STATE');
    toolsDir = join(tempDir, 'PAI', 'Tools');

    mkdirSync(stateDir, { recursive: true });
    mkdirSync(toolsDir, { recursive: true });
    mkdirSync(join(tempDir, 'skills', 'auto'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('skips if no last_assistant_message is present', async () => {
    const result = await runHook(hook, {
      session_id: 'test-asp-001',
      // No last_assistant_message
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('[AutoSkillProposal] No last_assistant_message, skipping');
  });

  test('skips if complexity threshold (< 8 tool calls) is not met', async () => {
    // 3 tool calls / phase markers
    const message = `
      ━━━ THINK
      Read(file1.txt)
      Edit(file2.txt)
    `;
    const result = await runHook(hook, {
      session_id: 'test-asp-002',
      last_assistant_message: message,
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('[AutoSkillProposal] Session too simple');
    expect(result.stderr).toContain('skipping');
  });

  test('skips if rate limit is reached (already proposed this session)', async () => {
    // 8+ tool calls / phase markers
    const message = `
      ━━━ THINK
      Read(file1.txt)
      Edit(file2.txt)
      ━━━ PLAN
      Read(file3.txt)
      Edit(file4.txt)
      ━━━ EXECUTE
      Read(file5.txt)
      Bash(echo test)
      Bash(echo test2)
      Bash(echo test3)
      Bash(echo test4)
      Bash(echo test5)
      Bash(echo test6)
      Bash(echo test7)
      Bash(echo test8)
    `;

    // Write proposal state file
    const statePath = join(stateDir, 'skill-proposal-state.json');
    writeFileSync(statePath, JSON.stringify({
      lastProposalSession: 'test-asp-003',
      lastProposalTime: new Date().toISOString()
    }));

    const result = await runHook(hook, {
      session_id: 'test-asp-003',
      last_assistant_message: message,
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('[AutoSkillProposal] Already proposed this session, skipping');
  });

  test('handles no pattern found gracefully', async () => {
    // 8+ tool calls
    const message = `
      ━━━ THINK
      Read(file1.txt)
      Edit(file2.txt)
      ━━━ PLAN
      Read(file3.txt)
      Edit(file4.txt)
      ━━━ EXECUTE
      Read(file5.txt)
      Bash(echo test)
      Bash(echo test2)
      Bash(echo test3)
      Bash(echo test4)
      Bash(echo test5)
      Bash(echo test6)
      Bash(echo test7)
      Bash(echo test8)
      Bash(echo test9)
      Bash(echo test10)
    `;

    // Mock Inference.ts to output no pattern
    const inferencePath = join(toolsDir, 'Inference.ts');
    writeFileSync(inferencePath, `
      console.log(JSON.stringify({ pattern_found: false }));
    `);

    const result = await runHook(hook, {
      session_id: 'test-asp-004',
      last_assistant_message: message,
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('[AutoSkillProposal] No reusable pattern found');
  });

  test('detects pattern and outputs AskUserQuestion', async () => {
    // 8+ tool calls
    const message = `
      ━━━ THINK
      Read(file1.txt)
      Edit(file2.txt)
      ━━━ PLAN
      Read(file3.txt)
      Edit(file4.txt)
      ━━━ EXECUTE
      Read(file5.txt)
      Bash(echo test)
      Bash(echo test2)
      Bash(echo test3)
      Bash(echo test4)
      Bash(echo test5)
      Bash(echo test6)
      Bash(echo test7)
      Bash(echo test8)
      Bash(echo test9)
      Bash(echo test10)
    `;

    // Mock Inference.ts to output a valid proposal
    const inferencePath = join(toolsDir, 'Inference.ts');
    writeFileSync(inferencePath, `
      console.log(JSON.stringify({
        pattern_found: true,
        name: "test-skill",
        description: "Test description",
        trigger_phrases: ["test phrase"],
        usage: "Test usage",
        pattern: "Test pattern"
      }));
    `);

    const result = await runHook(hook, {
      session_id: 'test-asp-005',
      last_assistant_message: message,
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    // Check that skill was created directly (no AskUserQuestion anymore)
    const skillPath = join(tempDir, 'skills', 'auto', 'test-skill', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(true);

    // Check skill content
    const skillContent = readFileSync(skillPath, 'utf-8');
    expect(skillContent).toContain('Test Description');
    expect(skillContent).toContain('test phrase');
    expect(skillContent).toContain('Auto-generated by AutoSkillProposal');

    // Check that hook logged the creation
    expect(result.stderr).toContain('[AutoSkillProposal] Created skill');
  });

});
