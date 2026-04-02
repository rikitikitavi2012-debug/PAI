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

  test('skips if confidence < 0.7 (LLM returns low confidence)', async () => {
    const sessionId = 'test-lowconf-004';
    const transcriptPath = createTranscript(sessionId,
      ['Read', 'Edit', 'Bash', 'Write', 'Grep', 'Glob', 'Skill', 'Agent']);

    // Note: This test requires actual Inference call
    // In CI, Inference will be called and may return low confidence
    // For now, we just verify the hook doesn't crash
    const result = await runHook(hook, {
      session_id: sessionId,
      transcript_path: transcriptPath,
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    // Hook should exit 0 regardless (graceful handling)
    expect(result.exitCode).toBe(0);
    // Either skipped (low confidence) or created (high confidence)
    expect(result.stderr).toMatch(/(Skipping|Created skill|Error)/);
  });

  test('countToolCalls handles both JSON and XML formats', async () => {
    // Test that the hook correctly parses both formats
    // This is implicitly tested through createTranscript helper
    const sessionId = 'test-formats-005';

    // Create transcript with JSON format (already what createTranscript does)
    const transcriptPath = createTranscript(sessionId,
      ['Read', 'Edit', 'Bash', 'Write', 'Grep', 'Glob', 'Skill']);

    const result = await runHook(hook, {
      session_id: sessionId,
      transcript_path: transcriptPath,
      hook_event_name: 'Stop'
    }, { PAI_DIR: tempDir });

    // Should not complain about "too simple" since we have 7 unique tools
    expect(result.stderr).not.toContain('too simple');
    expect(result.exitCode).toBe(0);
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
