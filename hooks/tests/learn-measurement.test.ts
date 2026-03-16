import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Measure LEARN Rate Script', () => {
  let tempDir: string;
  let workDir: string;
  const scriptPath = join(process.cwd(), 'MEMORY/WORK/20260315-230000_learn-phase-persistence/measure-learn-rate.sh');

  beforeEach(() => {
    // Create a temporary directory for PAI_DIR
    tempDir = join(tmpdir(), `pai-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    workDir = join(tempDir, 'MEMORY', 'WORK');
    mkdirSync(workDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to create a mock PRD session
   * @param slug Session slug (directory name)
   * @param phase The current phase (e.g., 'complete', 'ideation')
   * @param withLearn Whether to create a LEARN.md sibling file
   */
  function createSession(slug: string, phase: string, withLearn: boolean) {
    const sessionDir = join(workDir, slug);
    mkdirSync(sessionDir, { recursive: true });

    // Create PRD.md with the specified phase
    writeFileSync(join(sessionDir, 'PRD.md'), `phase: ${phase}\n\nSome other content here.`);

    // Create LEARN.md if requested
    if (withLearn) {
      writeFileSync(join(sessionDir, 'LEARN.md'), `# Learned Lessons\n\nSome lessons learned.`);
    }

    // Slight delay to ensure deterministic timestamp ordering if creating many files quickly
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  }

  it('Scenario 1: Script exits with code 0', async () => {
    // Create one completed session to avoid early exit if there are none
    createSession('test-1', 'complete', true);

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('Completed sessions:');
  });

  it('Scenario 2: Script correctly counts completed PRDs (grep "phase: complete")', async () => {
    // 3 completed
    createSession('completed-1', 'complete', false);
    createSession('completed-2', 'complete', false);
    createSession('completed-3', 'complete', false);
    // 2 in other phases
    createSession('ideation-1', 'ideation', false);
    createSession('build-1', 'build', false);

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('Completed sessions: 3');
  });

  it('Scenario 3: Script correctly detects LEARN.md siblings', async () => {
    createSession('with-learn', 'complete', true);
    createSession('without-learn', 'complete', false);
    createSession('with-learn-2', 'complete', true);
    createSession('incomplete-with-learn', 'ideation', true); // Should not be counted

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('With LEARN.md:      2');
    expect(text).toContain('Completed sessions: 3');
  });

  it('Scenario 4: Script output contains "Completed sessions:", "With LEARN.md:", "Rate:"', async () => {
    createSession('dummy-session', 'complete', true);

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('Completed sessions:');
    expect(text).toContain('With LEARN.md:');
    expect(text).toContain('Rate:');
  });

  it('Scenario 5: Rate calculation is correct', async () => {
    // 4 total completed sessions, 1 with LEARN.md (25.0%)
    createSession('sess-1', 'complete', true);
    createSession('sess-2', 'complete', false);
    createSession('sess-3', 'complete', false);
    createSession('sess-4', 'complete', false);

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('Rate:               25.0%');
  });

  it('Scenario 6: Script lists missing sessions (recent 10)', async () => {
    // Create 12 completed sessions *without* LEARN.md sequentially
    // The script sorts using `ls -t`, so they will be ordered by newest first.
    // The delay in createSession ensures they have distinct timestamps.
    const missingSlugs: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const slug = `missing-${i.toString().padStart(2, '0')}`;
      createSession(slug, 'complete', false);
      missingSlugs.push(slug);
    }

    // Create 2 completed sessions *with* LEARN.md
    createSession('has-learn-1', 'complete', true);
    createSession('has-learn-2', 'complete', true);

    const proc = Bun.spawn(['bash', scriptPath], {
      env: { ...process.env, PAI_DIR: tempDir }
    });

    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(text).toContain('=== Recent sessions missing LEARN.md ===');

    // Since missing-12 was created last among the missing ones,
    // it will be the newest missing session. The script should list
    // the 10 most recent missing sessions: missing-12 down to missing-03.
    // missing-01 and missing-02 should not be listed.

    for (let i = 12; i >= 3; i--) {
      const slug = `missing-${i.toString().padStart(2, '0')}`;
      expect(text).toContain(`- ${slug}`);
    }

    // Verify older ones are not listed
    expect(text).not.toContain('- missing-01');
    expect(text).not.toContain('- missing-02');

    // Verify ones with learn.md are not listed
    expect(text).not.toContain('- has-learn-1');
    expect(text).not.toContain('- has-learn-2');
  });
});
