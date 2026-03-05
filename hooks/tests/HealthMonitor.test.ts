import { describe, it, expect, mock, afterAll, beforeAll } from 'bun:test';
import { join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { createTempDir, cleanupTempDir } from './harness';

// Set up isolation environment synchronously
const TEST_DIR = createTempDir('health-monitor-');
mkdirSync(join(TEST_DIR, 'MEMORY', 'STATE'), { recursive: true });

describe('HealthMonitor.ts', () => {
  let originalFetch: typeof globalThis.fetch;
  let originalSpawnSync: typeof Bun.spawnSync;
  let originalConsoleLog: typeof console.log;
  let originalBunFile: typeof Bun.file;
  let originalEnvPaiDir: string | undefined;

  let capturedStdout = '';
  let reportJson: any = null;

  beforeAll(async () => {
    originalFetch = globalThis.fetch;
    originalSpawnSync = Bun.spawnSync;
    originalConsoleLog = console.log;
    originalBunFile = Bun.file;
    originalEnvPaiDir = process.env.PAI_DIR;

    process.env.PAI_DIR = TEST_DIR;

    // Mock Bun.file to simulate the .env file containing the API token
    // This avoids globally mocking os.homedir(), which breaks other tests
    Bun.file = ((path: any, ...args: any[]) => {
      const p = path.toString();
      if (p.includes('.env')) {
        return { text: async () => 'A0_API_TOKEN=fake_token\n' };
      }
      return originalBunFile(path, ...args);
    }) as any;

    // Mock fetch to simulate successful network calls
    globalThis.fetch = mock(async (url: any, options: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('50002/api_message')) {
        return new Response(JSON.stringify({ response: 'OK' }), { status: 200 });
      }
      if (urlStr.includes('localhost:8888/health')) {
        return new Response('OK', { status: 200 });
      }
      if (urlStr.includes('api.z.ai')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    });

    // Mock Bun.spawnSync to simulate successful GitHub CLI status
    Bun.spawnSync = mock((cmd: any, options: any) => {
      if (cmd[0] === 'gh') {
        return {
          exitCode: 0,
          stdout: Buffer.from('github.com\n  ✓ Logged in to github.com account\n'),
          stderr: Buffer.from(''),
          success: true,
        } as any;
      }
      if (cmd[0] === 'gemini') {
        return {
          exitCode: 0,
          stdout: Buffer.from('0.31.0\n'),
          stderr: Buffer.from(''),
          success: true,
        } as any;
      }
      return { exitCode: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), success: false } as any;
    });

    // Capture console.log
    console.log = (msg: string) => {
      capturedStdout += msg + '\n';
    };

    // Run the tool by importing it
    // Use an absolute path to prevent dynamic import resolution issues
    const scriptPath = join(process.cwd(), 'PAI/Tools/HealthMonitor.ts');
    await import(scriptPath);

    // Allow floating promises in main() to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      reportJson = JSON.parse(capturedStdout.trim());
    } catch {
      reportJson = null;
    }
  });

  afterAll(() => {
    // Restore original globals
    globalThis.fetch = originalFetch;
    Bun.spawnSync = originalSpawnSync;
    console.log = originalConsoleLog;
    Bun.file = originalBunFile;

    if (originalEnvPaiDir === undefined) {
      delete process.env.PAI_DIR;
    } else {
      process.env.PAI_DIR = originalEnvPaiDir;
    }

    // Clean up temporary directory
    cleanupTempDir(TEST_DIR);
  });

  it('1. Script runs without errors and outputs valid JSON to stdout', () => {
    expect(capturedStdout.length).toBeGreaterThan(0);
    expect(reportJson).not.toBeNull();
    expect(typeof reportJson).toBe('object');
  });

  it('2. JSON report has required fields: timestamp, checks (array), allHealthy (boolean)', () => {
    expect(reportJson).toHaveProperty('timestamp');
    expect(typeof reportJson.timestamp).toBe('string');
    expect(reportJson).toHaveProperty('checks');
    expect(Array.isArray(reportJson.checks)).toBe(true);
    expect(reportJson).toHaveProperty('allHealthy');
    expect(typeof reportJson.allHealthy).toBe('boolean');
  });

  it('3. Each check has: service, status, latencyMs, timestamp', () => {
    expect(reportJson.checks.length).toBe(5);
    for (const check of reportJson.checks) {
      expect(check).toHaveProperty('service');
      expect(typeof check.service).toBe('string');
      expect(check).toHaveProperty('status');
      expect(['up', 'down']).toContain(check.status);
      expect(check).toHaveProperty('latencyMs');
      expect(typeof check.latencyMs).toBe('number');
      expect(check).toHaveProperty('timestamp');
      expect(typeof check.timestamp).toBe('string');
    }
  });

  it('4. When all services up, allHealthy is true', () => {
    // Since we mocked all services to be successful, they should all be 'up'
    for (const check of reportJson.checks) {
      expect(check.status).toBe('up');
    }
    expect(reportJson.allHealthy).toBe(true);
  });

  it('5. Report file saved to MEMORY/STATE/health-report.json', () => {
    const reportPath = join(TEST_DIR, 'MEMORY', 'STATE', 'health-report.json');
    expect(existsSync(reportPath)).toBe(true);

    const fileContent = readFileSync(reportPath, 'utf-8');
    const fileJson = JSON.parse(fileContent);
    expect(fileJson).toEqual(reportJson);
  });
});
