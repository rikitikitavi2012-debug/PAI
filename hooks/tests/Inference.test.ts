import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import { plugin } from 'bun';

describe('Inference CLI Tool', () => {
  let tempDir: string;
  let mockBinDir: string;

  beforeAll(() => {
    tempDir = createTempDir('inference-test-');
    mockBinDir = join(tempDir, 'bin');
    mkdirSync(mockBinDir, { recursive: true });

    // Create mock config
    mkdirSync(join(tempDir, '.config', 'PAI'), { recursive: true });
    writeFileSync(
      join(tempDir, '.config', 'PAI', '.env'),
      'ZAI_API_KEY=mock_zai_key\nGOOGLE_API_KEY=mock_google_key\n'
    );

    // Mock gemini binary
    const mockGeminiPath = join(mockBinDir, 'gemini');
    writeFileSync(mockGeminiPath, `#!/bin/sh
if [ "$1" = "--prompt" ]; then
  if echo "$2" | grep -q "JSON"; then
    echo '{"status": "mocked gemini json"}'
  else
    echo "mocked gemini response"
  fi
  exit 0
fi
echo "gemini error" >&2
exit 1
`);
    chmodSync(mockGeminiPath, 0o755);

    // Mock claude binary
    const mockClaudePath = join(mockBinDir, 'claude');
    writeFileSync(mockClaudePath, `#!/bin/sh
# read stdin
input=$(cat)
if echo "$input" | grep -q "JSON"; then
  echo '{"status": "mocked claude json"}'
else
  echo "mocked claude response"
fi
exit 0
`);
    chmodSync(mockClaudePath, 0o755);

    mkdirSync(join(tempDir, '.npm-global', 'bin'), { recursive: true });
    writeFileSync(join(tempDir, '.npm-global', 'bin', 'gemini'), `#!/bin/sh
if [ "$1" = "--prompt" ]; then
  if echo "$2" | grep -q "JSON"; then
    echo '{"status": "mocked gemini json"}'
  else
    echo "mocked gemini response"
  fi
  exit 0
fi
echo "gemini error" >&2
exit 1
`);
    chmodSync(join(tempDir, '.npm-global', 'bin', 'gemini'), 0o755);
  });

  afterAll(() => {
    cleanupTempDir(tempDir);
  });

  it('prints usage and exits 1 when no arguments provided', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Usage:');
  });

  describe('Event Emission', () => {
    it('emits inference.ok event for claude provider', async () => {
      const emitDir = createTempDir('inference-emit-claude-');
      const mockBinDirLocal = join(emitDir, 'bin');
      mkdirSync(mockBinDirLocal, { recursive: true });
      const mockClaudePathLocal = join(mockBinDirLocal, 'claude');
      writeFileSync(mockClaudePathLocal, `#!/bin/sh\necho "mocked claude response"\nexit 0\n`);
      chmodSync(mockClaudePathLocal, 0o755);

      // Need an API key, otherwise it fails immediately
      const mockConfigDir = join(emitDir, '.config', 'PAI');
      mkdirSync(mockConfigDir, { recursive: true });
      writeFileSync(join(mockConfigDir, '.env'), 'ANTHROPIC_API_KEY=mock_anthropic_key\n');

      const originalFetch = global.fetch;
      global.fetch = async () => new Response(JSON.stringify({
        content: [{ text: 'mocked claude response' }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });

      const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'fast', 'system prompt', 'user test'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          HOME: emitDir,
          PATH: `${mockBinDirLocal}:${process.env.PATH}`,
          ANTHROPIC_API_KEY: 'mock_anthropic_key', // Also set it here directly
          ANTHROPIC_MOCK_FETCH: '1',
          PAI_DIR: emitDir,
        },
      });

      await proc.exited;

      global.fetch = originalFetch;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const events = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n').map(JSON.parse);
      const event = events[events.length - 1];

      expect(event.type).toBe('inference.ok');
      expect(event.source).toBe('Inference');
      expect(event.data.level).toBe('fast');
      expect(event.data.provider).toBe('claude');
      expect(event.data.model).toBe('haiku');
      expect(event.data.latency_s).toBeDefined();

      cleanupTempDir(emitDir);
    });

    it('emits inference.ok event for gemini provider', async () => {
      const emitDir = createTempDir('inference-emit-gemini-');
      mkdirSync(join(emitDir, '.config', 'PAI'), { recursive: true });
      writeFileSync(join(emitDir, '.config', 'PAI', '.env'), 'GOOGLE_API_KEY=mock_google_key\n');

      const { inference } = require('../../PAI/Tools/Inference.ts');

      const originalFetch = global.fetch;
      global.fetch = async () => new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'mocked gemini response' }] } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });

      const originalHome = process.env.HOME;
      process.env.HOME = emitDir;

      await inference({
        systemPrompt: 'sys',
        userPrompt: 'gemini test',
        level: 'gemini',
        expectJson: false,
        timeout: 5000,
      });

      process.env.HOME = originalHome;
      global.fetch = originalFetch;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const events = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n').map(JSON.parse);
      const event = events[events.length - 1];

      expect(event.type).toBe('inference.ok');
      expect(event.source).toBe('Inference');
      expect(event.data.level).toBe('gemini');
      expect(event.data.provider).toBe('gemini');
      expect(event.data.model).toBe('gemini-pro');

      cleanupTempDir(emitDir);
    });

    it('emits inference.fail event on error', async () => {
      const emitDir = createTempDir('inference-emit-fail-');
      // No config created so gemini fails without API key

      const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'gemini', 'sys', 'test'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          HOME: emitDir,
          GOOGLE_API_KEY: '',
          GEMINI_API_KEY: '',
        },
      });

      await proc.exited;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const events = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n').map(JSON.parse);
      const event = events[events.length - 1];

      expect(event.type).toBe('inference.fail');
      expect(event.source).toBe('Inference');
      expect(event.data.level).toBe('gemini');

      cleanupTempDir(emitDir);
    });

    it('fails gracefully when events dir is un-writable', async () => {
      const emitDir = createTempDir('inference-emit-unwritable-');
      const stateDir = join(emitDir, '.claude', 'MEMORY', 'STATE');
      mkdirSync(stateDir, { recursive: true });
      chmodSync(stateDir, 0o444); // read-only

      const { inference } = require('../../PAI/Tools/Inference.ts');
      const originalFetch = global.fetch;
      global.fetch = async () => new Response(JSON.stringify({
        content: [{ text: 'mocked claude response' }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });

      const originalHome = process.env.HOME;
      process.env.HOME = emitDir;

      const result = await inference({
        systemPrompt: 'sys',
        userPrompt: 'test',
        level: 'fast',
        expectJson: false,
        timeout: 5000,
      });

      process.env.HOME = originalHome;
      global.fetch = originalFetch;

      // Should still return success despite failing to write event
      expect(result.success).toBe(true);
      expect(result.output).toBe('mocked claude response');

      chmodSync(stateDir, 0o755); // restore permission so cleanup works
      cleanupTempDir(emitDir);
    });

    it('emits inference.ok event for zai provider', async () => {
      const emitDir = createTempDir('inference-emit-zai-');
      mkdirSync(join(emitDir, '.config', 'PAI'), { recursive: true });
      writeFileSync(join(emitDir, '.config', 'PAI', '.env'), 'ZAI_API_KEY=mock_zai_key\n');

      const { inference } = require('../../PAI/Tools/Inference.ts');

      const originalFetch = global.fetch;
      global.fetch = async () => new Response(JSON.stringify({
        choices: [{ message: { content: 'mocked zai fetch response' } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });

      const originalHome = process.env.HOME;
      process.env.HOME = emitDir;

      await inference({
        systemPrompt: 'sys',
        userPrompt: 'glm5 test',
        level: 'glm5',
        expectJson: false,
        timeout: 500,
      });

      process.env.HOME = originalHome;
      global.fetch = originalFetch;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const events = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n').map(JSON.parse);
      const event = events[events.length - 1];

      expect(event.type).toBe('inference.ok');
      expect(event.source).toBe('Inference');
      expect(event.data.level).toBe('glm5');
      expect(event.data.provider).toBe('zai');
      expect(event.data.model).toBe('glm-5');

      cleanupTempDir(emitDir);
    });
  });

  it('resolves fast level (Anthropic) correctly', async () => {
    const { inference } = require('../../PAI/Tools/Inference.ts');
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({
      content: [{ text: 'mocked claude response' }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    const result = await inference({
      systemPrompt: 'system prompt',
      userPrompt: 'user test',
      level: 'fast',
      expectJson: false,
      timeout: 5000,
    });

    global.fetch = originalFetch;
    expect(result.success).toBe(true);
    expect(result.output).toBe('mocked claude response');
  });

  it('resolves standard level correctly and respects --timeout', async () => {
    const { inference } = require('../../PAI/Tools/Inference.ts');
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({
      content: [{ text: 'mocked claude response' }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    const result = await inference({
      systemPrompt: 'sys',
      userPrompt: 'standard test',
      level: 'standard',
      expectJson: false,
      timeout: 1000,
    });

    global.fetch = originalFetch;
    expect(result.success).toBe(true);
    expect(result.output).toBe('mocked claude response');
  });

  it('resolves smart level with JSON (Anthropic) correctly', async () => {
    const { inference } = require('../../PAI/Tools/Inference.ts');
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({
      content: [{ text: '{"status": "mocked claude json"}' }]
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test_anthropic_api_key';
    const result = await inference({
      systemPrompt: 'sys',
      userPrompt: 'JSON test',
      level: 'smart',
      expectJson: true,
      timeout: 5000,
    });
    if (originalApiKey !== undefined) process.env.ANTHROPIC_API_KEY = originalApiKey; else delete process.env.ANTHROPIC_API_KEY;

    global.fetch = originalFetch;
    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ status: 'mocked claude json' });
  });

  it('resolves gemini level correctly via direct HTTP API', async () => {
    // Gemini uses direct fetch to generativelanguage.googleapis.com (not CLI subprocess)
    const { inference } = require('../../PAI/Tools/Inference.ts');

    const originalFetch = global.fetch;
    let fetchedUrl = '';

    global.fetch = async (url: any, opts: any) => {
      fetchedUrl = url;
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'mocked gemini response' }] } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    const result = await inference({
      systemPrompt: 'sys',
      userPrompt: 'gemini test',
      level: 'gemini',
      expectJson: false,
      timeout: 5000,
    });

    process.env.HOME = originalHome;
    global.fetch = originalFetch;

    expect(result.success).toBe(true);
    expect(result.output).toBe('mocked gemini response');
    expect(fetchedUrl).toContain('generativelanguage.googleapis.com');
  });

  it('handles gemini level error correctly when no API key', async () => {
    const emptyDir = createTempDir('gemini-empty-');
    mkdirSync(join(emptyDir, '.npm-global', 'bin'), { recursive: true });
    writeFileSync(join(emptyDir, '.npm-global', 'bin', 'gemini'), `#!/bin/sh\necho "ok"\nexit 0`);
    chmodSync(join(emptyDir, '.npm-global', 'bin', 'gemini'), 0o755);

    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'gemini', 'sys', 'test'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: emptyDir,
        GOOGLE_API_KEY: '',
        GEMINI_API_KEY: '',
      },
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('No GOOGLE_API_KEY found');

    cleanupTempDir(emptyDir);
  });

  it('resolves glm5 level (ZAI) correctly and tests fetch endpoint', async () => {
    // We test the glm5 level directly by importing the module to mock fetch.
    const { inference } = require('../../PAI/Tools/Inference.ts');

    // Backup and mock global fetch
    const originalFetch = global.fetch;
    let fetchedUrl = '';
    let fetchedOpts: any = {};

    global.fetch = async (url: any, opts: any) => {
      fetchedUrl = url;
      fetchedOpts = opts;
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'mocked zai fetch response' } }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    // Clear real env vars so mock .env is used
    const originalHome = process.env.HOME;
    const originalZaiKey = process.env.ZAI_API_KEY;
    const originalZAiKey = process.env.Z_AI_API_KEY;
    process.env.HOME = tempDir;
    delete process.env.ZAI_API_KEY;
    delete process.env.Z_AI_API_KEY;

    const result = await inference({
      systemPrompt: 'sys',
      userPrompt: 'glm5 test',
      level: 'glm5',
      expectJson: false,
      timeout: 500,
    });

    process.env.HOME = originalHome;
    if (originalZaiKey) process.env.ZAI_API_KEY = originalZaiKey;
    if (originalZAiKey) process.env.Z_AI_API_KEY = originalZAiKey;

    // Restore fetch
    global.fetch = originalFetch;

    expect(result.success).toBe(true);
    expect(result.output).toBe('mocked zai fetch response');

    // Verify endpoint and headers
    expect(fetchedUrl).toBe('https://api.z.ai/api/coding/paas/v4/chat/completions');
    expect(fetchedOpts.method).toBe('POST');
    expect(fetchedOpts.headers['Authorization']).toBe('Bearer mock_zai_key');

    // Verify timeout was passed (AbortSignal)
    expect(fetchedOpts.signal).toBeDefined();
  });

  it('fails gracefully when ZAI_API_KEY is missing for glm5 level', async () => {
    const emptyDir = createTempDir('zai-empty-');

    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'glm5', 'sys', 'glm5 test'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: emptyDir,
        ZAI_API_KEY: '',
      },
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('No ZAI_API_KEY found');

    cleanupTempDir(emptyDir);
  });
});
