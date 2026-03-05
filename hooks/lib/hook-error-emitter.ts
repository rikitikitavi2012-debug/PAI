/**
 * hook-error-emitter.ts — Emit hook.error events when hooks fail silently
 *
 * All PAI hooks are fail-open (catch errors, exit 0). This means failures
 * are invisible. This utility emits a hook.error event to events.jsonl
 * so failures surface in telemetry dashboards.
 *
 * Usage in hooks:
 *   import { emitHookError } from './lib/hook-error-emitter';
 *   main().catch((err) => { emitHookError('HookName', err); process.exit(0); });
 *
 * CRITICAL: This function itself is fail-open — it never throws.
 */

import { appendEvent } from './event-emitter';
import type { HookErrorEvent } from './event-types';

export function emitHookError(hookName: string, error: unknown): void {
  try {
    const event: Omit<HookErrorEvent, 'timestamp' | 'session_id'> = {
      type: 'hook.error',
      source: hookName,
      hook_name: hookName,
      error: error instanceof Error ? error.message : String(error),
    };
    appendEvent(event);
  } catch {
    // Fail-open: never block on error tracking
  }
}
