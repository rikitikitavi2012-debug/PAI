import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

const PRD = '/tmp/test-isc-manager-prd.md';
const TOOL = '/home/ser/.claude/PAI/Tools/ISCManager.ts';
const TEMPLATE = `---
task: "Test task"
slug: test-isc-manager
effort: standard
phase: execute
progress: 0/2
mode: interactive
started: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
---

## Criteria
- [ ] ISC-1: First test criterion
- [ ] ISC-2: Second test criterion
`;

const run = (...args: string[]) =>
  Bun.spawnSync(['bun', TOOL, ...args, '--prd', PRD], { stdout: 'pipe', stderr: 'pipe' });

const reset = () => writeFileSync(PRD, TEMPLATE);

beforeAll(() => reset());
afterAll(() => { try { unlinkSync(PRD); } catch {} });

describe('ISCManager', () => {
  test('show outputs table with ISC criteria', () => {
    reset();
    const r = run('show');
    const out = r.stdout.toString();
    expect(out).toContain('ISC-1');
    expect(out).toContain('ISC-2');
    expect(out).toContain('First test criterion');
    expect(out).toContain('0/2');
  });

  test('create --text adds new ISC line', () => {
    reset();
    const r = run('create', '--text', 'Third criterion added');
    expect(r.stdout.toString()).toContain('ISC-3');
    const prd = readFileSync(PRD, 'utf-8');
    expect(prd).toContain('- [ ] ISC-3: Third criterion added');
    expect(prd).toContain('progress: 0/3');
  });

  test('update --status done checks the box', () => {
    reset();
    run('update', '--id', 'ISC-1', '--status', 'done');
    const prd = readFileSync(PRD, 'utf-8');
    expect(prd).toContain('- [x] ISC-1: First test criterion');
    expect(prd).toContain('progress: 1/2');
  });

  test('update --status todo unchecks the box', () => {
    reset();
    run('update', '--id', 'ISC-1', '--status', 'done');
    run('update', '--id', 'ISC-1', '--status', 'todo');
    const prd = readFileSync(PRD, 'utf-8');
    expect(prd).toContain('- [ ] ISC-1: First test criterion');
    expect(prd).toContain('progress: 0/2');
  });

  test('show after updates reflects correct progress', () => {
    reset();
    run('update', '--id', 'ISC-1', '--status', 'done');
    run('update', '--id', 'ISC-2', '--status', 'done');
    const out = run('show').stdout.toString();
    expect(out).toContain('2/2');
    expect(out).toContain('100%');
  });

  test('--help outputs usage text', () => {
    const r = Bun.spawnSync(['bun', TOOL, '--help'], { stdout: 'pipe', stderr: 'pipe' });
    const out = r.stdout.toString();
    expect(out).toContain('ISCManager');
    expect(out).toContain('Commands');
    expect(r.exitCode).toBe(0);
  });

  test('missing PRD file returns exit code 1', () => {
    const r = Bun.spawnSync(['bun', TOOL, 'show', '--prd', '/tmp/nonexistent.md'],
      { stdout: 'pipe', stderr: 'pipe' });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain('not found');
  });
});
