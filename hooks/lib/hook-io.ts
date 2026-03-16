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
