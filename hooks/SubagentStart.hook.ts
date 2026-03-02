#!/usr/bin/env bun
/**
 * SubagentStart.hook.ts — Log agent spawn events
 *
 * PURPOSE:
 * Tracks when subagents are spawned, capturing type and description
 * for observability and agent workflow analysis.
 *
 * TRIGGER: SubagentStart
 *
 * INPUT (stdin JSON):
 * - session_id: string
 * - hook_event_name: "SubagentStart"
 * - agent_type?: string (e.g., "Explore", "Engineer")
 * - agent_id?: string
 *
 * OUTPUT: Silent (event logged to events.jsonl)
 *
 * PERFORMANCE: <10ms — single appendEvent call
 */

import { appendEvent } from './lib/event-emitter';

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  agent_type?: string;
  agent_id?: string;
  description?: string;
  prompt?: string;
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

    // Extract description preview (first 100 chars)
    const desc = (input.description || input.prompt || '').slice(0, 100);

    appendEvent({
      type: 'agent.start',
      source: 'SubagentStart.hook.ts',
      agent_type: input.agent_type || 'unknown',
      agent_id: input.agent_id,
      description: desc || undefined,
    });

    process.exit(0);
  } catch {
    // Fail-open — never block agent spawning
    process.exit(0);
  }
}

main();
