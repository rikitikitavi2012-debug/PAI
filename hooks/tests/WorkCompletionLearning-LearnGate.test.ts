import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

describe('WorkCompletionLearning vs LearnGate Isolation', () => {
  let tempDir: string;
  let stateDir: string;
  let workDir: string;
  let learningDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-learning-isolation-');
    stateDir = join(tempDir, 'MEMORY', 'STATE');
    workDir = join(tempDir, 'MEMORY', 'WORK');
    learningDir = join(tempDir, 'MEMORY', 'LEARNING');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(workDir, { recursive: true });
    mkdirSync(learningDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('WorkCompletionLearning writes to MEMORY/LEARNING/ (its own directory)', async () => {
    const sessionId = 'test-learning-01';
    const sessionDirName = '20240101-120000_significant-work';
    const workPath = join(workDir, sessionDirName);
    mkdirSync(workPath, { recursive: true });

    // Create State
    const stateFile = join(stateDir, `current-work-${sessionId}.json`);
    writeFileSync(stateFile, JSON.stringify({
      session_id: sessionId,
      session_dir: sessionDirName,
      task_count: 2
    }));

    // Create PRD Frontmatter
    const prdContent = `---
id: "${sessionDirName}"
title: "Build the API endpoints"
created_at: "2024-01-01T12:00:00Z"
completed_at: null
source: "AUTO"
status: "COMPLETED"
session_id: "${sessionId}"
lineage:
  tools_used:
    - Task
  files_changed:
    - server.js
  agents_spawned:
    - Engineer
---

## IDEAL STATE CRITERIA
- [x] Create API endpoint
- [x] Add tests
`;
    writeFileSync(join(workPath, 'PRD.md'), prdContent);

    // Set PAI_DIR in env so process.env.PAI_DIR is picked up by both harness and hook
    process.env.PAI_DIR = tempDir;

    const result = await runHook(
      'hooks/WorkCompletionLearning.hook.ts',
      { session_id: sessionId }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Created learning:');

    // Find the learning file
    const systemMonthDir = join(learningDir, 'SYSTEM', new Date().toISOString().slice(0, 7));
    const algoMonthDir = join(learningDir, 'ALGORITHM', new Date().toISOString().slice(0, 7));

    let learningFile = '';
    if (existsSync(systemMonthDir)) {
      const files = readdirSync(systemMonthDir);
      if (files.length > 0) learningFile = join(systemMonthDir, files[0]);
    }
    if (!learningFile && existsSync(algoMonthDir)) {
       const files = readdirSync(algoMonthDir);
       if (files.length > 0) learningFile = join(algoMonthDir, files[0]);
    }

    expect(learningFile).toBeTruthy();

    const learningContent = readFileSync(learningFile, 'utf-8');
    expect(learningContent).toContain('# Work Completion Learning');
    expect(learningContent).not.toContain('## Reflections'); // Output format is different from LEARN.md template
  });

  test('LearnGate checks for LEARN.md in MEMORY/WORK/{slug}/ (different directory)', async () => {
    const sessionDirName = 'test-learning-gate-01';
    const workPath = join(workDir, sessionDirName);
    mkdirSync(workPath, { recursive: true });

    const prdPath = join(workPath, 'PRD.md');
    writeFileSync(prdPath, '---\nphase: verify\n---');

    // Set PAI_DIR in env so process.env.PAI_DIR is picked up by both harness and hook
    process.env.PAI_DIR = tempDir;

    const result = await runHook(
      'hooks/LearnGate.hook.ts',
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: prdPath,
          old_string: 'phase: verify',
          new_string: 'phase: complete'
        }
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.json).toBeTruthy();
    expect(result.json.decision).toBe('block');
    expect(result.json.reason).toContain('LEARN phase requires persistence: write LEARN.md to');
  });

  test('Both can fire in the same session without conflict', async () => {
    const sessionId = 'test-learning-02';
    const sessionDirName = '20240101-120000_both-fire';
    const workPath = join(workDir, sessionDirName);
    mkdirSync(workPath, { recursive: true });

    // Create State for WorkCompletionLearning
    const stateFile = join(stateDir, `current-work-${sessionId}.json`);
    writeFileSync(stateFile, JSON.stringify({
      session_id: sessionId,
      session_dir: sessionDirName,
      task_count: 2
    }));

    // Create PRD Frontmatter
    const prdContent = `---
id: "${sessionDirName}"
title: "Build another feature"
created_at: "2024-01-01T12:00:00Z"
completed_at: null
source: "AUTO"
status: "COMPLETED"
session_id: "${sessionId}"
lineage:
  tools_used:
    - Task
  files_changed:
    - client.js
  agents_spawned:
    - Engineer
---
`;
    const prdPath = join(workPath, 'PRD.md');
    writeFileSync(prdPath, prdContent);

    process.env.PAI_DIR = tempDir;

    // 1. Run WorkCompletionLearning
    const learningResult = await runHook(
      'hooks/WorkCompletionLearning.hook.ts',
      { session_id: sessionId }
    );
    expect(learningResult.exitCode).toBe(0);

    // Verify it generated a file in MEMORY/LEARNING/
    const systemMonthDir = join(learningDir, 'SYSTEM', new Date().toISOString().slice(0, 7));
    const algoMonthDir = join(learningDir, 'ALGORITHM', new Date().toISOString().slice(0, 7));

    let learningFile = '';
    if (existsSync(systemMonthDir)) {
      const files = readdirSync(systemMonthDir);
      if (files.length > 0) learningFile = join(systemMonthDir, files[0]);
    }
    if (!learningFile && existsSync(algoMonthDir)) {
       const files = readdirSync(algoMonthDir);
       if (files.length > 0) learningFile = join(algoMonthDir, files[0]);
    }
    expect(learningFile).toBeTruthy();

    // 2. Run LearnGate to set phase complete
    const gateResultBlocked = await runHook(
      'hooks/LearnGate.hook.ts',
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: prdPath,
          old_string: 'phase: verify',
          new_string: 'phase: complete'
        }
      }
    );

    // It STILL blocks because WorkCompletionLearning's output doesn't satisfy LearnGate
    expect(gateResultBlocked.exitCode).toBe(0);
    expect(gateResultBlocked.json).toBeTruthy();
    expect(gateResultBlocked.json.decision).toBe('block');

    // 3. Manually satisfy LearnGate by creating LEARN.md in the work directory
    writeFileSync(join(workPath, 'LEARN.md'), '## Reflections\n...');

    const gateResultAllowed = await runHook(
      'hooks/LearnGate.hook.ts',
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: prdPath,
          old_string: 'phase: verify',
          new_string: 'phase: complete'
        }
      }
    );

    // Now it allows continuation
    expect(gateResultAllowed.exitCode).toBe(0);
    expect(gateResultAllowed.json).toBeTruthy();
    expect(gateResultAllowed.json.continue).toBe(true);
  });
});
