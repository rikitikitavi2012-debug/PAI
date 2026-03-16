import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { serve, type Server } from 'bun';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('VoiceCompletion (Send Scenarios)', () => {
  let tempDir: string;
  let server: Server;
  let requests: Request[] = [];
  let requestBodies: any[] = [];
  let mockServerStatus = 200;

  beforeAll(() => {
    // Start mock ElevenLabs server
    server = serve({
      port: 8888,
      async fetch(req) {
        requests.push(req);

        if (req.method === 'POST' && new URL(req.url).pathname === '/notify') {
          const body = await req.json();
          requestBodies.push(body);

          if (mockServerStatus === 200) {
            return new Response('OK', { status: 200 });
          } else {
            return new Response('Error', { status: mockServerStatus });
          }
        }

        return new Response('Not Found', { status: 404 });
      },
    });
  });

  afterAll(() => {
    server.stop();
  });

  beforeEach(() => {
    requests = [];
    requestBodies = [];
    mockServerStatus = 200;
  });

  const hookPath = 'hooks/VoiceCompletion.hook.ts';

  test('1 & 2: sends POST to localhost:8888/notify with correct voice_id from settings.json', async () => {
    tempDir = createTempDir('voice-completion-test');

    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      daidentity: {
        name: 'PAI',
        voices: {
          main: {
            voiceId: 'test-voice-id-123'
          }
        }
      }
    }));

    const transcriptPath = join(tempDir, 'transcript.jsonl');
    writeFileSync(transcriptPath, [
      JSON.stringify({ type: 'user', message: { content: [{type: 'text', text: 'hello'}] } }),
      JSON.stringify({ type: 'assistant', message: { content: '🗣️ PAI: Hello world, this is a test notification.' } })
    ].join('\n'));

    const result = await runHook(
      hookPath,
      {
        session_id: 'test-session-123',
        transcript_path: transcriptPath
      },
      { PAI_DIR: tempDir, CLAUDE_CODE_AGENT_TASK_ID: '' } // clear the subagent env
    );

    expect(result.exitCode).toBe(0);
    expect(requests.length).toBe(1);
    expect(new URL(requests[0].url).pathname).toBe('/notify');
    expect(requests[0].method).toBe('POST');
    expect(requestBodies.length).toBe(1);
    expect(requestBodies[0].message).toBe('Hello world, this is a test notification.');
    expect(requestBodies[0].voice_id).toBe('test-voice-id-123');

    cleanupTempDir(tempDir);
  });

  test('3: fails open if API returns empty/error response (does not crash)', async () => {
    tempDir = createTempDir('voice-completion-test');

    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      daidentity: { name: 'PAI', voices: { main: { voiceId: 'fail-open-test-id' } } }
    }));

    const transcriptPath = join(tempDir, 'transcript.jsonl');
    writeFileSync(transcriptPath, [
      JSON.stringify({ type: 'user', message: { content: [{type: 'text', text: 'hello'}] } }),
      JSON.stringify({ type: 'assistant', message: { content: '🗣️ PAI: Testing fail open logic.' } })
    ].join('\n'));

    mockServerStatus = 500;

    const result = await runHook(
      hookPath,
      {
        session_id: 'test-session-500',
        transcript_path: transcriptPath
      },
      { PAI_DIR: tempDir, CLAUDE_CODE_AGENT_TASK_ID: '' }
    );

    expect(result.exitCode).toBe(0); // process.exit(0) on fail-open
    expect(requests.length).toBe(1);
    expect(result.stderr).toContain('Server error:');

    cleanupTempDir(tempDir);
  });

  test('4: fails open on connection timeout (no crash)', async () => {
    tempDir = createTempDir('voice-completion-test');

    writeFileSync(join(tempDir, 'settings.json'), JSON.stringify({
      daidentity: { name: 'PAI', voices: { main: { voiceId: 'timeout-test-id' } } }
    }));

    const transcriptPath = join(tempDir, 'transcript.jsonl');
    writeFileSync(transcriptPath, [
      JSON.stringify({ type: 'user', message: { content: [{type: 'text', text: 'hello'}] } }),
      JSON.stringify({ type: 'assistant', message: { content: '🗣️ PAI: Testing timeout fail open.' } })
    ].join('\n'));

    // Server is off for this test to trigger timeout/refused error
    server.stop();

    const result = await runHook(
      hookPath,
      {
        session_id: 'test-session-timeout',
        transcript_path: transcriptPath
      },
      { PAI_DIR: tempDir, CLAUDE_CODE_AGENT_TASK_ID: '' }
    );

    expect(result.exitCode).toBe(0); // process.exit(0) on fail-open
    expect(result.stderr).toContain('Failed to send:');

    // restart server for subsequent tests
    server = serve({
      port: 8888,
      async fetch(req) {
        requests.push(req);
        if (req.method === 'POST' && new URL(req.url).pathname === '/notify') {
          const body = await req.json();
          requestBodies.push(body);
          return new Response('OK', { status: mockServerStatus });
        }
        return new Response('Not Found', { status: 404 });
      },
    });

    cleanupTempDir(tempDir);
  });

  test('5: missing settings.json falls back to default voice_id', async () => {
    tempDir = createTempDir('voice-completion-test');
    // We intentionally do NOT create settings.json here

    const transcriptPath = join(tempDir, 'transcript.jsonl');
    writeFileSync(transcriptPath, [
      JSON.stringify({ type: 'user', message: { content: [{type: 'text', text: 'hello'}] } }),
      // Because there's no settings.json, default DA name is "PAI" (from identity.ts)
      JSON.stringify({ type: 'assistant', message: { content: '🗣️ PAI: Testing missing settings fallback.' } })
    ].join('\n'));

    const result = await runHook(
      hookPath,
      {
        session_id: 'test-session-missing-settings',
        transcript_path: transcriptPath
      },
      { PAI_DIR: tempDir, CLAUDE_CODE_AGENT_TASK_ID: '' }
    );

    expect(result.exitCode).toBe(0);
    expect(requests.length).toBe(1);

    // Check request body format and contents
    expect(requestBodies.length).toBe(1);
    // Based on hooks/lib/identity.ts, default mainDAVoiceID is ''
    expect(requestBodies[0].voice_id).toBe('');

    cleanupTempDir(tempDir);
  });
});
