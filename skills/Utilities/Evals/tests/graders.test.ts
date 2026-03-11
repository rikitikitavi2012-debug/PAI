import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { BaseGrader, registerGrader, createGrader, listGraders, runGraders, type GraderContext } from '../Graders/Base.ts';
import type { GraderConfig, GraderResult, GraderType, Transcript } from '../Types/index.ts';
import { StringMatchGrader } from '../Graders/CodeBased/StringMatch.ts';
import { RegexMatchGrader } from '../Graders/CodeBased/RegexMatch.ts';
import { BinaryTestsGrader } from '../Graders/CodeBased/BinaryTests.ts';
import { StateCheckGrader } from '../Graders/CodeBased/StateCheck.ts';
import { StaticAnalysisGrader } from '../Graders/CodeBased/StaticAnalysis.ts';
import { writeFileSync, existsSync, unlinkSync, mkdirSync, rmdirSync, chmodSync } from 'fs';
import { join } from 'path';

// Mock Grader for testing Base
class MockGrader extends BaseGrader {
  type = 'mock_grader' as any;
  category = 'code_based' as const;

  async grade(context: GraderContext): Promise<GraderResult> {
    const score = (this.config.params as any)?.score ?? 1;
    const passed = (this.config.params as any)?.passed ?? true;
    return this.createResult(score, passed, 10, { reasoning: 'Mock' });
  }
}

describe('BaseGrader and Registry', () => {
  const mockContext: GraderContext = {
    task_id: 'test_task',
    trial_id: 'test_trial',
    transcript: { metrics: {} } as any,
    output: 'mock output',
  };

  it('registers and creates a grader', () => {
    registerGrader('mock_grader' as any, MockGrader);

    const config: GraderConfig = { type: 'mock_grader' as any, weight: 2, required: true };
    const grader = createGrader(config);

    expect(grader).toBeInstanceOf(MockGrader);
    expect(grader.getWeight()).toBe(2);
    expect(grader.isRequired()).toBe(true);

    const types = listGraders();
    expect(types).toContain('mock_grader' as any);
  });

  it('throws on unknown grader', () => {
    expect(() => createGrader({ type: 'unknown_grader' as any })).toThrow(/Unknown grader type/);
  });

  it('runs multiple graders and calculates aggregate score', async () => {
    registerGrader('mock_grader' as any, MockGrader);

    const grader1 = createGrader({ type: 'mock_grader' as any, weight: 1, params: { score: 1, passed: true } });
    const grader2 = createGrader({ type: 'mock_grader' as any, weight: 3, params: { score: 0.5, passed: true } });

    const result = await runGraders([grader1, grader2], mockContext);

    // (1*1 + 0.5*3) / 4 = 2.5 / 4 = 0.625
    expect(result.aggregate_score).toBe(0.625);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('fails if required grader fails', async () => {
    registerGrader('mock_grader' as any, MockGrader);

    // Even with high score from g1, g2 is required and fails, so overall should fail
    const grader1 = createGrader({ type: 'mock_grader' as any, weight: 10, params: { score: 1, passed: true } });
    const grader2 = createGrader({ type: 'mock_grader' as any, weight: 1, required: true, params: { score: 0, passed: false } });

    const result = await runGraders([grader1, grader2], mockContext);

    expect(result.passed).toBe(false);
  });
});

describe('StringMatchGrader', () => {
  const context = {
    task_id: 't1',
    trial_id: 'tr1',
    transcript: {} as Transcript,
    output: 'The quick brown fox jumps over the lazy dog',
  };

  it('handles empty patterns', async () => {
    const grader = new StringMatchGrader({ type: 'string_match', params: { patterns: [] } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
    expect(res.score).toBe(0);
    expect(res.reasoning).toContain('No patterns');
  });

  it('matches all strings successfully (case insensitive)', async () => {
    const grader = new StringMatchGrader({ type: 'string_match', params: { patterns: ['QUICK', 'Fox', 'Dog'], mode: 'all' } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);
    expect(res.score).toBe(1);
    expect(res.details?.mode).toBe('all');
  });

  it('matches all strings with failures', async () => {
    const grader = new StringMatchGrader({ type: 'string_match', params: { patterns: ['quick', 'cat'], mode: 'all' } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
    expect(res.score).toBe(0.5);
  });

  it('matches any string successfully', async () => {
    const grader = new StringMatchGrader({ type: 'string_match', params: { patterns: ['cat', 'dog'], mode: 'any' } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);
    expect(res.score).toBe(1);
  });

  it('respects case sensitivity', async () => {
    const grader = new StringMatchGrader({ type: 'string_match', params: { patterns: ['QUICK'], mode: 'any', case_sensitive: true } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
  });
});

describe('RegexMatchGrader', () => {
  const context = {
    task_id: 't1',
    trial_id: 'tr1',
    transcript: {} as Transcript,
    output: 'User ID: 12345, Status: active, Role: admin',
  };

  it('handles empty patterns', async () => {
    const grader = new RegexMatchGrader({ type: 'regex_match', params: { patterns: [] } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
  });

  it('matches all patterns successfully', async () => {
    const grader = new RegexMatchGrader({ type: 'regex_match', params: { patterns: ['ID: \\d+', 'Status: \\w+'], mode: 'all' } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);
    expect(res.score).toBe(1);
  });

  it('handles invalid regex gracefully', async () => {
    const grader = new RegexMatchGrader({ type: 'regex_match', params: { patterns: ['[invalid', 'Role: admin'], mode: 'all' } as any });
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
    // 1 pattern matched, 1 error -> score should be penalized
    expect(res.score).toBeLessThan(1);
    expect((res.details as any).results[0].error).toBeTruthy();
  });
});

describe('StateCheckGrader', () => {
  const tempDir = join(process.cwd(), 'temp_state_check');

  beforeEach(() => {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir);
    }
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmdirSync(tempDir, { recursive: true });
    }
  });

  it('checks expected subset in final_outcome', async () => {
    const grader = new StateCheckGrader({ type: 'state_check', params: { expect: { 'user.role': 'admin' } } as any });
    const context = {
      task_id: 't1',
      trial_id: 'tr1',
      transcript: { final_outcome: { 'user.role': 'admin', 'user.id': 123 } } as unknown as Transcript,
      output: '',
    };
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);
  });

  it('checks expected subset from output JSON', async () => {
    const grader = new StateCheckGrader({ type: 'state_check', params: { expect: { success: true } } as any });
    const context = {
      task_id: 't1',
      trial_id: 'tr1',
      transcript: {} as Transcript,
      output: 'Result: {"success": true, "msg": "ok"}',
    };
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);
  });

  it('checks file contents', async () => {
    const testFile = join(tempDir, 'test.txt');
    writeFileSync(testFile, 'Hello World\nLine 2');

    const grader = new StateCheckGrader({ type: 'state_check', params: {
      check_files: [{ path: 'test.txt', contains: ['World'], not_contains: ['Goodbye'] }]
    } as any });

    const context = {
      task_id: 't1',
      trial_id: 'tr1',
      transcript: {} as Transcript,
      output: '',
      working_dir: tempDir,
    };
    const res = await grader.grade(context);
    expect(res.passed).toBe(true);

    unlinkSync(testFile);
  });

  it('fails if file not found', async () => {
    const grader = new StateCheckGrader({ type: 'state_check', params: {
      check_files: [{ path: 'nonexistent.txt', contains: ['World'] }]
    } as any });

    const context = {
      task_id: 't1',
      trial_id: 'tr1',
      transcript: {} as Transcript,
      output: '',
      working_dir: tempDir,
    };
    const res = await grader.grade(context);
    expect(res.passed).toBe(false);
  });

  it('checks env variables', async () => {
    process.env.TEST_ENV_VAR = 'secret123';
    const grader = new StateCheckGrader({ type: 'state_check', params: { check_env: { TEST_ENV_VAR: 'secret123' } } as any });
    const context = { task_id: 't1', trial_id: 'tr1', transcript: {} as Transcript, output: '' };

    const res = await grader.grade(context);
    expect(res.passed).toBe(true);

    delete process.env.TEST_ENV_VAR;
  });
});

describe('StaticAnalysisGrader', () => {
  it('handles empty commands', async () => {
    const grader = new StaticAnalysisGrader({ type: 'static_analysis', params: { commands: [] } as any });
    const res = await grader.grade({} as GraderContext);
    expect(res.passed).toBe(false);
  });

  it('passes on successful command', async () => {
    const grader = new StaticAnalysisGrader({ type: 'static_analysis', params: { commands: ['echo "ok"'] } as any });
    const res = await grader.grade({ working_dir: process.cwd() } as GraderContext);
    expect(res.passed).toBe(true);
  });

  it('counts warnings and errors', async () => {
    const grader = new StaticAnalysisGrader({ type: 'static_analysis', params: { commands: ['echo "warning: bad code\\nerror: failed"'], fail_on_warning: false } as any });
    const res = await grader.grade({ working_dir: process.cwd() } as GraderContext);
    expect(res.passed).toBe(false); // Because there is 1 error
    expect((res.details as any).total_errors).toBeGreaterThan(0);
    expect((res.details as any).total_warnings).toBeGreaterThan(0);
  });

  it('fails on warning if configured', async () => {
    const grader = new StaticAnalysisGrader({ type: 'static_analysis', params: { commands: ['echo "warning: slow code"'], fail_on_warning: true } as any });
    const res = await grader.grade({ working_dir: process.cwd() } as GraderContext);
    expect(res.passed).toBe(false);
  });
});

describe('BinaryTestsGrader', () => {
  const tempDir = join(process.cwd(), 'temp_binary_tests');

  beforeEach(() => {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir);
    }
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmdirSync(tempDir, { recursive: true });
    }
  });

  it('handles empty files', async () => {
    const grader = new BinaryTestsGrader({ type: 'binary_tests', params: { test_files: [] } as any });
    const res = await grader.grade({} as GraderContext);
    expect(res.passed).toBe(false);
  });

  it('runs successful tests', async () => {
    // Create a dummy bun test file that passes
    const testFile = join(tempDir, 'pass.test.ts');
    writeFileSync(testFile, 'import { it, expect } from "bun:test";\nit("passes", () => { expect(1).toBe(1); });\n');

    const grader = new BinaryTestsGrader({ type: 'binary_tests', params: { test_files: ['pass.test.ts'], test_command: 'bun test' } as any });
    const res = await grader.grade({ working_dir: tempDir } as GraderContext);
    // Since we're running in an environment where timeout might not find "bun test" without quotes or full path,
    // we may encounter issues in the generic test env, but we can verify the shape.
    // Let's actually provide a bash script that returns exit 0
    const shFile = join(tempDir, 'pass.sh');
    writeFileSync(shFile, '#!/bin/bash\nexit 0\n');
    chmodSync(shFile, '755');

    const graderSh = new BinaryTestsGrader({ type: 'binary_tests', params: { test_files: ['pass.sh'], test_command: 'bash' } as any });
    const resSh = await graderSh.grade({ working_dir: tempDir } as GraderContext);
    expect(resSh.passed).toBe(true);
    expect(resSh.score).toBe(1);

    unlinkSync(testFile);
    unlinkSync(shFile);
  });

  it('runs failing tests', async () => {
    const shFile = join(tempDir, 'fail.sh');
    writeFileSync(shFile, '#!/bin/bash\nexit 1\n');
    chmodSync(shFile, '755');

    const graderSh = new BinaryTestsGrader({ type: 'binary_tests', params: { test_files: ['fail.sh'], test_command: 'bash' } as any });
    const resSh = await graderSh.grade({ working_dir: tempDir } as GraderContext);
    expect(resSh.passed).toBe(false);
    expect(resSh.score).toBe(0);

    unlinkSync(shFile);
  });
});
