import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

describe('health-cron.sh', () => {
  let tempDir: string;
  let scriptPath: string;
  let healthMonitorMockPath: string;
  let logsDir: string;
  let mockServerUrl: string;
  let server: any;
  let requestLogs: any[] = [];

  beforeAll(() => {
    tempDir = createTempDir('health-cron-test-');

    // Create a mock HealthMonitor.ts
    const paiToolsDir = join(tempDir, 'PAI', 'Tools');
    mkdirSync(paiToolsDir, { recursive: true });
    healthMonitorMockPath = join(paiToolsDir, 'HealthMonitor.ts');

    // Create a mock script directory
    const scriptsDir = join(tempDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    scriptPath = join(scriptsDir, 'health-cron.sh');

    logsDir = join(tempDir, 'MEMORY', 'STATE', 'health-logs');
    mkdirSync(logsDir, { recursive: true });

    // Mock VoiceServer for notifications
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        if (req.method === 'POST') {
          const url = new URL(req.url);
          let body = null;
          try {
            body = await req.json();
          } catch {
            body = await req.text();
          }
          requestLogs.push({ method: req.method, path: url.pathname, body });
          return new Response('OK', { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      },
    });

    mockServerUrl = `http://localhost:${server.port}`;

    // Read the original health-cron.sh, but replace the paths and ports to use our tempDir
    const originalScriptPath = join(process.cwd(), 'scripts', 'health-cron.sh');
    let scriptContent = readFileSync(originalScriptPath, 'utf-8');

    // Replace hardcoded HOME/.claude paths with tempDir paths
    scriptContent = scriptContent.replace(/\$HOME\/\.claude/g, tempDir);
    // Replace localhost:8888 with our mock server
    scriptContent = scriptContent.replace(/http:\/\/localhost:8888/g, mockServerUrl);

    writeFileSync(scriptPath, scriptContent);
    execSync(`chmod +x ${scriptPath}`);
  });

  afterAll(() => {
    cleanupTempDir(tempDir);
    if (server) {
      server.stop();
    }
  });

  it('outputs valid JSONL format and handles successful health checks', async () => {
    requestLogs = [];
    const successResult = {
      timestamp: new Date().toISOString(),
      checks: [{ service: 'AgentZero', status: 'up' }],
      allHealthy: true
    };
    writeFileSync(healthMonitorMockPath, `console.log(JSON.stringify(${JSON.stringify(successResult)}));`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `health-${dateStr}.jsonl`);
    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, 'utf-8').trim();
    expect(content.split('\n').length).toBeGreaterThanOrEqual(1);
    const lastLine = JSON.parse(content.split('\n').pop() || '{}');
    expect(lastLine.allHealthy).toBe(true);

    // No voice notification on success
    expect(requestLogs.length).toBe(0);
  });

  it('sends a voice notification on health check failure', async () => {
    requestLogs = [];
    const failureResult = {
      timestamp: new Date().toISOString(),
      checks: [
        { service: 'AgentZero', status: 'down' },
        { service: 'VoiceServer', status: 'up' },
        { service: 'GeminiCLI', status: 'down' }
      ],
      allHealthy: false
    };
    writeFileSync(healthMonitorMockPath, `console.log(JSON.stringify(${JSON.stringify(failureResult)}));`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `health-${dateStr}.jsonl`);
    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, 'utf-8').trim();
    const lastLine = JSON.parse(content.split('\n').pop() || '{}');
    expect(lastLine.allHealthy).toBe(false);

    // Voice notification sent on failure
    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/notify');
    expect(requestLogs[0].body.message).toContain('Health check');
    expect(requestLogs[0].body.message).toContain('AgentZero, GeminiCLI down');
  });

  it('rotates logs older than 30 days', async () => {
    // Create an old log file
    const oldLogFile = join(logsDir, 'health-2000-01-01.jsonl');
    writeFileSync(oldLogFile, '{"old":"log"}');

    // Set mtime to 40 days ago
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    execSync(`touch -d "${fortyDaysAgo.toISOString()}" ${oldLogFile}`);

    expect(existsSync(oldLogFile)).toBe(true);

    const successResult = {
      timestamp: new Date().toISOString(),
      checks: [],
      allHealthy: true
    };
    writeFileSync(healthMonitorMockPath, `console.log(JSON.stringify(${JSON.stringify(successResult)}));`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    // Old log should be deleted
    expect(existsSync(oldLogFile)).toBe(false);
  });
});
