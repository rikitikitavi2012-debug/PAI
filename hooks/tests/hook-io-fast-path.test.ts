import { describe, expect, test, spyOn, afterEach } from 'bun:test';
import { parseTranscriptFromInput, type HookInput } from '../lib/hook-io';
import * as TranscriptParser from '../../PAI/Tools/TranscriptParser';

describe('hook-io fast path', () => {
  afterEach(() => {
    spyOn(TranscriptParser, 'extractVoiceCompletion').mockRestore();
    spyOn(TranscriptParser, 'extractCompletionPlain').mockRestore();
    spyOn(TranscriptParser, 'parseTranscript').mockRestore();
  });

  test('Fast path: uses last_assistant_message and extracts voice completion directly', async () => {
    // 5. The function imports extractVoiceCompletion from TranscriptParser
    // We mock these exported functions to verify they are called directly
    const extractVoiceSpy = spyOn(TranscriptParser, 'extractVoiceCompletion').mockReturnValue('fast-voice');
    const extractPlainSpy = spyOn(TranscriptParser, 'extractCompletionPlain').mockReturnValue('fast-plain');
    const parseSpy = spyOn(TranscriptParser, 'parseTranscript').mockReturnValue({} as any);

    const input: HookInput = {
      session_id: 'test-session',
      transcript_path: '/dev/null',
      hook_event_name: 'test-event',
      // 1. parseTranscriptFromInput() checks for input.last_assistant_message
      last_assistant_message: 'Hello! 🗣️*PAI:* Task done',
    };

    const start = Date.now();
    const result = await parseTranscriptFromInput(input);
    const elapsed = Date.now() - start;

    // 2. If last_assistant_message exists, it calls extractVoiceCompletion() directly
    expect(extractVoiceSpy).toHaveBeenCalledWith(input.last_assistant_message);
    expect(extractPlainSpy).toHaveBeenCalledWith(input.last_assistant_message);
    // Ensure the slow path (parseTranscript) was NOT called
    expect(parseSpy).not.toHaveBeenCalled();

    // Fast path shouldn't use the 300ms delay
    expect(elapsed).toBeLessThan(100);

    // 3. The fast path returns a ParsedTranscript with voiceCompletion field
    expect(result).toHaveProperty('voiceCompletion', 'fast-voice');
    expect(result).toHaveProperty('completionPlain', 'fast-plain');
    expect(result).toHaveProperty('fullResponse', input.last_assistant_message);
  });

  test('Slow path: uses 300ms delay when last_assistant_message is missing', async () => {
    const parseSpy = spyOn(TranscriptParser, 'parseTranscript').mockReturnValue({
      voiceCompletion: 'slow-voice',
      completionPlain: 'slow-plain',
    } as any);

    const input: HookInput = {
      session_id: 'test-session',
      transcript_path: '/dev/null',
      hook_event_name: 'test-event',
      // last_assistant_message is omitted to trigger the slow path
    };

    const start = Date.now();
    const result = await parseTranscriptFromInput(input);
    const elapsed = Date.now() - start;

    // 4. The slow path uses a 300ms delay (not 150ms)
    // We expect the elapsed time to be at least 300ms (allow a tiny tolerance for event loop precision)
    expect(elapsed).toBeGreaterThanOrEqual(290);

    // Verify it fell back to reading the transcript file via parseTranscript
    expect(parseSpy).toHaveBeenCalledWith(input.transcript_path);

    // Check returned values
    expect(result).toHaveProperty('voiceCompletion', 'slow-voice');
    expect(result).toHaveProperty('completionPlain', 'slow-plain');
  });
});
