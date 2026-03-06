/**
 * event-emitter.ts — appendEvent() utility for the Unified Event System
 *
 * Writes typed events to MEMORY/STATE/events.jsonl (append-only).
 * Auto-injects timestamp and session_id. Graceful failure — write errors
 * are silently swallowed so events never block or crash a hook.
 *
 * See: PAI/THEHOOKSYSTEM.md § Unified Event System
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { EventInput, PAIEvent } from './event-types';
import { getPaiDir } from './paths';
import { rotateIfNeeded } from './event-rotation';

const BASE_DIR = getPaiDir();
const EVENTS_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'events.jsonl');

let appendCount = 0;

/**
 * Get the events.jsonl file path (for external consumers like fs.watch)
 */
export function getEventsPath(): string {
  return EVENTS_PATH;
}

/**
 * Append a typed event to events.jsonl.
 *
 * Auto-injects:
 * - timestamp: ISO 8601
 * - session_id: from CLAUDE_SESSION_ID env var
 *
 * Errors are silently swallowed — this is observability, not critical path.
 */
export function appendEvent(input: EventInput): void {
  try {
    const event: PAIEvent = {
      ...input,
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
    } as PAIEvent;

    // Ensure directory exists on first write
    const dir = dirname(EVENTS_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n', 'utf-8');

    appendCount++;
    if (appendCount >= 100) {
      rotateIfNeeded(EVENTS_PATH, 5000);
      appendCount = 0;
    }
  } catch {
    // Graceful failure — events are observability, not critical path
  }
}
