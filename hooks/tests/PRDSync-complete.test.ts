import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';

describe('PRDSync - phase:complete', () => {
  const hook = 'hooks/PRDSync.hook.ts';
  let tempDir: string;
  let workDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = createTempDir('prd-sync-complete-');
    workDir = join(tempDir, 'MEMORY', 'WORK');
    stateDir = join(tempDir, 'MEMORY', 'STATE');
    mkdirSync(workDir, { recursive: true });
    mkdirSync(stateDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('1. Edit PRD.md to phase:complete → work.json updated with phase="complete"', async () => {
    const slug = '20231010-test-complete';
    const sessionPath = join(workDir, slug);
    mkdirSync(sessionPath, { recursive: true });

    const workJsonPath = join(stateDir, 'work.json');
    writeFileSync(workJsonPath, JSON.stringify({
      sessions: {
        [slug]: {
          phase: 'execute',
          progress: '1/3',
          task: 'Test task',
          effort: 'standard'
        }
      }
    }));

    const prdPath = join(sessionPath, 'PRD.md');
    writeFileSync(prdPath, `---
slug: ${slug}
phase: complete
progress: 3/3
task: Test task
effort: standard
---
## Criteria
- [x] ISC-1: First
- [x] ISC-2: Second
- [x] ISC-3: Third
`);

    const result = await runHook(hook, {
      session_id: 'test-complete-1',
      tool_name: 'Edit',
      tool_input: { file_path: prdPath },
      hook_event_name: 'PostToolUse',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    const workJson = JSON.parse(readFileSync(workJsonPath, 'utf-8'));
    expect(workJson.sessions[slug].phase).toBe('complete');
    expect(workJson.sessions[slug].progress).toBe('3/3');
  });

  test('2 & 3. Phase change from learn→complete triggers tab color update and COMPLETE is valid', async () => {
    const slug = '20231010-test-tab';
    const sessionPath = join(workDir, slug);
    mkdirSync(sessionPath, { recursive: true });

    const workJsonPath = join(stateDir, 'work.json');
    writeFileSync(workJsonPath, JSON.stringify({
      sessions: {
        [slug]: {
          phase: 'learn',
          progress: '3/3',
          task: 'Tab task',
          effort: 'standard'
        }
      }
    }));

    const prdPath = join(sessionPath, 'PRD.md');
    writeFileSync(prdPath, `---
slug: ${slug}
phase: complete
progress: 3/3
task: Tab task
effort: standard
---
`);

    const windowId = 'kitty-win-1';

    const result = await runHook(hook, {
      session_id: 'test-tab-1',
      tool_name: 'Write',
      tool_input: { file_path: prdPath },
      hook_event_name: 'PostToolUse',
    }, {
      PAI_DIR: tempDir,
      KITTY_WINDOW_ID: windowId,
      KITTY_LISTEN_ON: 'unix:/tmp/test-socket-prd'
    });

    expect(result.exitCode).toBe(0);

    const tabTitlesDir = join(stateDir, 'tab-titles');
    const tabStatePath = join(tabTitlesDir, `${windowId}.json`);
    expect(existsSync(tabStatePath)).toBe(true);

    const tabState = JSON.parse(readFileSync(tabStatePath, 'utf-8'));
    expect(tabState.state).toBe('completed');
    expect(tabState.phase).toBe('COMPLETE');
  });

  test('4. Change detection: same phase twice does not re-sync (hasChanges=false)', async () => {
    const slug = '20231010-test-no-change';
    const sessionPath = join(workDir, slug);
    mkdirSync(sessionPath, { recursive: true });

    const workJsonPath = join(stateDir, 'work.json');
    const initialTime = new Date('2023-01-01T00:00:00Z').toISOString();

    // To ensure exact match in change detection:
    // phaseMatch: 'complete' === 'complete'
    // progressMatch: '1/1' === '1/1'
    // taskMatch: 'Same task' === 'Same task'
    // effortMatch: 'standard' === 'standard'
    // criteriaMatch: parsed signature matches.
    writeFileSync(workJsonPath, JSON.stringify({
      sessions: {
        [slug]: {
          phase: 'complete',
          progress: '1/1',
          task: 'Same task',
          effort: 'standard',
          updatedAt: initialTime,
          criteria: [
            { id: 'ISC-1', description: 'Test', type: 'criterion', status: 'completed' }
          ],
          phaseHistory: [
            { phase: 'COMPLETE', startedAt: Date.now(), criteriaCount: 1, agentCount: 0 }
          ]
        }
      }
    }));

    const prdPath = join(sessionPath, 'PRD.md');
    // NOTE: PRD must match EXACTLY what's in work.json so hasChanges becomes false.
    // Also, PRD format for parseCriteriaList regex expects: `- [x] ISC-1: Test`
    writeFileSync(prdPath, `---
slug: ${slug}
phase: complete
progress: 1/1
task: Same task
effort: standard
---
## Criteria
- [x] ISC-1: Test

---
`);

    const result = await runHook(hook, {
      session_id: 'test-no-change-1',
      tool_name: 'Edit',
      tool_input: { file_path: prdPath },
      hook_event_name: 'PostToolUse',
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);

    const workJson = JSON.parse(readFileSync(workJsonPath, 'utf-8'));
    // Change detection expects criteriaSignature (id:status,id:status) to match.
    // Since `parseCriteriaList` logic extracts:
    // id='ISC-1', status='completed'
    // If we mock work.json correctly, `hasChanges` should be false.
    // If `hasChanges` is false, `syncToWorkJson` is skipped, so `updatedAt` won't change.

    expect(workJson.sessions[slug].updatedAt).toBe(initialTime);
  });
});
