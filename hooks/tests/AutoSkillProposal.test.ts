import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';

describe('AutoSkillProposal', () => {
  const hook = 'hooks/AutoSkillProposal.hook.ts';
  let tempDir: string;
  let stateDir: string;
  let transcriptDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-skill-proposal-');
    stateDir = join(tempDir, 'MEMORY', 'STATE');
    transcriptDir = join(tempDir, 'transcripts');

    mkdirSync(stateDir, { recursive: true });
    mkdirSync(join(tempDir, 'skills', 'auto'), { recursive: true });
    mkdirSync(transcriptDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  /**
   * Helper: Create a mock transcript file with tool calls
   */
  function createTranscript(sessionId: string, tools: string[]): string {
    const transcriptPath = join(transcriptDir, `${sessionId}.jsonl`);

    // Build a transcript with tool_use blocks in JSON format
    const lines = [
      JSON.stringify({ type: 'user', message: 'test prompt', sessionId, timestamp: new Date().toISOString() }),
    ];

    // Add assistant message with tool_use blocks
    const toolBlocks = tools.map((tool, i) => ({
      type: 'tool_use',
      id: `call_${i}`,
      name: tool,
      input: {}
    }));

    lines.push(JSON.stringify({
      type: 'assistant',
      content: [
        { type: 'text', text: 'Working on it...' },
        ...toolBlocks
      ],
      sessionId,
      timestamp: new Date().toISOString()
    }));

    writeFileSync(transcriptPath, lines.join('\n'));
    return transcriptPath;
  }

  test('skips if transcript too short (<200 chars)', async () => {
    const sessionId = 'test-short-001';
    const transcriptPath = join(transcriptDir, `${sessionId}.jsonl`);
    mkdirSync(join(transcriptDir, '..'), { recursive: true });
    writeFileSync(transcriptPath, '{"type":"user","message":"hi"}');

    const result = await runHook(hook, {
      session_id: sessionId,
      transcript_path: transcriptPath,
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('too short');
  });

  test('skips if session too simple (<5 unique tools)', async () => {
    const sessionId = 'test-simple-002';
    const transcriptPath = createTranscript(sessionId, ['Read', 'Read', 'Read', 'Bash']); // Only 2 unique tools

    const result = await runHook(hook, {
      session_id: sessionId,
      transcript_path: transcriptPath,
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('too simple');
  });

  test('skips if rate limit reached (same session)', async () => {
    const sessionId = 'test-ratelimit-003';

    // Write proposal state file
    const statePath = join(stateDir, 'skill-proposal-state.json');
    writeFileSync(statePath, JSON.stringify({
      lastSessionId: sessionId,
      lastProposalTime: new Date().toISOString()
    }));

    const transcriptPath = createTranscript(sessionId, ['Read', 'Edit', 'Bash', 'Write', 'Grep', 'Glob']);

    const result = await runHook(hook, {
      session_id: sessionId,
      transcript_path: transcriptPath,
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Rate limited');
  });

  // NOTE: This test requires real Inference API call which is slow/flaky in CI
  // The confidence check is implicitly tested through:
  // 1. Manual testing with real transcripts
  // 2. The hook's graceful error handling verified in other tests
  test.skip('skips if confidence < 0.7 (LLM returns low confidence)', async () => {
    // Skipped: requires real API call
  });

  // NOTE: This test requires real Inference API call
  // The tool counting is verified through the "too simple" test
  test.skip('countToolCalls handles both JSON and XML formats', async () => {
    // Skipped: requires real API call after tool counting
  });

  test('handles missing transcript file gracefully', async () => {
    const result = await runHook(hook, {
      session_id: 'test-nofile-006',
      transcript_path: '/nonexistent/path.jsonl',
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
    // Should handle gracefully without crashing
  });

  test('handles empty stdin gracefully', async () => {
    const result = await runHook(hook, {}, { PAI_DIR: tempDir });
    expect(result.exitCode).toBe(0);
  });
});
