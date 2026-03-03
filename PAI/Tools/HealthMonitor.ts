#!/usr/bin/env bun
/**
 * PAI Health Monitor — MVP connectivity checker
 *
 * Checks: Agent Zero API, VoiceServer, GitHub CLI
 * Outputs JSON report to stdout + saves to MEMORY/STATE/health-report.json
 *
 * Usage: bun HealthMonitor.ts
 */

import { join } from 'path';
import { homedir } from 'os';

// Inline getPaiDir to avoid cross-directory import resolution issues
function getPaiDir(): string {
  const envPaiDir = process.env.PAI_DIR;
  if (envPaiDir) {
    return envPaiDir.replace(/^\$HOME(?=\/|$)/, homedir()).replace(/^~(?=\/|$)/, homedir());
  }
  return join(homedir(), '.claude');
}

interface CheckResult {
  service: string;
  status: 'up' | 'down';
  latencyMs: number;
  detail?: string;
  timestamp: string;
}

interface HealthReport {
  timestamp: string;
  checks: CheckResult[];
  allHealthy: boolean;
}

async function checkHttp(name: string, url: string, headers?: Record<string, string>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    return {
      service: name,
      status: res.ok || res.status < 500 ? 'up' : 'down',
      latencyMs: Date.now() - start,
      detail: `HTTP ${res.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      service: name,
      status: 'down',
      latencyMs: Date.now() - start,
      detail: err.name === 'AbortError' ? 'Timeout (10s)' : err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

function checkCli(name: string, cmd: string[]): CheckResult {
  const start = Date.now();
  try {
    const result = Bun.spawnSync(cmd, { timeout: 10_000 });
    const output = result.stdout.toString().trim();
    return {
      service: name,
      status: result.exitCode === 0 ? 'up' : 'down',
      latencyMs: Date.now() - start,
      detail: result.exitCode === 0 ? output.split('\n')[0] : result.stderr.toString().trim().split('\n')[0],
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      service: name, status: 'down', latencyMs: Date.now() - start,
      detail: err.message, timestamp: new Date().toISOString(),
    };
  }
}

async function checkA0(): Promise<CheckResult> {
  const start = Date.now();
  const envPath = join(homedir(), '.config', 'PAI', '.env');
  let token = '';
  try {
    const env = await Bun.file(envPath).text();
    const m = env.match(/^A0_API_TOKEN=(.+)$/m);
    if (m) token = m[1].trim();
  } catch {}
  if (!token) return { service: 'AgentZero', status: 'down', latencyMs: 0, detail: 'No API token', timestamp: new Date().toISOString() };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch('http://72.56.86.51:50002/api_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify({ message: 'respond with only: OK', context: 'health-monitor' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json() as any;
    return {
      service: 'AgentZero',
      status: data.response ? 'up' : 'down',
      latencyMs: Date.now() - start,
      detail: data.response ? `Response: ${data.response.slice(0, 30)}` : `Error: ${data.error || 'no response'}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return { service: 'AgentZero', status: 'down', latencyMs: Date.now() - start, detail: err.message, timestamp: new Date().toISOString() };
  }
}

async function main() {
  const checks = await Promise.all([
    checkA0(),
    checkHttp('VoiceServer', 'http://localhost:8888/health'),
    Promise.resolve(checkCli('GitHubCLI', ['gh', 'auth', 'status'])),
  ]);

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    checks,
    allHealthy: checks.every(c => c.status === 'up'),
  };

  // Save report
  const reportPath = join(getPaiDir(), 'MEMORY/STATE/health-report.json');
  await Bun.write(reportPath, JSON.stringify(report, null, 2));

  // Output to stdout
  console.log(JSON.stringify(report, null, 2));

  // Voice alert on failures
  const failures = checks.filter(c => c.status === 'down');
  if (failures.length > 0) {
    const names = failures.map(f => f.service).join(', ');
    try {
      await fetch('http://localhost:8888/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Health check alert: ${names} is down`,
          voice_id: 'ogi2DyUAKJb7CEdqqvlU',
          title: 'Health Monitor',
        }),
      });
    } catch { /* voice server might be the one that's down */ }
  }
}

main();
