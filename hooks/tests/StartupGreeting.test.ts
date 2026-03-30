import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('StartupGreeting', () => {
  const hook = 'hooks/StartupGreeting.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-startup-');
    // Ensure settings.json exists since StartupGreeting tries to parse it
    writeFileSync(
      join(tempDir, 'settings.json'),
      JSON.stringify({ identity: { name: 'Navi' } }),
      'utf-8'
    );
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('runs successfully and exits 0', async () => {
    const result = await runHook(
      hook,
      { session_id: 'test-startup-01' },
      { PAI_DIR: tempDir }
    );
    expect(result.exitCode).toBe(0);
  });

  test('subagent execution → exits 0 silently without banner', async () => {
    const result = await runHook(
      hook,
      { session_id: 'test-startup-02' },
      {
        PAI_DIR: tempDir,
        CLAUDE_PROJECT_DIR: '/home/user/.claude/Agents/Explorer',
      }
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toContain('StartupGreeting: Failed to display banner');
  });

  test('subagent explicitly set → exits 0 silently', async () => {
    const result = await runHook(
      hook,
      { session_id: 'test-startup-03' },
      {
        PAI_DIR: tempDir,
        CLAUDE_AGENT_TYPE: 'Engineer',
      }
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toContain('StartupGreeting: Failed to display banner');
  });

  test('missing settings.json → logs error and exits 0', async () => {
    // Overwrite the existing file to break parsing
    writeFileSync(join(tempDir, 'settings.json'), '{ invalid json', 'utf-8');

    const result = await runHook(
      hook,
      { session_id: 'test-startup-04' },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('StartupGreeting: Failed to display banner');
  });
});
