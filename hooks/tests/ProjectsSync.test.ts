import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'fs';

describe('ProjectsSync', () => {
  const hook = 'hooks/ProjectsSync.hook.ts';

  let tempDir: string;
  let telosProjectsPath: string;
  let snapshotPath: string;

  beforeEach(() => {
    tempDir = createTempDir('projects-sync-test-');

    // Setup directory structure
    const telosDir = join(tempDir, 'PAI', 'USER', 'TELOS');
    const projectsDir = join(tempDir, 'PAI', 'USER', 'PROJECTS');
    mkdirSync(telosDir, { recursive: true });
    mkdirSync(projectsDir, { recursive: true });

    telosProjectsPath = join(telosDir, 'PROJECTS.md');
    snapshotPath = join(projectsDir, 'PROJECTS.md');

    process.env.PAI_DIR = tempDir;
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    delete process.env.PAI_DIR;
  });

  test('ignores irrelevant files', async () => {
    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: '/some/other/file.md' },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
    expect(existsSync(snapshotPath)).toBe(false);
  });

  test('parses active projects', async () => {
    const mockContent = `
## Активные проекты

### P0: Alpha
**Статус:** Dev
**Стек:** TS
**Рабочая директория:** /path/alpha

### P1: Beta
**Статус:** Test
**Стек:** Rust
**Рабочая директория:** /path/beta
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('| P0 | Alpha | `/path/alpha` | TS | Dev |');
    expect(snapshot).toContain('| P1 | Beta | `/path/beta` | Rust | Test |');
  });

  test('parses planned projects', async () => {
    const mockContent = `
## Планируемые проекты

### P2: Gamma
**Статус:** Todo
**Блокеры:** None
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('## Планируемые');
    expect(snapshot).toContain('| P2 | Gamma | Todo | None |');
  });

  test('parses frozen projects', async () => {
    const mockContent = `
## Замороженные проекты

| Проект | Заморожен | Почему | Возобновить когда |
|---|---|---|---|
| Delta | 2023-01-01 | No time | 2024-01-01 |
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('## Замороженные');
    expect(snapshot).toContain('| Delta | No time |');
  });

  test('extracts priority order', async () => {
    const mockContent = `
## Приоритизация проектов

| ID | Проект | C | D |
|---|---|---|---|
| P0 | Alpha | c | d |
| P1 | Beta | c | d |
| P3 | Epsilon | c | d |
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('**P0 > P1 > P3**');
  });

  test('extracts current focus', async () => {
    const mockContent = `
## Приоритизация проектов

**Текущий фокус**:
1. Task 1
2. Task 2

**Принцип**
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('1. Task 1');
    expect(snapshot).toContain('2. Task 2');
    expect(snapshot).not.toContain('**Принцип**');
  });

  test('extracts brigade', async () => {
    const mockContent = `
**AI Brigade (3 членов, T1/T2/T3)** — T1: A0, T2: Jules, T3: Gemini
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('T1: A0, T2: Jules, T3: Gemini');
  });

  test('change detection', async () => {
    const mockContent = `
## Активные проекты

### P0: Alpha
**Статус:** Dev
`;
    writeFileSync(telosProjectsPath, mockContent);

    // Run hook once
    await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(existsSync(snapshotPath)).toBe(true);
    const initialStat = statSync(snapshotPath);

    // Wait 100ms to ensure a reliable mtime difference if it was overwritten
    await new Promise(r => setTimeout(r, 100));

    // Run hook again with the same content
    await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    const secondStat = statSync(snapshotPath);
    // mtime should be strictly equal because the hook aborts early
    expect(secondStat.mtimeMs).toBe(initialStat.mtimeMs);
  });

  test('P0 defaults', async () => {
    const mockContent = `
## Активные проекты

### P0: Core
**Архитектура**
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath },
    });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot = readFileSync(snapshotPath, 'utf-8');
    expect(snapshot).toContain('| P0 | Core | `~/.claude` | TypeScript, Bun, Hooks |');
  });

  test('graceful on empty stdin', async () => {
    const result = await runHook(hook, {});

    expect(result.exitCode).toBe(0);
    expect(result.json?.continue).toBe(true);
    expect(existsSync(snapshotPath)).toBe(false);
  });

  test('Хук завершается быстро (< 500ms)', async () => {
    const mockContent = `
## Активные проекты

### P0: PAI Infrastructure
**Статус:** В разработке
**Стек:** TypeScript, Bun, Hooks
**Рабочая директория:** \`~/.claude\`
`;
    writeFileSync(telosProjectsPath, mockContent);

    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });

  test('Хук не падает при отсутствии PROJECTS.md файла', async () => {
    // We intentionally do not write the file
    const result = await runHook(hook, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: telosProjectsPath }
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(existsSync(snapshotPath)).toBe(false);
  });

});
