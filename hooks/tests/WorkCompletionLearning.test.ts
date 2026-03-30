import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

describe('WorkCompletionLearning', () => {
  const hook = 'hooks/WorkCompletionLearning.hook.ts';
  let tempDir: string;
  let stateDir: string;
  let workDir: string;
  let learningDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-learning-');
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

  test('empty stdin/no current work → exits 0 without error', async () => {
    const result = await runHook(
      hook,
      {},
      { PAI_DIR: tempDir },
      1000
    );
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('No active work session');
  });

  test('valid session with significant work → creates learning', async () => {
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

    const result = await runHook(
      hook,
      { session_id: sessionId },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Created learning:');

    // Find the learning file category SYSTEM since "Build the API" usually routes there
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
    expect(learningContent).toContain('Build the API endpoints');
    expect(learningContent).toContain('**Files Changed:** 1');
    expect(learningContent).toContain('**ISC:** 2/2 criteria passing');
  });

  test('trivial session → skips learning capture and exits 0', async () => {
    const sessionId = 'test-learning-02';
    const sessionDirName = '20240101-120000_trivial-work';
    const workPath = join(workDir, sessionDirName);
    mkdirSync(workPath, { recursive: true });

    // Create State
    const stateFile = join(stateDir, `current-work-${sessionId}.json`);
    writeFileSync(stateFile, JSON.stringify({
      session_id: sessionId,
      session_dir: sessionDirName,
      task_count: 1
    }));

    // Create PRD Frontmatter with no files changed and task_count is 1
    const prdContent = `---
id: "${sessionDirName}"
title: "Answer quick question"
created_at: "2024-01-01T12:00:00Z"
completed_at: null
source: "AUTO"
status: "COMPLETED"
session_id: "${sessionId}"
lineage:
  tools_used: []
  files_changed: []
  agents_spawned: []
---
`;
    writeFileSync(join(workPath, 'PRD.md'), prdContent);

    const result = await runHook(
      hook,
      { session_id: sessionId },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Trivial work session, skipping learning capture');
  });
});
