import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const EVENTS_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'events.jsonl');

/** Read the last event from events.jsonl */
function lastEvent(): Record<string, unknown> | null {
  try {
    const lines = readFileSync(EVENTS_PATH, 'utf-8').trim().split('\n');
    return JSON.parse(lines[lines.length - 1]);
  } catch { return null; }
}

describe('EventLogger', () => {
  const hook = 'hooks/EventLogger.hook.ts';

  test('SubagentStart → emits agent.start event', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Explore',
      agent_id: 'test-agent-001',
      description: 'Search for config files',
    });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.start');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.agent_type).toBe('Explore');
    expect(evt?.agent_id).toBe('test-agent-001');
    expect(evt?.description).toBe('Search for config files');
  });

  test('SubagentStop → emits agent.stop event', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStop',
      agent_id: 'test-agent-002',
      last_assistant_message: 'Found 3 config files in /etc',
    });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('agent.stop');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.agent_id).toBe('test-agent-002');
    expect(evt?.last_message_preview).toBe('Found 3 config files in /etc');
  });

  test('TaskCompleted → emits task.completed event', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'TaskCompleted',
      task_id: 'test-task-001',
      task_subject: 'Fix login bug',
    });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('task.completed');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.task_id).toBe('test-task-001');
    expect(evt?.task_subject).toBe('Fix login bug');
  });

  test('unknown event → falls back to custom.unknown', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SomeNewEvent',
    });
    expect(result.exitCode).toBe(0);
    const evt = lastEvent();
    expect(evt?.type).toBe('custom.unknown');
    expect(evt?.source).toBe('EventLogger');
    expect(evt?.hook_event_name).toBe('SomeNewEvent');
  });

  test('empty stdin → exits gracefully', async () => {
    // Send minimal valid JSON since hook expects parseable input
    const result = await runHook(hook, {});
    expect(result.exitCode).toBe(0);
  });

  test('description truncated at 100 chars', async () => {
    const longDesc = 'A'.repeat(150);
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_type: 'Engineer',
      description: longDesc,
    });
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
    });
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
    });
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });
});
