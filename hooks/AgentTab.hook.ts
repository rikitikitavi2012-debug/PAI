#!/usr/bin/env bun
/**
 * AgentTab.hook.ts — Open/close Kitty tabs for agent transcripts
 *
 * PURPOSE:
 * SubagentStart → opens a new Kitty tab with live transcript viewer
 * SubagentStop  → closes the agent's Kitty tab
 *
 * TRIGGERS: SubagentStart, SubagentStop
 * OUTPUT: Silent (no stdout needed for these events)
 * PERFORMANCE: <100ms — kitty @ launch is async, hook exits immediately
 */

import { spawnSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { emitHookError } from './lib/hook-error-emitter';

const TMP_DIR = '/tmp';
const AGENT_LIVE_SCRIPT = join(
  process.env.HOME || '/home/ser',
  '.config/kitty/scripts/agent-live.sh'
);
// Find kitty socket dynamically (PID suffix varies)
function findKittySocket(): string {
  const user = process.env.USER || 'ser';
  // Check env first
  if (process.env.KITTY_LISTEN_ON) return process.env.KITTY_LISTEN_ON;
  // Find socket file
  const { readdirSync } = require('fs');
  try {
    const files = readdirSync('/tmp').filter((f: string) => f.startsWith(`kitty-${user}`));
    if (files.length > 0) return `unix:/tmp/${files[0]}`;
  } catch {}
  return `unix:/tmp/kitty-${user}`;
}
const KITTY_SOCKET = findKittySocket();

// ── Stdin reader ──

async function readStdin(timeout = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);
    process.stdin.on('data', chunk => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

// ── Tab ID persistence ──

function tabIdFile(agentId: string): string {
  return join(TMP_DIR, `pai-agent-tab-${agentId}`);
}

function saveTabId(agentId: string, windowId: string): void {
  writeFileSync(tabIdFile(agentId), windowId);
}

function loadAndRemoveTabId(agentId: string): string | null {
  const f = tabIdFile(agentId);
  if (!existsSync(f)) return null;
  const id = readFileSync(f, 'utf-8').trim();
  try { unlinkSync(f); } catch {}
  return id || null;
}

// ── Handlers ──

function cleanupStaleTabs(): void {
  // Remove stale tab ID files older than 10 minutes
  try {
    const { readdirSync, statSync, unlinkSync } = require('fs');
    const files = readdirSync(TMP_DIR).filter((f: string) => f.startsWith('pai-agent-tab-'));
    const now = Date.now();
    for (const f of files) {
      const fp = join(TMP_DIR, f);
      try {
        const age = now - statSync(fp).mtimeMs;
        if (age > 10 * 60 * 1000) unlinkSync(fp); // >10min = stale
      } catch {}
    }
  } catch {}
}

function handleSubagentStart(input: Record<string, unknown>): void {
  const agentId = String(input.agent_id || '');
  const agentType = String(input.agent_type || 'agent');
  const desc = String(input.description || input.prompt || '').slice(0, 60);
  const shortId = agentId.slice(0, 8);

  if (!agentId) return;

  // Cleanup stale tab files from previous sessions
  cleanupStaleTabs();

  // Check script exists
  if (!existsSync(AGENT_LIVE_SCRIPT)) return;

  const tabTitle = desc
    ? `🚀 ${agentType}: ${desc}`.slice(0, 50)
    : `🚀 ${agentType} [${shortId}]`;

  // Launch kitty tab (async — don't wait for completion)
  const result = spawnSync('kitty', [
    '@', '--to', KITTY_SOCKET,
    'launch',
    '--type=tab',
    `--tab-title=${tabTitle}`,
    '--keep-focus',         // don't steal focus from working tab
    '--cwd=' + (process.env.HOME || '/home/ser'),
    '--',
    'bash', AGENT_LIVE_SCRIPT, agentId, agentType, desc,
  ], {
    timeout: 3000,
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  // kitty @ launch returns the window ID
  const windowId = (result.stdout?.toString() || '').trim();
  if (windowId) {
    saveTabId(agentId, windowId);
    // Set purple color for agent tabs
    spawnSync('kitty', [
      '@', '--to', KITTY_SOCKET,
      'set-tab-color',
      '--match', `id:${windowId}`,
      'active_bg=#4c1d95', 'inactive_bg=#2e1065',
      'active_fg=#c4b5fd', 'inactive_fg=#a78bfa',
    ], { timeout: 1000, stdio: 'ignore' });
  }
}

function handleSubagentStop(input: Record<string, unknown>): void {
  const agentId = String(input.agent_id || '');
  if (!agentId) return;

  const windowId = loadAndRemoveTabId(agentId);
  if (!windowId) return;

  // Close the tab
  spawnSync('kitty', [
    '@', '--to', KITTY_SOCKET,
    'close-tab',
    '--match', `id:${windowId}`,
  ], {
    timeout: 2000,
    stdio: 'ignore',
  });
}

// ── Routing ──

const HANDLERS: Record<string, (input: Record<string, unknown>) => void> = {
  SubagentStart: handleSubagentStart,
  SubagentStop: handleSubagentStop,
};

// ── Main ──

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); }

    const input: Record<string, unknown> = JSON.parse(raw);
    const eventName = String(input.hook_event_name || '');

    const handler = HANDLERS[eventName];
    if (handler) {
      handler(input);
    }

    process.exit(0);
  } catch (err) {
    emitHookError('AgentTab', err);
    process.exit(0); // fail-open
  }
}

main().catch((err) => {
  emitHookError('AgentTab', err);
  process.exit(0);
});
