import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('AgentZero CLI Tool', () => {
  let tempDir: string;
  let mockServerUrl: string;
  let server: any;
  let requestLogs: any[] = [];

  beforeEach(() => {
    requestLogs = [];
  });

  beforeAll(() => {
    tempDir = createTempDir('agent-zero-test-');

    // Create mock config
    mkdirSync(join(tempDir, '.config', 'PAI'), { recursive: true });
    writeFileSync(
      join(tempDir, '.config', 'PAI', '.env'),
      'A0_API_TOKEN=mock_token_123\n'
    );

    // Start mock server
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);
        let body = null;
        if (req.method === 'POST') {
          try {
            body = await req.json();
          } catch {
            body = await req.text();
          }
        }

        requestLogs.push({
          method: req.method,
          path: url.pathname,
          headers: {
            'x-api-key': req.headers.get('x-api-key'),
          },
          body,
        });

        if (url.pathname === '/health') {
          return new Response('OK', { status: 200 });
        }
        if (url.pathname === '/api_message') {
          return Response.json({ context_id: 'ctx-1', response: 'mock response' });
        }
        // message_async is replaced by api_message in updated tool
        // so no explicit message_async route needed, mock /api_message instead handles it
        if (url.pathname === '/api_log_get') {
          return Response.json({ log: ['msg1', 'msg2'] });
        }
        if (url.pathname === '/api_terminate_chat') {
          return new Response('Chat terminated', { status: 200 });
        }
        if (url.pathname === '/scheduler_tasks_list') {
          return Response.json([{ id: 1, name: 'mock task', state: 'active', schedule: '1m', last_run: '1m ago', last_result: 'success' }]);
        }
        if (url.pathname === '/scheduler_task_run') {
          return Response.json({ status: 'started' });
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    mockServerUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    cleanupTempDir(tempDir);
    if (server) {
      server.stop();
    }
  });

  it('prints usage and exits 1 when no arguments provided', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Usage:');
    expect(stderr).toContain('bun AgentZero.ts message');
  });

  it('fails on unknown command', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'invalid-command'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Unknown command: invalid-command');
  });

  it('fails when no API token is found', async () => {
    const emptyDir = createTempDir('agent-zero-empty-');
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'health'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: emptyDir,
        A0_API_TOKEN: '', // explicitly clear
      },
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Error: No A0_API_TOKEN found');

    cleanupTempDir(emptyDir);
  });

  it('fails gracefully on network error', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'health'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: tempDir,
        A0_BASE_URL: 'http://127.0.0.1:0', // Invalid port
      },
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Agent Zero unreachable');
  });

  it('fails gracefully on timeout', async () => {
    const slowServer = Bun.serve({
      port: 0,
      async fetch() {
        await new Promise((resolve) => setTimeout(resolve, 20000));
        return new Response('OK');
      },
    });

    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'health'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        HOME: tempDir,
        A0_BASE_URL: `http://localhost:${slowServer.port}`,
        A0_API_TOKEN: 'token',
      },
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain('Agent Zero unreachable');

    slowServer.stop();
  }, 25000);

  describe('Event Emission', () => {
    it('emits a0.message_sent and a0.response events and saves context for message command', async () => {
      const emitDir = createTempDir('a0-emit-msg-');
      mkdirSync(join(emitDir, '.config', 'PAI'), { recursive: true });
      writeFileSync(join(emitDir, '.config', 'PAI', '.env'), 'A0_API_TOKEN=mock_token_123\n');

      const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'message', 'Hello sync AI', '--context', 'ctx-old'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, HOME: emitDir, A0_BASE_URL: mockServerUrl },
      });

      await proc.exited;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const eventsText = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n');
      expect(eventsText.length).toBe(2);

      const eventSent = JSON.parse(eventsText[0]);
      expect(eventSent.type).toBe('a0.message_sent');
      expect(eventSent.source).toBe('AgentZero');
      expect(eventSent.data.context_id).toBe('ctx-old');
      expect(eventSent.data.preview).toBe('Hello sync AI');

      const eventResp = JSON.parse(eventsText[1]);
      expect(eventResp.type).toBe('a0.response');
      expect(eventResp.source).toBe('AgentZero');
      expect(eventResp.data.context_id).toBe('ctx-1'); // From mock server
      expect(eventResp.data.latency_s).toBeDefined();

      const contextPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'a0-active-context.json');
      const contextState = JSON.parse(require('fs').readFileSync(contextPath, 'utf-8'));
      expect(contextState.context_id).toBe('ctx-1');
      expect(contextState.last_message).toBe('Hello sync AI');

      cleanupTempDir(emitDir);
    });

    it('emits a0.async_sent event and saves context for async command', async () => {
      const emitDir = createTempDir('a0-emit-async-');
      mkdirSync(join(emitDir, '.config', 'PAI'), { recursive: true });
      writeFileSync(join(emitDir, '.config', 'PAI', '.env'), 'A0_API_TOKEN=mock_token_123\n');

      const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'async', 'Long job task', '--context', 'ctx-old'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, HOME: emitDir, A0_BASE_URL: mockServerUrl },
      });

      await proc.exited;

      const eventsPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
      const eventsText = require('fs').readFileSync(eventsPath, 'utf-8').trim().split('\n');
      expect(eventsText.length).toBeGreaterThanOrEqual(1);

      const eventSent = JSON.parse(eventsText[0]);
      expect(eventSent.type).toBe('a0.async_sent');
      expect(eventSent.source).toBe('AgentZero');
      expect(eventSent.data.context_id).toBe('ctx-old');
      expect(eventSent.data.preview).toBe('Long job task');

      const contextPath = join(emitDir, '.claude', 'MEMORY', 'STATE', 'a0-active-context.json');
      const contextState = JSON.parse(require('fs').readFileSync(contextPath, 'utf-8'));
      expect(contextState.context_id).toBe('ctx-1');
      expect(contextState.last_message).toBe('Long job task');

      cleanupTempDir(emitDir);
    });

    it('fails gracefully on write errors', async () => {
      const emitDir = createTempDir('a0-emit-error-');
      mkdirSync(join(emitDir, '.config', 'PAI'), { recursive: true });
      writeFileSync(join(emitDir, '.config', 'PAI', '.env'), 'A0_API_TOKEN=mock_token_123\n');

      const stateDir = join(emitDir, '.claude', 'MEMORY', 'STATE');
      mkdirSync(stateDir, { recursive: true });

      // Make read-only
      const { chmodSync } = require('fs');
      chmodSync(stateDir, 0o444);

      const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'message', 'Test un-writable'], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, HOME: emitDir, A0_BASE_URL: mockServerUrl },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(proc.exitCode).toBe(0);
      expect(stdout).toContain('mock response');

      chmodSync(stateDir, 0o755); // restore to allow cleanup
      cleanupTempDir(emitDir);
    });
  });

  it('health command works correctly', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'health'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain('✅ Agent Zero is running');
    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/health');
    expect(requestLogs[0].method).toBe('GET');
  });

  it('message command parses arguments and sends correct API call', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'message', 'Hello AI', '--context', 'ctx-old'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: 'mock_token_123' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.context_id).toBe('ctx-1');
    expect(result.response).toBe('mock response');

    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/api_message');
    expect(requestLogs[0].headers['x-api-key']).toBe('mock_token_123');
    expect(requestLogs[0].body).toEqual({
      message: 'Hello AI',
      lifetime_hours: 1,
      context_id: 'ctx-old',
    });
  });

  it('async command parses arguments and sends correct API call', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'async', 'Long job'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.context_id).toBe('ctx-1');

    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/api_message');
    expect(requestLogs[0].body.message).toBe('Long job');
    expect(requestLogs[0].body.lifetime_hours).toBe(1);
  });

  it('log command parses arguments and sends correct API call', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'log', 'ctx-99', '50'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(requestLogs[0].path).toBe('/api_log_get');
    expect(requestLogs[0].body).toEqual({
      context_id: 'ctx-99',
      length: 50,
    });
  });

  it('terminate command parses arguments and sends correct API call', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'terminate', 'ctx-99'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain('Chat terminated');
    expect(requestLogs[0].path).toBe('/api_terminate_chat');
    expect(requestLogs[0].body).toEqual({
      context_id: 'ctx-99',
    });
  });

  it('scheduler results parses response and lists correct tasks', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'scheduler', 'results'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain('── mock task ──');
    expect(stdout).toContain('State: active | Schedule: 1m');
    expect(stdout).toContain('Last run: 1m ago');
    expect(stdout).toContain('Result: success');

    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/scheduler_tasks_list');
  });

  it('scheduler run parses arguments and sends correct API call', async () => {
    const proc = Bun.spawn(['bun', 'PAI/Tools/AgentZero.ts', 'scheduler', 'run', 'task-123'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir, A0_BASE_URL: mockServerUrl, A0_API_TOKEN: '' },
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/scheduler_task_run');
    expect(requestLogs[0].body).toEqual({ task: 'task-123' });
  });
});
