#!/usr/bin/env bun
/**
 * PAI Health Monitor — MVP connectivity checker
 *
 * Checks: Agent Zero API, VoiceServer, GitHub CLI
 * Outputs JSON report to stdout + saves to MEMORY/STATE/health-report.json
 *
 * Usage:
 *   bun HealthMonitor.ts              # run health checks
 *   bun HealthMonitor.ts recover      # check + auto-recover A0 if down
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

async function checkZai(): Promise<CheckResult> {
  const start = Date.now();
  const apiKey = (() => {
    let k = process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY || '';
    if (!k) {
      try {
        const env = require('fs').readFileSync(join(homedir(), '.config', 'PAI', '.env'), 'utf-8');
        const m = env.match(/^ZAI_API_KEY=(.+)$/m);
        if (m) k = m[1].trim();
      } catch {}
    }
    return k;
  })();
  if (!apiKey) return { service: 'Z.AI', status: 'down', latencyMs: 0, detail: 'No API key', timestamp: new Date().toISOString() };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'glm-5', messages: [{ role: 'user', content: 'respond: OK' }], max_tokens: 8000 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
    return {
      service: 'Z.AI',
      status: res.ok && content ? 'up' : 'down',
      latencyMs: Date.now() - start,
      detail: res.ok ? `GLM-5: ${content.slice(0, 30)}` : `HTTP ${res.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return { service: 'Z.AI', status: 'down', latencyMs: Date.now() - start, detail: err.message, timestamp: new Date().toISOString() };
  }
}

// --- Recovery infrastructure ---

interface RecoveryState {
  lastRecovery: string;
  recoveryCount: number;
  lastError: string;
}

const RECOVERY_STATE_PATH = join(getPaiDir(), 'MEMORY/STATE/a0-recovery.json');
const RECOVERY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

async function loadRecoveryState(): Promise<RecoveryState> {
  try {
    return await Bun.file(RECOVERY_STATE_PATH).json();
  } catch {
    return { lastRecovery: '', recoveryCount: 0, lastError: '' };
  }
}

async function saveRecoveryState(state: RecoveryState): Promise<void> {
  await Bun.write(RECOVERY_STATE_PATH, JSON.stringify(state, null, 2));
}

function appendEvent(type: string, action: string, detail?: string): void {
  const eventsPath = join(getPaiDir(), 'MEMORY/STATE/events.jsonl');
  try {
    const { appendFileSync } = require('fs');
    const event = {
      type,
      source: 'HealthMonitor',
      action,
      detail,
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'cron',
    };
    appendFileSync(eventsPath, JSON.stringify(event) + '\n', 'utf-8');
  } catch { /* observability, not critical */ }
}

async function voiceNotify(message: string): Promise<void> {
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        voice_id: 'TUQNWEvVPBLzMBSVDPUA',
        title: 'A0 Recovery',
      }),
    });
  } catch { /* voice server might be down */ }
}

async function quickA0HealthCheck(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch('http://72.56.86.51:50002/api_log_get', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function loadA0Token(): Promise<string> {
  const envPath = join(homedir(), '.config', 'PAI', '.env');
  try {
    const env = await Bun.file(envPath).text();
    const m = env.match(/^A0_API_TOKEN=(.+)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

async function recover(): Promise<void> {
  console.log('[recover] Checking A0 health...');

  // 1. Check if A0 is actually down
  const isUp = await quickA0HealthCheck();
  if (isUp) {
    console.log('[recover] A0 is responding. No recovery needed.');
    appendEvent('a0.recovery', 'skipped', 'A0 is healthy');
    return;
  }

  console.log('[recover] A0 is DOWN. Checking cooldown...');

  // 2. Check cooldown
  const state = await loadRecoveryState();
  if (state.lastRecovery) {
    const elapsed = Date.now() - new Date(state.lastRecovery).getTime();
    if (elapsed < RECOVERY_COOLDOWN_MS) {
      const remainMin = Math.ceil((RECOVERY_COOLDOWN_MS - elapsed) / 60_000);
      console.log(`[recover] Cooldown active. ${remainMin} min remaining. Skipping.`);
      appendEvent('a0.recovery', 'cooldown', `${remainMin} min remaining`);
      return;
    }
  }

  // 3. Attempt recovery via Container 1
  console.log('[recover] Attempting recovery via Container 1...');
  appendEvent('a0.recovery', 'attempt', 'Restarting container 2 via container 1');
  await voiceNotify('Внимание. A0 не отвечает, запускаю перезагрузку контейнера.');

  const token = await loadA0Token();
  if (!token) {
    const err = 'No A0_API_TOKEN found';
    console.error(`[recover] ${err}`);
    appendEvent('a0.recovery', 'failed', err);
    await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
    await saveRecoveryState({ ...state, lastRecovery: new Date().toISOString(), recoveryCount: state.recoveryCount + 1, lastError: err });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const res = await fetch('http://72.56.86.51:50001/api_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': token },
      body: JSON.stringify({ message: 'Run: ssh agentzero@172.18.0.1 docker restart agent-zero-2' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const err = `Container 1 returned HTTP ${res.status}`;
      console.error(`[recover] ${err}`);
      appendEvent('a0.recovery', 'failed', err);
      await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
      await saveRecoveryState({ ...state, lastRecovery: new Date().toISOString(), recoveryCount: state.recoveryCount + 1, lastError: err });
      return;
    }

    console.log('[recover] Restart command sent. Waiting 30s for Container 2 to come back...');
  } catch (err: any) {
    const msg = err.name === 'AbortError' ? 'Container 1 timeout (60s)' : err.message;
    console.error(`[recover] ${msg}`);
    appendEvent('a0.recovery', 'failed', msg);
    await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
    await saveRecoveryState({ ...state, lastRecovery: new Date().toISOString(), recoveryCount: state.recoveryCount + 1, lastError: msg });
    return;
  }

  // 4. Wait and re-check
  await new Promise(resolve => setTimeout(resolve, 30_000));

  const isBackUp = await quickA0HealthCheck();
  if (isBackUp) {
    console.log('[recover] A0 recovered successfully!');
    appendEvent('a0.recovery', 'success', 'Container 2 restarted and responding');
    await voiceNotify('A0 восстановлен успешно.');
    await saveRecoveryState({ lastRecovery: new Date().toISOString(), recoveryCount: state.recoveryCount + 1, lastError: '' });
  } else {
    console.error('[recover] A0 still not responding after restart.');
    appendEvent('a0.recovery', 'failed', 'Container 2 not responding after 30s wait');
    await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
    await saveRecoveryState({ ...state, lastRecovery: new Date().toISOString(), recoveryCount: state.recoveryCount + 1, lastError: 'Still down after restart' });
  }
}

async function main() {
  const checks = await Promise.all([
    checkA0(),
    checkZai(),
    checkHttp('VoiceServer', 'http://localhost:8888/health'),
    Promise.resolve(checkCli('GitHubCLI', ['gh', 'auth', 'status'])),
    Promise.resolve(checkCli('GeminiCLI', ['gemini', '--version'])),
  ]);

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    checks,
    allHealthy: checks.every(c => c.status === 'up'),
  };

  // Save report
  const reportPath = join(getPaiDir(), 'MEMORY/STATE/health-report.json');
  await Bun.write(reportPath, JSON.stringify(report, null, 2));

  // Emit health check event to events.jsonl
  const failures = checks.filter(c => c.status === 'down');
  const eventsPath = join(getPaiDir(), 'MEMORY/STATE/events.jsonl');
  try {
    const { mkdirSync, appendFileSync, existsSync } = require('fs');
    const dir = require('path').dirname(eventsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const event = {
      type: 'a0.health_check',
      source: 'HealthMonitor',
      all_healthy: report.allHealthy,
      services_up: checks.filter(c => c.status === 'up').length,
      services_down: failures.length,
      failures: failures.map(f => f.service),
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'cron',
    };
    appendFileSync(eventsPath, JSON.stringify(event) + '\n', 'utf-8');
  } catch { /* observability, not critical */ }

  // Output to stdout
  console.log(JSON.stringify(report, null, 2));

  // Voice alert on failures
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

const command = process.argv[2];
if (command === 'recover') {
  recover();
} else {
  main();
}
