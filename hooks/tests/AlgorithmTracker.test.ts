import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('AlgorithmTracker', () => {
  const hook = 'hooks/AlgorithmTracker.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-tracker-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('Bash tool detects phase transition', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-tracker-01',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"вхожу в фазу планирования"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    // AlgorithmTracker expects JSON on stdout containing {"continue": true} at minimum
    expect(result.stdout).toContain('"continue":true');
    expect(result.stderr).toContain('phase: PLAN');

    // Verify state was written
    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-01.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.currentPhase).toBe('PLAN');
  });

  test('TaskCreate tool detects criterion creation', async () => {
    const result = await runHook(
      hook,
      {
        session_id: 'test-tracker-02',
        tool_name: 'TaskCreate',
        tool_input: { subject: 'ISC-C1: Basic implementation' },
        tool_result: 'Task #100 created successfully',
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-02.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.criteria.length).toBe(1);
    expect(stateData.criteria[0].id).toBe('C1');
    expect(stateData.criteria[0].taskId).toBe('100');
  });

  test('TaskUpdate tool updates criterion status', async () => {
    // First setup the criteria
    await runHook(
      hook,
      {
        session_id: 'test-tracker-03',
        tool_name: 'TaskCreate',
        tool_input: { subject: 'ISC-C2: DB Schema' },
        tool_result: 'Task #101 created successfully',
      },
      { PAI_DIR: tempDir }
    );

    // Now update its status
    const result = await runHook(
      hook,
      {
        session_id: 'test-tracker-03',
        tool_name: 'TaskUpdate',
        tool_input: { taskId: '101', status: 'completed' },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-03.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.criteria.length).toBe(1);
    expect(stateData.criteria[0].status).toBe('completed');
  });

  test('Bash tool detects Autoresearch sub-phase during EXECUTE', async () => {
    // First enter EXECUTE phase
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-01',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the execute phase"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    // Now announce a sub-phase
    const result = await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-01',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"autoresearch review"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('subPhase: REVIEW');

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-sub-01.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.currentPhase).toBe('EXECUTE');
    expect(stateData.subPhase).toBe('REVIEW');
  });

  test('Autoresearch sub-phase transitions update subPhase field', async () => {
    // Enter EXECUTE
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-02',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the execute phase"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    // Announce IDEATE sub-phase
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-02',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"autoresearch ideate"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    // Transition to MODIFY sub-phase
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-02',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"autoresearch modify"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-sub-02.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.currentPhase).toBe('EXECUTE');
    expect(stateData.subPhase).toBe('MODIFY');
  });

  test('Sub-phase is cleared on main phase transition', async () => {
    // Enter EXECUTE with sub-phase
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-03',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the execute phase"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-03',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"autoresearch verify"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    // Verify sub-phase is set
    let stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-sub-03.json');
    let stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.subPhase).toBe('VERIFY');

    // Transition to main VERIFY phase — subPhase should be cleared
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-03',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the verify phase"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.currentPhase).toBe('VERIFY');
    expect(stateData.subPhase).toBeUndefined();
  });

  test('All 8 Autoresearch sub-phases are recognized', async () => {
    const subPhases = ['review', 'ideate', 'modify', 'commit', 'verify', 'decide', 'log', 'repeat'];

    // Enter EXECUTE
    await runHook(
      hook,
      {
        session_id: 'test-tracker-sub-04',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the execute phase"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    for (const sp of subPhases) {
      await runHook(
        hook,
        {
          session_id: 'test-tracker-sub-04',
          tool_name: 'Bash',
          tool_input: {
            command: `curl -d '{"message":"autoresearch ${sp}"}' localhost:8888/notify`,
          },
        },
        { PAI_DIR: tempDir }
      );

      const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-sub-04.json');
      const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
      expect(stateData.subPhase).toBe(sp.toUpperCase());
      expect(stateData.currentPhase).toBe('EXECUTE');
    }
  });

  test('Task tool tracks agent spawning', async () => {
    // Need to initialize state first, because agentAdd requires existing state
    await runHook(
      hook,
      {
        session_id: 'test-tracker-04',
        tool_name: 'Bash',
        tool_input: {
          command: 'curl -d \'{"message":"entering the pai algorithm"}\' localhost:8888/notify',
        },
      },
      { PAI_DIR: tempDir }
    );

    const result = await runHook(
      hook,
      {
        session_id: 'test-tracker-04',
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'Engineer',
          description: 'Refactor math.js',
        },
      },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'algorithms', 'test-tracker-04.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(stateData.agents.length).toBe(1);
    expect(stateData.agents[0].agentType).toBe('Engineer');
    expect(stateData.agents[0].task).toBe('Refactor math.js');
  });
});
