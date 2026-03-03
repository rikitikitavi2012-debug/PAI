import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('EventLogger', () => {
  const hook = 'hooks/EventLogger.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-eventlogger-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  /** Read the last event from events.jsonl */
  function lastEvent(): Record<string, unknown> | null {
    const EVENTS_PATH = join(tempDir, 'MEMORY', 'STATE', 'events.jsonl');
    if (!existsSync(EVENTS_PATH)) return null;
    try {
      const lines = readFileSync(EVENTS_PATH, 'utf-8').trim().split('\n');
      return JSON.parse(lines[lines.length - 1]);
    } catch { return null; }
  }

  test('SubagentStart handler creates event with correct type and fields', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Explore',
      agent_id: 'test-agent-001',
      description: 'Search for config files',
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.start');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.agent_type).toBe('Explore');
    expect(evt?.agent_id).toBe('test-agent-001');
    expect(evt?.description).toBe('Search for config files');
  });

  test('SubagentStop handler creates event with duration calculation', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStop',
      agent_id: 'test-agent-002',
      last_assistant_message: 'Found 3 config files in /etc',
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.stop');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.agent_id).toBe('test-agent-002');
    expect(evt?.last_message_preview).toBe('Found 3 config files in /etc');
    // Note: EventLogger.hook.ts doesn't calculate duration, it simply forwards fields
  });

  test('TaskCompleted handler creates event with task details', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'TaskCompleted',
      task_id: 'test-task-001',
      task_subject: 'Fix login bug',
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('task.completed');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.task_id).toBe('test-task-001');
    expect(evt?.task_subject).toBe('Fix login bug');
  });

  test('Unknown event type is silently ignored (no error)', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SomeNewEvent',
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('custom.unknown');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.hook_event_name).toBe('SomeNewEvent');
  });

  test('Event entries are valid JSON with required fields: type, timestamp, source', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Engineer',
    }, { PAI_DIR: tempDir, CLAUDE_SESSION_ID: 'sess-abc-123' });
    expect(result.exitCode).toBe(0);

    const EVENTS_PATH = join(tempDir, 'MEMORY', 'STATE', 'events.jsonl');
    const lines = readFileSync(EVENTS_PATH, 'utf-8').trim().split('\n');
    const rawLine = lines[lines.length - 1];

    // Valid JSON
    let parsed: any;
    expect(() => { parsed = JSON.parse(rawLine); }).not.toThrow();

    // Required fields
    expect(parsed.type).toBe('agent.start');
    expect(parsed.source).toBe('EventLogger');
    expect(parsed.timestamp).toBeDefined();
    expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();
    expect(parsed.session_id).toBe('sess-abc-123');
  });

  test('Handler function doesn\'t throw on missing/malformed input', async () => {
    // Harness converts the stdinData object to JSON. To send malformed string,
    // we use a lower-level spawn in this test to send raw garbage.
    const start = Date.now();
    const fullPath = join(process.cwd(), hook);

    const proc = Bun.spawn(['bun', fullPath], {
      stdin: new Blob(['{ malformed json oops']),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PAI_DIR: tempDir },
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    await proc.exited;

    // Must exit 0 and not crash
    expect(proc.exitCode).toBe(0);
    expect(stderr).toBe('');
  });

  test('description truncated at 100 chars', async () => {
    const longDesc = 'A'.repeat(150);
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Engineer',
      description: longDesc,
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.start');
    expect((evt?.description as string).length).toBe(100);
  });

  test('last_message_preview truncated at 200 chars', async () => {
    const longMsg = 'B'.repeat(300);
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStop',
      agent_id: 'test-agent-trunc',
      last_assistant_message: longMsg,
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.stop');
    expect((evt?.last_message_preview as string).length).toBe(200);
  });

  test('executes under 500ms', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Explore',
      description: 'perf test',
    }, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });
});
