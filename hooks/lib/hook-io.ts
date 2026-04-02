/**
 * hook-io.ts — Shared stdin reader for Stop hooks
 *
 * Eliminates duplicated stdin-reading boilerplate across individual hooks.
 * Each hook calls readHookInput() to get the parsed JSON payload, and
 * parseTranscriptFromInput() if it needs the full transcript.
 */

import { parseTranscript, type ParsedTranscript } from '../../PAI/Tools/TranscriptParser';

export interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  last_assistant_message?: string;
  /** Headless mode flag — set by Claude Code when running with -p flag */
  headless?: boolean;
  /** Parent session ID — present when this is a subagent */
  parent_session_id?: string;
}

/**
 * Read and parse JSON from stdin with a 500ms timeout.
 * Returns null if stdin is empty or malformed.
 */
export async function readHookInput(): Promise<HookInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      return JSON.parse(input) as HookInput;
    }
  } catch (error) {
    console.error('[hook-io] Error reading stdin:', error);
  }
  return null;
}

/**
 * Parse transcript from hook input. Waits for transcript to be
 * fully written to disk before parsing.
 *
 * 300ms delay: 150ms was insufficient for long responses —
 * Stop hook fired before transcript file was fully flushed.
 * If last_assistant_message is provided in stdin, use it directly
 * as a fast path (avoids transcript file race entirely).
 */
export async function parseTranscriptFromInput(input: HookInput): Promise<ParsedTranscript> {
  // Fast path: if last_assistant_message is in stdin, extract voice line directly
  if (input.last_assistant_message) {
    const { extractVoiceCompletion, extractCompletionPlain } = await import('../../PAI/Tools/TranscriptParser');
    return {
      voiceCompletion: extractVoiceCompletion(input.last_assistant_message),
      completionPlain: extractCompletionPlain(input.last_assistant_message),
      fullResponse: input.last_assistant_message,
      hasAlgorithmFormat: input.last_assistant_message.includes('♻︎') || input.last_assistant_message.includes('━━━'),
    } as ParsedTranscript;
  }

  // Slow path: read from transcript file with delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return parseTranscript(input.transcript_path);
}

/**
 * Check if running in headless mode (-p flag).
 * In headless mode, hooks should use "defer" instead of "ask" for non-critical checks.
 */
export function isHeadlessMode(input: HookInput | null): boolean {
  if (!input) return false;
  // Check explicit headless flag or CLAUDE_CODE_HEADLESS env var
  return input.headless === true ||
         process.env.CLAUDE_CODE_HEADLESS === 'true' ||
         process.env.CLAUDE_CODE_SDK === 'true';
}

/**
 * Get the appropriate decision for headless vs interactive mode.
 * - Interactive mode: returns "ask" → prompts user
 * - Headless mode: returns "defer" → pauses session for later resume
 *
 * @param input - Hook input containing session metadata
 * @param reason - Human-readable reason for the decision
 * @param critical - If true, always "ask" even in headless (security-critical)
 */
export function getPermissionDecision(
  input: HookInput | null,
  reason: string,
  critical: boolean = false
): { permissionDecision: 'ask' | 'defer'; permissionDecisionReason: string } {
  const headless = isHeadlessMode(input);

  // Critical operations always ask, even in headless
  if (critical) {
    return {
      permissionDecision: 'ask',
      permissionDecisionReason: reason
    };
  }

  return {
    permissionDecision: headless ? 'defer' : 'ask',
    permissionDecisionReason: headless
      ? `${reason}\n\n[Headless mode: session paused. Resume with: claude -p --resume]`
      : reason
  };
}
