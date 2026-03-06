#!/usr/bin/env bun
/**
 * EventLogger.hook.ts — Unified event logger for pure-observability hooks
 *
 * PURPOSE:
 * Single hook that handles multiple Claude Code events that only need
 * logging to events.jsonl. Replaces separate pure-logger hooks:
 * - SubagentStart    → agent.start
 * - SubagentStop     → agent.stop
 * - TaskCompleted    → task.completed
 * - InstructionsLoaded → instructions.loaded (v2.1.69+)
 * - TeammateIdle     → teammate.idle (v2.1.69+, responds with continue:false for long-idle)
 *
 * TRIGGERS: SubagentStart, SubagentStop, TaskCompleted, InstructionsLoaded, TeammateIdle
 *
 * ROUTING: Uses hook_event_name from stdin JSON to determine event type.
 * Falls back to custom.unknown for unrecognized events.
 *
 * OUTPUT: Silent (events logged to events.jsonl via appendEvent)
 *
 * PERFORMANCE: <10ms — single appendEvent call per invocation
 *
 * DESIGN: This hook is intentionally thin. Hooks that do real work
 * (PRDSync, VoiceCompletion, RatingCapture, etc.) keep their own files.
 * Only pure event-loggers are consolidated here.
 */

import { appendEvent } from './lib/event-emitter';
import { emitHookError } from './lib/hook-error-emitter';

// ── Shared stdin reader ──

async function readStdin(timeout = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);
    process.stdin.on('data', chunk => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

// ── Event handlers ──

function handleSubagentStart(input: Record<string, unknown>): void {
  const desc = String(input.description || input.prompt || '').slice(0, 100);
  appendEvent({
    type: 'agent.start',
    source: 'EventLogger',
    agent_type: String(input.agent_type || 'unknown'),
    agent_id: input.agent_id as string | undefined,
    description: desc || undefined,
  });
}

function handleSubagentStop(input: Record<string, unknown>): void {
  const preview = String(input.last_assistant_message || '').slice(0, 200);
  appendEvent({
    type: 'agent.stop',
    source: 'EventLogger',
    agent_id: input.agent_id as string | undefined,
    agent_type: input.agent_type as string | undefined,
    transcript_path: (input.agent_transcript_path || input.transcript_path) as string | undefined,
    last_message_preview: preview || undefined,
  });
}

function handleTaskCompleted(input: Record<string, unknown>): void {
  appendEvent({
    type: 'task.completed',
    source: 'EventLogger',
    task_id: input.task_id as string | undefined,
    task_subject: input.task_subject as string | undefined,
  });
}

function handleInstructionsLoaded(input: Record<string, unknown>): void {
  const files = Array.isArray(input.files) ? input.files.map(String) : [];
  appendEvent({
    type: 'instructions.loaded',
    source: 'EventLogger',
    files: files.length > 0 ? files : undefined,
    count: files.length || undefined,
  });
}

function handleTeammateIdle(input: Record<string, unknown>): void {
  appendEvent({
    type: 'teammate.idle',
    source: 'EventLogger',
    agent_id: input.agent_id as string | undefined,
    idle_reason: input.idle_reason as string | undefined,
  });
}

// ── Routing table ──

const HANDLERS: Record<string, (input: Record<string, unknown>) => void> = {
  SubagentStart: handleSubagentStart,
  SubagentStop: handleSubagentStop,
  TaskCompleted: handleTaskCompleted,
  InstructionsLoaded: handleInstructionsLoaded,
  TeammateIdle: handleTeammateIdle,
};

// ── Response generators (hooks that need to output JSON to stdout) ──

const RESPONDERS: Record<string, (input: Record<string, unknown>) => object | null> = {
  TeammateIdle: () => {
    // Stop idle teammates — they consume resources without progress
    return { continue: false, stopReason: 'PAI: teammate idle timeout' };
  },
};

// ── Main ──

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); }

    const input: Record<string, unknown> = JSON.parse(raw);
    const eventName = String(input.hook_event_name || '');

    const handler = HANDLERS[eventName];
    if (handler) {
      handler(input);
    } else {
      // Unknown event — log as custom for visibility
      appendEvent({
        type: `custom.unknown` as any,
        source: 'EventLogger',
        hook_event_name: eventName,
      } as any);
    }

    // Some events expect a JSON response on stdout
    const responder = RESPONDERS[eventName];
    if (responder) {
      const response = responder(input);
      if (response) {
        process.stdout.write(JSON.stringify(response));
      }
    }

    process.exit(0);
  } catch (err) {
    // Fail-open — never block any event
    emitHookError('EventLogger', err);
    process.exit(0);
  }
}

main().catch((err) => { emitHookError('EventLogger', err); process.stderr.write(`[EventLogger] error description: ${err}\n`); process.exit(0); });
