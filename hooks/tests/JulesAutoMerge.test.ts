import { describe, it, expect, spyOn, afterEach, afterAll, mock } from 'bun:test';

// Use mock.module to completely isolate paths in JulesAutoMerge for ALL tests
import { createTempDir, cleanupTempDir } from './harness';
const TEST_DIR = createTempDir('pai-test-jules-automerge-');

// We MUST mock getPaiDir before importing JulesAutoMerge because it gets called at the module level.
mock.module('../../hooks/lib/paths', () => ({
  getPaiDir: () => TEST_DIR,
  expandPath: (p: string) => p,
  getSettingsPath: () => TEST_DIR + '/settings.json',
  paiPath: (...args: string[]) => [TEST_DIR, ...args].join('/'),
  getHooksDir: () => TEST_DIR + '/hooks',
  getSkillsDir: () => TEST_DIR + '/skills',
  getMemoryDir: () => TEST_DIR + '/MEMORY',
}));

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import {
  loadState,
  saveState,
  isProcessed,
  ghPrList,
  processPR,
  findReadyPRs,
  parseTestCounts,
  AutoMergeState,
  ProcessedSession,
  RepoConfig,
  JulesSession
} from '../../PAI/Tools/JulesAutoMerge';

const TOOL_PATH = join(process.cwd(), 'PAI/Tools/JulesAutoMerge.ts');

const MOCK_REPO: RepoConfig = {
  key: 'origin',
  remote: 'origin',
  repo: 'test/repo',
  source: 'source',
  branch: 'main',
};

describe('JulesAutoMerge', () => {
  afterEach(() => {
    mock.restore();
  });

  afterAll(() => {
    cleanupTempDir(TEST_DIR);
    delete process.env.PAI_DIR;
  });

  // Test 1
  it('--help prints usage and exits 0', () => {
    const result = Bun.spawnSync(['bun', TOOL_PATH, '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain('Jules Auto-Merge Pipeline');
    expect(stdout).toContain('check');
    expect(stdout).toContain('merge');
    expect(stdout).toContain('status');
  });

  // Test 2
  it('status command shows stats when no state file exists', () => {
    const tempDir = createTempDir();
    try {
      const result = Bun.spawnSync(['bun', TOOL_PATH, 'status'], {
        env: { ...process.env, PAI_DIR: tempDir },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      expect(result.exitCode).toBe(0);
      const stdout = result.stdout.toString();
      expect(stdout).toContain('Jules Auto-Merge Status');
      expect(stdout).toContain('Total merged: \x1b[32m0\x1b[0m');
      expect(stdout).toContain('Total failed: \x1b[31m0\x1b[0m');
      expect(stdout).toContain('Total skipped: \x1b[2m0\x1b[0m');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  // Test 3
  it('status command shows stats when state file has data', async () => {
    const tempDir = createTempDir();
    try {
      // Create memory dir and write dummy state
      const stateDir = join(tempDir, 'MEMORY', 'STATE');
      import('fs').then(fs => {
        fs.mkdirSync(stateDir, { recursive: true });
        const mockState: AutoMergeState = {
          lastCheck: '2023-10-27T10:00:00.000Z',
          processedSessions: [
            {
              sessionId: 'sess-1',
              prNumber: 42,
              prUrl: 'https://github.com/test/repo/pull/42',
              result: 'merged',
              processedAt: '2023-10-27T10:00:00.000Z',
              repo: 'test/repo'
            }
          ],
          stats: { totalMerged: 5, totalFailed: 1, totalSkipped: 2 }
        };
        writeFileSync(join(stateDir, 'jules-automerge.json'), JSON.stringify(mockState));
      });

      // Wait for fs operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = Bun.spawnSync(['bun', TOOL_PATH, 'status'], {
        env: { ...process.env, PAI_DIR: tempDir },
        stdout: 'pipe',
        stderr: 'pipe',
      });

      expect(result.exitCode).toBe(0);
      const stdout = result.stdout.toString();
      expect(stdout).toContain('Total merged: \x1b[32m5\x1b[0m');
      expect(stdout).toContain('Total failed: \x1b[31m1\x1b[0m');
      expect(stdout).toContain('Total skipped: \x1b[2m2\x1b[0m');
      expect(stdout).toContain('#42 merged');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  // Test 4
  it('State file loadState/saveState works correctly', () => {
    // Since process.env.PAI_DIR is set globally to TEST_DIR before the module is imported,
    // the module's PAI_DIR uses TEST_DIR, so saveState and loadState are fully isolated.
    const state: AutoMergeState = {
      lastCheck: '2023-10-01',
      processedSessions: [],
      stats: { totalMerged: 10, totalFailed: 0, totalSkipped: 0 }
    };

    saveState(state);

    const statePath = join(TEST_DIR, 'MEMORY', 'STATE', 'jules-automerge.json');
    expect(existsSync(statePath)).toBe(true);

    const loaded = loadState();
    expect(loaded.lastCheck).toBe('2023-10-01');
    expect(loaded.stats.totalMerged).toBe(10);
  });

  // Test 5
  it('isProcessed correctly identifies already-processed sessions', () => {
    const state: AutoMergeState = {
      lastCheck: '',
      processedSessions: [
        { sessionId: 'sess-123', prNumber: 1, prUrl: '', result: 'merged', processedAt: '', repo: '' }
      ],
      stats: { totalMerged: 0, totalFailed: 0, totalSkipped: 0 }
    };

    expect(isProcessed(state, 'sess-123')).toBe(true);
    expect(isProcessed(state, 'sess-456')).toBe(false);
  });

  // Test 6
  it('ghPrList returns empty array on non-existent repo', () => {
    // Mock Bun.spawnSync to simulate gh failure
    const originalSpawnSync = Bun.spawnSync;
    spyOn(Bun, 'spawnSync').mockImplementation((...args: any[]) => {
      return { exitCode: 1, stdout: Buffer.from(''), stderr: Buffer.from('Error'), success: false } as any;
    });

    const result = ghPrList('invalid/repo');
    expect(result).toEqual([]);
    expect(Bun.spawnSync).toHaveBeenCalled();
  });

  // Test 7
  it('processPR skips PR when baseRefName does not match target branch', async () => {
    const state: AutoMergeState = {
      lastCheck: '',
      processedSessions: [],
      stats: { totalMerged: 0, totalFailed: 0, totalSkipped: 0 }
    };

    const session: JulesSession = { name: 'sess-1', title: 'T', state: 'COMPLETED' };
    const pr = { number: 123, title: 'Test PR', headRefName: 'feat', baseRefName: 'wrong-branch' };

    const originalLog = console.log;
    let logOutput = '';
    console.log = (msg: string) => { logOutput += msg + '\n'; };

    try {
      const result = await processPR(MOCK_REPO, session, pr, state, false);
      expect(result.result).toBe('skipped');
      expect(logOutput).toContain('SKIP');
      expect(logOutput).toContain('targets wrong-branch, expected main');
    } finally {
      console.log = originalLog;
    }
  });

  // Test 8: parseTestCounts
  it('parseTestCounts parses bun test and pytest output correctly', () => {
    // Bun test format
    expect(parseTestCounts(' 243 pass\n 9 fail\n 3753 expect() calls')).toEqual({ pass: 243, fail: 9 });
    expect(parseTestCounts(' 50 pass\n 0 fail')).toEqual({ pass: 50, fail: 0 });
    expect(parseTestCounts(' 0 pass\n 5 fail')).toEqual({ pass: 0, fail: 5 });

    // Pytest format
    expect(parseTestCounts('====== 12 passed, 3 failed ======')).toEqual({ pass: 12, fail: 3 });
    expect(parseTestCounts('====== 8 passed ======')).toEqual({ pass: 8, fail: 0 });
    expect(parseTestCounts('====== 2 failed ======')).toEqual({ pass: 0, fail: 2 });

    // No recognizable format
    expect(parseTestCounts('some random output')).toEqual({ pass: 0, fail: 0 });
  });

  // Test 9
  it('findReadyPRs deduplicates by PR number', async () => {
    // Mock getCompletedSessions, getSessionDetails, ghPrList
    const MOCK_SESSIONS = [
      { name: 'sess-1', title: 'A', state: 'COMPLETED', outputs: [{ pullRequest: { url: 'https://github.com/pull/1', title: 'PR1', baseRef: 'main', headRef: 'feat1' } }] },
      { name: 'sess-2', title: 'B', state: 'COMPLETED', outputs: [{ pullRequest: { url: 'https://github.com/pull/1', title: 'PR1', baseRef: 'main', headRef: 'feat1' } }] }
    ];

    const MOCK_PRS = [
      { number: 1, title: 'PR1', headRefName: 'feat1', baseRefName: 'main' }
    ];

    const state: AutoMergeState = { lastCheck: '', processedSessions: [], stats: { totalMerged: 0, totalFailed: 0, totalSkipped: 0 } };

    // We need to mock the fetch used in getCompletedSessions, but since we're testing findReadyPRs
    // which calls getCompletedSessions, let's just mock julesApi by mocking global.fetch or directly patching the module.
    // Instead of messing with fetch, we can just spy on ghPrList.
    // Wait, getCompletedSessions calls fetch, which requires an API key, which will fail if not present.
    // So we must mock global.fetch.

    spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      const u = url.toString();
      if (u.includes('/sessions/sess-1')) {
        return new Response(JSON.stringify(MOCK_SESSIONS[0]));
      }
      if (u.includes('/sessions/sess-2')) {
        return new Response(JSON.stringify(MOCK_SESSIONS[1]));
      }
      if (u.includes('/sessions')) {
        return new Response(JSON.stringify({ sessions: MOCK_SESSIONS }));
      }
      return new Response('{}');
    });

    // We also need to mock loadApiKey which is called by julesApi via fetch... wait, loadApiKey
    // reads ENV_PATH which might fail. Let's spy on fs.readFileSync as well.
    const fs = await import('fs');
    const originalReadFileSync = fs.readFileSync;
    spyOn(fs, 'readFileSync').mockImplementation((path: any, ...args: any[]) => {
      if (path.toString().includes('.env')) return 'JULES_API_KEY=mock-key';
      return originalReadFileSync(path, ...args);
    });

    spyOn(Bun, 'spawnSync').mockImplementation((cmd: any) => {
      if (cmd[0] === 'gh' && cmd[1] === 'pr' && cmd[2] === 'list') {
        return { exitCode: 0, stdout: Buffer.from(JSON.stringify(MOCK_PRS)), stderr: Buffer.from(''), success: true } as any;
      }
      return { exitCode: 0, stdout: Buffer.from(''), stderr: Buffer.from(''), success: true } as any;
    });

    const readyPRs = await findReadyPRs(MOCK_REPO, state);

    // Should deduplicate, returning only 1 ready PR
    expect(readyPRs.length).toBe(1);
    expect(readyPRs[0].pr.number).toBe(1);
    expect(readyPRs[0].session.name).toBe('sess-1'); // first matching session wins
  });
});
