import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

describe('automerge-cron.sh', () => {
  let tempDir: string;
  let scriptPath: string;
  let autoMergeMockPath: string;
  let logsDir: string;
  let mockServerUrl: string;
  let server: any;
  let requestLogs: any[] = [];

  beforeAll(() => {
    tempDir = createTempDir('automerge-cron-test-');

    // Create a mock JulesAutoMerge.ts
    const paiToolsDir = join(tempDir, 'PAI', 'Tools');
    mkdirSync(paiToolsDir, { recursive: true });
    autoMergeMockPath = join(paiToolsDir, 'JulesAutoMerge.ts');

    // Create a mock script directory
    const scriptsDir = join(tempDir, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    scriptPath = join(scriptsDir, 'automerge-cron.sh');

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

    // Read the original automerge-cron.sh, but replace the paths and ports to use our tempDir
    const originalScriptPath = join(process.cwd(), 'scripts', 'automerge-cron.sh');
    let scriptContent = readFileSync(originalScriptPath, 'utf-8');

    // Replace hardcoded HOME/.claude paths with tempDir paths
    scriptContent = scriptContent.replace(/\$HOME\/\.claude/g, tempDir);
    // Replace localhost:8888 with our mock server
    scriptContent = scriptContent.replace(/http:\/\/localhost:8888/g, mockServerUrl);
    // Speed up timeout to make tests fast
    scriptContent = scriptContent.replace(/timeout 300/g, 'timeout 1');

    writeFileSync(scriptPath, scriptContent);
    execSync(`chmod +x ${scriptPath}`);
  });

  afterAll(() => {
    cleanupTempDir(tempDir);
    if (server) {
      server.stop();
    }
  });

  it('runs JulesAutoMerge and outputs to log correctly without notifications on 0 merged', async () => {
    requestLogs = [];

    // Mock JulesAutoMerge that succeeds with no changes
    writeFileSync(autoMergeMockPath, `console.log("No PRs found. Merged: 0");`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `automerge-${dateStr}.log`);
    expect(existsSync(logFile)).toBe(true);

    const content = readFileSync(logFile, 'utf-8').trim();
    expect(content).toContain('AutoMerge cron start');
    expect(content).toContain('No PRs found');
    expect(content).toContain('AutoMerge cron end');

    // No voice notification when 0 merged and 0 failed
    expect(requestLogs.length).toBe(0);
  });

  it('sends a voice notification when a PR is merged', async () => {
    requestLogs = [];

    // Mock JulesAutoMerge that merges 1 PR
    writeFileSync(autoMergeMockPath, `console.log("Successfully MERGED PR #123");`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    // Voice notification sent on merge
    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/notify');
    expect(requestLogs[0].body.message).toContain('AutoMerge: 1 merged, 0 failed');
  });

  it('sends a voice notification when a PR fails', async () => {
    requestLogs = [];

    // Mock JulesAutoMerge that fails 1 PR
    writeFileSync(autoMergeMockPath, `console.log("Tests FAIL for PR #124");`);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);

    // Voice notification sent on failure
    expect(requestLogs.length).toBe(1);
    expect(requestLogs[0].path).toBe('/notify');
    expect(requestLogs[0].body.message).toContain('AutoMerge: 0 merged, 1 failed');
  });

  it('handles timeout correctly', async () => {
    requestLogs = [];

    // Mock JulesAutoMerge that sleeps indefinitely
    writeFileSync(autoMergeMockPath, `
      setInterval(() => {}, 1000);
      console.log("Started long process...");
    `);

    const proc = Bun.spawn(['bash', scriptPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, HOME: tempDir },
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0); // the script itself shouldn't fail even if timeout happens

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = join(logsDir, `automerge-${dateStr}.log`);
    const content = readFileSync(logFile, 'utf-8').trim();
    expect(content).toContain('AutoMerge crashed or timed out');
  });
});
