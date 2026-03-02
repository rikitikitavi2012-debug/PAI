#!/usr/bin/env bun
/**
 * SubagentStop.hook.ts — Log agent completion events
 *
 * PURPOSE:
 * Tracks when subagents complete, capturing transcript path and
 * last message for observability and performance analysis.
 *
 * TRIGGER: SubagentStop
 *
 * INPUT (stdin JSON):
 * - session_id: string
 * - transcript_path: string
 * - hook_event_name: "SubagentStop"
 * - agent_id?: string
 * - agent_transcript_path?: string
 * - last_assistant_message?: string
 *
 * OUTPUT: Silent (event logged to events.jsonl)
 *
 * PERFORMANCE: <10ms — single appendEvent call
 */

import { appendEvent } from './lib/event-emitter';

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  transcript_path?: string;
  agent_id?: string;
  agent_transcript_path?: string;
  last_assistant_message?: string;
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

    // Preview of last message (first 200 chars)
    const preview = (input.last_assistant_message || '').slice(0, 200);

    appendEvent({
      type: 'agent.stop',
      source: 'SubagentStop.hook.ts',
      agent_id: input.agent_id,
      transcript_path: input.agent_transcript_path || input.transcript_path,
      last_message_preview: preview || undefined,
    });

    process.exit(0);
  } catch {
    // Fail-open — never block agent completion
    process.exit(0);
  }
}

main();
