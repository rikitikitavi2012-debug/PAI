#!/usr/bin/env bun
/**
 * TaskCompleted.hook.ts — Log task completion events
 *
 * PURPOSE:
 * Tracks when tasks are completed in multi-agent workflows.
 * Logs task info to events.jsonl for workflow analysis.
 *
 * TRIGGER: TaskCompleted
 *
 * INPUT (stdin JSON):
 * - session_id: string
 * - hook_event_name: "TaskCompleted"
 * - task_id?: string
 * - task_subject?: string
 *
 * OUTPUT: Silent (event logged to events.jsonl)
 *
 * PERFORMANCE: <10ms — single appendEvent call
 */

import { appendEvent } from './lib/event-emitter';

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  task_id?: string;
  task_subject?: string;
  [key: string]: unknown;
}

async function readStdin(timeout = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);
    process.stdin.on('data', chunk => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); }

    const input: HookInput = JSON.parse(raw);

    appendEvent({
      type: 'task.completed',
      source: 'TaskCompleted.hook.ts',
      task_id: input.task_id,
      task_subject: input.task_subject,
    });

    process.exit(0);
  } catch {
    // Fail-open — never block task completion
    process.exit(0);
  }
}

main();
