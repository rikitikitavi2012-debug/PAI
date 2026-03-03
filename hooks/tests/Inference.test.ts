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

  it('resolves fast level (Anthropic) correctly', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'fast', 'system prompt', 'user test'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        PATH: `${mockBinDir}:${process.env.PATH}`,
      },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout.trim()).toBe('mocked claude response');
  });

  it('resolves standard level correctly and respects --timeout', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'standard', '--timeout', '1000', 'sys', 'standard test'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        PATH: `${mockBinDir}:${process.env.PATH}`,
      },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout.trim()).toBe('mocked claude response');
  });

  it('resolves smart level with JSON (Anthropic) correctly', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/Inference.ts', '--level', 'smart', '--json', 'sys', 'JSON test'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        PATH: `${mockBinDir}:${process.env.PATH}`,
      },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.status).toBe('mocked claude json');
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
