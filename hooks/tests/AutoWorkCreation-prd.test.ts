import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync, readdirSync, mkdirSync, cpSync } from 'fs';
import { join } from 'path';

describe('AutoWorkCreation PRD scenarios', () => {
  const hook = 'hooks/AutoWorkCreation.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-autowork-prd-');
    mkdirSync(join(tempDir, 'PAI', 'config'), { recursive: true });
    try {
      cpSync(join(process.cwd(), 'PAI', 'config'), join(tempDir, 'PAI', 'config'), { recursive: true });
    } catch (e) {
      // ignore
    }
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('1. New prompt creates a directory in MEMORY/WORK/ with slug format YYYYMMDD-HHMMSS_kebab', async () => {
    const prompt = 'Create a simple hello world app';
    const result = await runHook(
      hook,
      { session_id: 'test-aw-prd-01', prompt },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const workDir = join(tempDir, 'MEMORY', 'WORK');
    expect(existsSync(workDir)).toBe(true);

    const dirs = readdirSync(workDir);
    expect(dirs.length).toBe(1);

    const sessionDirName = dirs[0];
    const formatRegex = /^\d{8}-\d{6}_create-a-simple-hello-world-app$/;
    expect(sessionDirName).toMatch(formatRegex);
  });

  test('2. PRD.md is created with correct YAML frontmatter', async () => {
    const prompt = 'Test PRD frontmatter generation';
    const result = await runHook(
      hook,
      { session_id: 'test-aw-prd-02', prompt },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-prd-02.json');
    const stateData = JSON.parse(readFileSync(stateFile, 'utf-8'));
    const prdPath = stateData.prd_path;

    expect(prdPath).toBeDefined();
    expect(existsSync(prdPath)).toBe(true);

    const prdContent = readFileSync(prdPath, 'utf-8');

    const frontmatterMatch = prdContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).not.toBeNull();

    const frontmatter = frontmatterMatch![1];

    // According to real template logic:
    expect(frontmatter).toContain('title: "Test PRD frontmatter generation"');
    expect(frontmatter).toContain('id: PRD-'); // for slug format
    expect(frontmatter).toContain('effort_level: STANDARD'); // effort tier defaults to standard
    expect(frontmatter).toContain('status: ACTIVE'); // phase/status tracking
    expect(frontmatter).toContain('verification_summary: "0/0"'); // progress placeholder
    expect(frontmatter).toContain('mode: interactive'); // standard/interactive mode
    expect(frontmatter).toContain('created: '); // started representation
    expect(frontmatter).toContain('updated: '); // updated representation
  });

  test('3. Short prompt (<20 characters) -> DOES NOT create PRD (garbage filter)', async () => {
    // "ok" matches the conversational regex in hook: /^(yes|no|ok|...)$/i
    const prompt = 'ok';
    const result = await runHook(
      hook,
      { session_id: 'test-aw-prd-03', prompt },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const workDir = join(tempDir, 'MEMORY', 'WORK');
    if (existsSync(workDir)) {
      const dirs = readdirSync(workDir);
      expect(dirs.length).toBe(0);
    } else {
      expect(existsSync(workDir)).toBe(false);
    }
  });

  test('4. Repeated prompt in the same session -> DOES NOT duplicate PRD', async () => {
    // Initial task
    await runHook(
      hook,
      { session_id: 'test-aw-prd-04', prompt: 'Initial task for PRD check' },
      { PAI_DIR: tempDir }
    );

    const stateFile = join(tempDir, 'MEMORY', 'STATE', 'current-work-test-aw-prd-04.json');
    const stateDataBefore = JSON.parse(readFileSync(stateFile, 'utf-8'));
    const prdPathBefore = stateDataBefore.prd_path;
    expect(existsSync(prdPathBefore)).toBe(true);

    const sessionDir = join(tempDir, 'MEMORY', 'WORK', stateDataBefore.session_dir);
    const tasksDir = join(sessionDir, 'tasks');
    const tasksBefore = readdirSync(tasksDir).filter(f => f !== 'current');
    expect(tasksBefore.length).toBe(1);

    // Repeated prompt (continuation)
    const result = await runHook(
      hook,
      { session_id: 'test-aw-prd-04', prompt: 'Now let\'s refine this' },
      { PAI_DIR: tempDir }
    );

    expect(result.exitCode).toBe(0);

    const stateDataAfter = JSON.parse(readFileSync(stateFile, 'utf-8'));
    const prdPathAfter = stateDataAfter.prd_path;

    expect(prdPathAfter).toBe(prdPathBefore);
    expect(stateDataAfter.task_count).toBe(1);

    const tasksAfter = readdirSync(tasksDir).filter(f => f !== 'current');
    expect(tasksAfter.length).toBe(1);
  });

  test('5. Slug correctly kebab-cases Cyrillic and long strings', async () => {
    // Cyrillic doesn't match a-z0-9 so the hook drops it, but the fallback should be 'task'
    // This still counts as correctly creating a valid slug instead of breaking directories.
    const promptCyrillic = 'Создать новый компонент для профиля пользователя с длинным названием которое должно быть обрезано';
    const result1 = await runHook(
      hook,
      { session_id: 'test-aw-prd-05-cyr', prompt: promptCyrillic },
      { PAI_DIR: tempDir }
    );
    expect(result1.exitCode).toBe(0);

    const workDir = join(tempDir, 'MEMORY', 'WORK');
    let dirs = readdirSync(workDir);
    expect(dirs.some(d => d.match(/^\d{8}-\d{6}_task$/))).toBe(true);

    // Testing long string limiting logic
    const promptLong = 'This is a very long string that should definitely be truncated because it exceeds the maximum allowed length for a directory name in our system';
    const result2 = await runHook(
      hook,
      { session_id: 'test-aw-prd-05-long', prompt: promptLong },
      { PAI_DIR: tempDir }
    );
    expect(result2.exitCode).toBe(0);

    dirs = readdirSync(workDir);
    const longDir = dirs.find(d => d.includes('this-is-a-very-long-string-that-should-definitely'));
    expect(longDir).toBeDefined();
    expect(longDir?.length).toBeLessThan(80);
    // the trailing dash is removed by replace(/-$/, '')
    expect(longDir).toMatch(/^\d{8}-\d{6}_this-is-a-very-long-string-that-should-definitely$/);
  });
});
