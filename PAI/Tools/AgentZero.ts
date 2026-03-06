#!/usr/bin/env bun
/**
 * ============================================================================
 * AGENT ZERO API — Programmatic access to Agent Zero instance
 * ============================================================================
 *
 * PURPOSE:
 * CLI tool for communicating with Agent Zero (autonomous AI agent) via REST API.
 * Agent Zero runs 24/7 in Docker on VPS, has: code execution, browser, search,
 * vision, memory, scheduler, document query, sub-agent delegation.
 *
 * USAGE:
 *   bun AgentZero.ts message "Your task here"             — sync message (blocks up to 5min)
 *   bun AgentZero.ts message "Follow up" --context ABC    — continue conversation
 *   bun AgentZero.ts async "Long task"                    — fire-and-forget, returns context_id
 *   bun AgentZero.ts log <context_id>                     — get conversation log
 *   bun AgentZero.ts terminate <context_id>               — end conversation
 *   bun AgentZero.ts health                               — check server status
 *   bun AgentZero.ts scheduler list                       — list scheduled tasks
 *   bun AgentZero.ts scheduler run "task description"     — run ad-hoc task now
 *
 * CONFIG:
 *   A0_API_TOKEN in ~/.config/PAI/.env
 *   A0_BASE_URL defaults to http://72.56.86.51:50002
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const EVENTS_PATH = path.join(process.env.HOME || '', '.claude', 'MEMORY', 'STATE', 'events.jsonl');
const A0_CONTEXT_PATH = path.join(process.env.HOME || '', '.claude', 'MEMORY', 'STATE', 'a0-active-context.json');

/** Emit A0 event to events.jsonl (fire-and-forget, never throws) */
function emitA0Event(type: string, data: Record<string, unknown>): void {
  try {
    const dir = path.dirname(EVENTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const event = {
      type: `a0.${type}`,
      source: 'AgentZero',
      data,
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
    };
    fs.appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n', 'utf-8');
  } catch { /* observability, not critical path */ }
}

/** Save active context_id to state file for a0-chat-tail.sh */
function saveActiveContext(contextId: string, lastMessage: string): void {
  try {
    const state = {
      context_id: contextId,
      updated: new Date().toISOString(),
      last_message: lastMessage.slice(0, 100),
    };
    fs.writeFileSync(A0_CONTEXT_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch { /* best effort */ }
}

interface A0Config {
  baseUrl: string;
  apiToken: string;
}

function loadConfig(): A0Config {
  const envPath = `${process.env.HOME}/.config/PAI/.env`;
  let apiToken = process.env.A0_API_TOKEN || '';

  if (!apiToken) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^A0_API_TOKEN=(.+)$/m);
      if (match) apiToken = match[1].trim();
    } catch {}
  }

  if (!apiToken) {
    console.error('Error: No A0_API_TOKEN found in env or ~/.config/PAI/.env');
    process.exit(1);
  }

  return {
    baseUrl: process.env.A0_BASE_URL || 'http://72.56.86.51:50002',
    apiToken,
  };
}

async function apiCall(path: string, body?: object, timeout = 600000): Promise<any> {
  const config = loadConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-API-KEY': config.apiToken,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout after ${timeout}ms`);
    }
    throw err;
  }
}

async function healthCheck(): Promise<void> {
  const config = loadConfig();
  try {
    const res = await fetch(`${config.baseUrl}/health`, { method: 'GET' });
    console.log(res.ok ? '✅ Agent Zero is running' : `⚠️ Status: ${res.status}`);
  } catch (err: any) {
    console.error(`❌ Agent Zero unreachable: ${err.message}`);
    process.exit(1);
  }
}

// Send synchronous message (blocks up to 5 min)
async function sendMessage(message: string, contextId?: string): Promise<void> {
  const startTime = Date.now();
  const body: any = { message, lifetime_hours: 1 };
  if (contextId) body.context_id = contextId;

  emitA0Event('message_sent', { context_id: contextId || 'new', preview: message.slice(0, 50) });

  const result = await apiCall('/api_message', body);
  const latency = ((Date.now() - startTime) / 1000).toFixed(1);

  // Track context + emit response event
  if (result.context_id) {
    saveActiveContext(result.context_id, message);
    emitA0Event('response', {
      context_id: result.context_id,
      latency_s: latency,
      preview: (result.response || '').slice(0, 50),
    });
  }

  console.log(JSON.stringify({
    context_id: result.context_id,
    response: result.response,
    latency_s: latency,
  }, null, 2));
}

// Send async message (fire-and-forget via /api_message)
// Strategy: try with 30s timeout first. If it times out, that's OK —
// A0 received the message and is processing. We just didn't get the context_id back.
async function sendAsync(message: string, contextId?: string): Promise<void> {
  const body: any = { message, lifetime_hours: 1 };
  if (contextId) body.context_id = contextId;

  emitA0Event('async_sent', { context_id: contextId || 'new', preview: message.slice(0, 50) });

  try {
    const result = await apiCall('/api_message', body, 30000);

    // Track context if returned
    if (result.context_id) {
      saveActiveContext(result.context_id, message);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    if (err.message?.includes('Timeout')) {
      // A0 received the message but is still processing — this is expected for async
      console.log(JSON.stringify({
        status: 'delivered',
        note: 'A0 is processing (response timeout is normal for async tasks)',
        context_id: contextId || 'new',
      }, null, 2));
      emitA0Event('async_delivered', { context_id: contextId || 'new', timeout: true });
    } else {
      throw err;
    }
  }
}

// Get conversation log
async function getLog(contextId: string, length = 100): Promise<void> {
  const result = await apiCall('/api_log_get', { context_id: contextId, length }, 15000);
  console.log(JSON.stringify(result, null, 2));
}

// Terminate conversation
async function terminateChat(contextId: string): Promise<void> {
  const result = await apiCall('/api_terminate_chat', { context_id: contextId }, 15000);
  console.log(result || 'Chat terminated');
}

// Scheduler operations
async function schedulerList(): Promise<void> {
  const result = await apiCall('/scheduler_tasks_list', {}, 15000);
  console.log(JSON.stringify(result, null, 2));
}

async function schedulerRun(task: string): Promise<void> {
  const result = await apiCall('/scheduler_task_run', { task }, 60000);
  console.log(JSON.stringify(result, null, 2));
}

async function schedulerResults(): Promise<void> {
  // Pull results directly from scheduler_tasks_list (contains last_result field)
  const tasks = await apiCall('/scheduler_tasks_list', {}, 15000);
  if (!Array.isArray(tasks)) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }
  for (const task of tasks) {
    console.log(`\n── ${task.name || 'Unnamed'} ──`);
    console.log(`  State: ${task.state || '?'} | Schedule: ${task.schedule || 'adhoc'}`);
    console.log(`  Last run: ${task.last_run || 'never'}`);
    if (task.last_result) {
      console.log(`  Result: ${task.last_result.slice(0, 200)}`);
    }
  }
}

// Pull A0 results from git (A0 pushes to PAI-personal, we pull)
async function pullResults(): Promise<void> {
  const { spawnSync } = require('child_process');
  const paiDir = process.env.HOME + '/.claude';

  // Pull latest from private remote
  const pull = spawnSync('git', ['pull', '--rebase', 'private', 'master'], {
    cwd: paiDir, encoding: 'utf-8', timeout: 15000,
  });

  if (pull.status !== 0) {
    // Try without rebase
    const pull2 = spawnSync('git', ['pull', '--no-rebase', 'private', 'master'], {
      cwd: paiDir, encoding: 'utf-8', timeout: 15000,
    });
    if (pull2.status !== 0) {
      console.error('⚠️ git pull failed — may have local changes. Try: git stash && git pull private master');
      return;
    }
  }

  // Check for A0 result files
  const stateDir = path.join(paiDir, 'MEMORY', 'STATE');
  const reports = [
    { file: 'health-report.json', label: 'Health Check' },
    { file: 'telos-integrity.json', label: 'TELOS Integrity' },
    { file: 'telos-progress.json', label: 'TELOS Progress' },
    { file: 'learning-patterns.json', label: 'Learning Patterns' },
    { file: 'memory-compaction-report.json', label: 'Memory Compaction' },
    { file: 'a0-comms-research.json', label: 'A0 Comms Research' },
  ];

  console.log('📥 A0 Results:');
  for (const r of reports) {
    const fpath = path.join(stateDir, r.file);
    if (fs.existsSync(fpath)) {
      try {
        const data = JSON.parse(fs.readFileSync(fpath, 'utf-8'));
        const age = Date.now() - new Date(data.timestamp || 0).getTime();
        const ageH = Math.floor(age / 3600000);
        const isNew = ageH < 24;
        console.log(`  ${isNew ? '🆕' : '📄'} ${r.label}: ${ageH}h ago${isNew ? ' ← NEW' : ''}`);
        // Show summary if available
        if (data.overall) console.log(`     Status: ${data.overall}`);
        if (data.alerts?.length) console.log(`     Alerts: ${data.alerts.join(', ')}`);
        if (data.contradictions?.length) console.log(`     Contradictions: ${data.contradictions.length}`);
        if (data.recommendations?.length) console.log(`     Recommendations: ${data.recommendations.length}`);
      } catch { console.log(`  ⚠️ ${r.label}: parse error`); }
    }
  }
}

// ─── CLI entry point ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error(`Usage:
  bun AgentZero.ts message "Your task"           — sync (blocks up to 5min)
  bun AgentZero.ts message "Text" --context ID   — continue conversation
  bun AgentZero.ts async "Long task"             — fire-and-forget
  bun AgentZero.ts log <context_id>              — conversation log
  bun AgentZero.ts terminate <context_id>        — end conversation
  bun AgentZero.ts health                        — server check
  bun AgentZero.ts poll                          — pull & show A0 results
  bun AgentZero.ts scheduler list                — list tasks
  bun AgentZero.ts scheduler results             — last run results for all tasks
  bun AgentZero.ts scheduler run "task"          — run ad-hoc task`);
    process.exit(1);
  }

  switch (command) {
    case 'health':
      await healthCheck();
      break;

    case 'message': {
      const message = args[1];
      if (!message) { console.error('Error: message text required'); process.exit(1); }
      const ctxIdx = args.indexOf('--context');
      const contextId = ctxIdx >= 0 ? args[ctxIdx + 1] : undefined;
      await sendMessage(message, contextId);
      break;
    }

    case 'async': {
      const message = args[1];
      if (!message) { console.error('Error: message text required'); process.exit(1); }
      const ctxIdx = args.indexOf('--context');
      const contextId = ctxIdx >= 0 ? args[ctxIdx + 1] : undefined;
      await sendAsync(message, contextId);
      break;
    }

    case 'log': {
      const contextId = args[1];
      if (!contextId) { console.error('Error: context_id required'); process.exit(1); }
      const length = args[2] ? parseInt(args[2]) : 100;
      await getLog(contextId, length);
      break;
    }

    case 'terminate': {
      const contextId = args[1];
      if (!contextId) { console.error('Error: context_id required'); process.exit(1); }
      await terminateChat(contextId);
      break;
    }

    case 'poll':
      await pullResults();
      break;

    case 'scheduler':
      if (args[1] === 'list') {
        await schedulerList();
      } else if (args[1] === 'run') {
        const task = args[2];
        if (!task) { console.error('Error: task description required'); process.exit(1); }
        await schedulerRun(task);
      } else if (args[1] === 'results') {
        await schedulerResults();
      } else {
        console.error('Scheduler subcommands: list, run "task", results');
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
