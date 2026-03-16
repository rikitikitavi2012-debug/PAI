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
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';

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

async function checkCli(name: string, cmd: string[]): Promise<CheckResult> {
  const start = Date.now();
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    const timer = setTimeout(() => proc.kill(), 5_000);
    const exitCode = await proc.exited;
    clearTimeout(timer);
    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    return {
      service: name,
      status: exitCode === 0 ? 'up' : 'down',
      latencyMs: Date.now() - start,
      detail: exitCode === 0 ? output.trim().split('\n')[0] : stderr.trim().split('\n')[0],
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
  // Use /health endpoint — lightweight, no LLM invocation, <1s response
  return checkHttp('AgentZero', 'http://72.56.86.51:50002/health');
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
      body: JSON.stringify({ model: 'glm-5', messages: [{ role: 'user', content: 'respond: OK' }], max_tokens: 100 }),
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

async function main() {
  // Race each check against a 8s deadline to prevent hangs (gemini --version can freeze)
  const withTimeout = (p: Promise<CheckResult>, name: string): Promise<CheckResult> =>
    Promise.race([
      p,
      new Promise<CheckResult>(resolve =>
        setTimeout(() => resolve({
          service: name, status: 'down', latencyMs: 8000,
          detail: 'Timeout (8s)', timestamp: new Date().toISOString(),
        }), 8_000)
      ),
    ]);

  const checks = await Promise.all([
    withTimeout(checkA0(), 'AgentZero'),
    withTimeout(checkZai(), 'Z.AI'),
    withTimeout(checkHttp('VoiceServer', 'http://localhost:8888/health'), 'VoiceServer'),
    withTimeout(checkCli('GitHubCLI', ['gh', 'auth', 'status']), 'GitHubCLI'),
    withTimeout(checkCli('GeminiCLI', ['gemini', '--version']), 'GeminiCLI'),
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
          message: `Проверка здоровья: ${names} не отвечает`,
          voice_id: 'ogi2DyUAKJb7CEdqqvlU',
          title: 'Health Monitor',
        }),
      });
    } catch { /* voice server might be the one that's down */ }
  }
}

// ── A0 Auto-Recovery ──

interface RecoveryState {
  lastRecovery: string;
  recoveryCount: number;
  lastError?: string;
}

const RECOVERY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const RECOVERY_STATE_PATH = join(getPaiDir(), 'MEMORY', 'STATE', 'a0-recovery.json');

function loadRecoveryState(): RecoveryState {
  try {
    if (existsSync(RECOVERY_STATE_PATH)) return JSON.parse(readFileSync(RECOVERY_STATE_PATH, 'utf-8'));
  } catch {}
  return { lastRecovery: '', recoveryCount: 0 };
}

function saveRecoveryState(state: RecoveryState): void {
  writeFileSync(RECOVERY_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function logRecoveryEvent(action: string, detail?: string): void {
  try {
    const eventsPath = join(getPaiDir(), 'MEMORY', 'STATE', 'events.jsonl');
    appendFileSync(eventsPath, JSON.stringify({
      type: 'a0.recovery', source: 'HealthMonitor', action, detail,
      timestamp: new Date().toISOString(),
    }) + '\n', 'utf-8');
  } catch {}
}

async function voiceNotify(message: string, voiceId = 'TUQNWEvVPBLzMBSVDPUA'): Promise<void> {
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, voice_id: voiceId, voice_enabled: true }),
    });
  } catch {}
}

async function recoverA0(): Promise<void> {
  // Load A0 config
  const envPath = join(process.env.HOME || homedir(), '.config', 'PAI', '.env');
  let apiToken = '';
  try {
    const env = readFileSync(envPath, 'utf-8');
    const match = env.match(/^A0_API_TOKEN=(.+)$/m);
    if (match) apiToken = match[1].trim();
  } catch {}
  if (!apiToken) { console.error('A0_API_TOKEN not found'); return; }

  // Check A0 health first
  console.log('Checking A0 health...');
  let a0Up = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch('http://72.56.86.51:50002/api_log_get', {
      signal: ctrl.signal, headers: { 'X-API-KEY': apiToken },
    });
    clearTimeout(t);
    a0Up = r.ok;
  } catch { a0Up = false; }

  if (a0Up) {
    console.log('A0 is online — no recovery needed.');
    return;
  }

  console.log('A0 is DOWN — checking recovery cooldown...');

  // Cooldown check
  const state = loadRecoveryState();
  if (state.lastRecovery) {
    const elapsed = Date.now() - new Date(state.lastRecovery).getTime();
    if (elapsed < RECOVERY_COOLDOWN_MS) {
      const remaining = Math.ceil((RECOVERY_COOLDOWN_MS - elapsed) / 60000);
      console.log(`Recovery cooldown active (${remaining}min remaining). Skipping.`);
      logRecoveryEvent('cooldown', `${remaining}min remaining`);
      return;
    }
  }

  // Attempt recovery via Container 1
  console.log('Attempting recovery via Container 1 (port 50001)...');
  await voiceNotify('Внимание. A0 не отвечает, запускаю перезагрузку контейнера.');
  logRecoveryEvent('attempt');

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60000);
    const response = await fetch('http://72.56.86.51:50001/api_message', {
      method: 'POST',
      headers: { 'X-API-KEY': apiToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "Execute this Linux command and report the output: ssh agentzero@172.18.0.1 'docker restart agent-zero-2'" }),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!response.ok) {
      throw new Error(`Container 1 responded ${response.status}`);
    }
    console.log('Restart command sent. Waiting 30s for Container 2 to come back...');
  } catch (err: any) {
    console.error(`Recovery failed: ${err.message}`);
    state.lastRecovery = new Date().toISOString();
    state.lastError = err.message;
    saveRecoveryState(state);
    logRecoveryEvent('failed', err.message);
    await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
    return;
  }

  // Wait for restart
  await new Promise(r => setTimeout(r, 30000));

  // Re-check
  let recovered = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch('http://72.56.86.51:50002/api_log_get', {
      signal: ctrl.signal, headers: { 'X-API-KEY': apiToken },
    });
    clearTimeout(t);
    recovered = r.ok;
  } catch { recovered = false; }

  state.lastRecovery = new Date().toISOString();
  state.recoveryCount++;

  if (recovered) {
    console.log('A0 recovered successfully!');
    state.lastError = undefined;
    saveRecoveryState(state);
    logRecoveryEvent('success');
    await voiceNotify('A0 восстановлен успешно.');
  } else {
    console.log('A0 still down after restart attempt.');
    state.lastError = 'Still down after restart';
    saveRecoveryState(state);
    logRecoveryEvent('failed', 'Still down after restart');
    await voiceNotify('Не удалось восстановить A0. Требуется ручное вмешательство.');
  }
}

// ── CLI ──
const cmd = process.argv[2];
if (cmd === 'recover') {
  recoverA0();
} else {
  main();
}
