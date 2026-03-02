#!/usr/bin/env bun
/**
 * JulesAPI.ts — Jules REST API wrapper
 *
 * Usage:
 *   bun JulesAPI.ts sources              List connected repos
 *   bun JulesAPI.ts sessions [filter]    List all sessions (IN_PROGRESS|COMPLETED)
 *   bun JulesAPI.ts create "prompt"      Create new task on PAI-personal
 *   bun JulesAPI.ts status <id>          Check session status
 *   bun JulesAPI.ts approve <id>         Approve session plan
 *   bun JulesAPI.ts message <id> "msg"   Send message to session
 *
 * Env vars:
 *   JULES_REPO     Override default repo (default: PAI-personal)
 *   JULES_BRANCH   Override default branch (default: master)
 *
 * @author PAI System
 * @version 1.0.0
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.env.HOME!, '.config', 'PAI', '.env');
const BASE_URL = 'https://jules.googleapis.com/v1alpha';
const DEFAULT_SOURCE = 'sources/github/rikitikitavi2012-debug/PAI-personal';
const DEFAULT_BRANCH = 'master';

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function loadApiKey(): string {
  try {
    const env = readFileSync(ENV_PATH, 'utf-8');
    const match = env.match(/^JULES_API_KEY=(.+)$/m);
    if (!match) {
      console.error(`${RED}ERROR:${RESET} JULES_API_KEY not found in ${ENV_PATH}`);
      process.exit(1);
    }
    return match[1].trim();
  } catch (e) {
    console.error(`${RED}ERROR:${RESET} Cannot read ${ENV_PATH}: ${(e as Error).message}`);
    process.exit(1);
  }
}

async function apiCall(path: string, method = 'GET', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const key = loadApiKey();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`${RED}Jules API ${res.status}:${RESET} ${text}`);
    process.exit(1);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

function stateIcon(state: string): string {
  switch (state) {
    case 'IN_PROGRESS': return `${YELLOW}*${RESET}`;
    case 'COMPLETED': return `${GREEN}+${RESET}`;
    case 'PAUSED': return `${CYAN}||${RESET}`;
    case 'FAILED': return `${RED}x${RESET}`;
    default: return `${DIM}?${RESET}`;
  }
}

function showHelp(): void {
  console.log(`${BOLD}Jules API Tool${RESET} ${DIM}v1.0.0${RESET}

${BOLD}Usage:${RESET}
  bun JulesAPI.ts ${CYAN}sources${RESET}              List connected repos
  bun JulesAPI.ts ${CYAN}sessions${RESET} [filter]    List sessions (IN_PROGRESS|COMPLETED)
  bun JulesAPI.ts ${CYAN}create${RESET} "prompt"      Create task on PAI-personal
  bun JulesAPI.ts ${CYAN}status${RESET} <id>          Check session details
  bun JulesAPI.ts ${CYAN}approve${RESET} <id>         Approve session plan
  bun JulesAPI.ts ${CYAN}message${RESET} <id> "msg"   Send message to session

${BOLD}Env vars:${RESET}
  JULES_REPO     Override default repo (default: PAI-personal)
  JULES_BRANCH   Override default branch (default: master)

${BOLD}Examples:${RESET}
  bun JulesAPI.ts create "Add unit tests for the auth module"
  bun JulesAPI.ts sessions IN_PROGRESS
  bun JulesAPI.ts status sessions/abc123
  bun JulesAPI.ts approve sessions/abc123
  bun JulesAPI.ts message sessions/abc123 "Also add integration tests"
`);
}

// -- Main --

const [cmd, ...args] = process.argv.slice(2);

if (!cmd || cmd === '--help' || cmd === '-h') {
  showHelp();
  process.exit(0);
}

switch (cmd) {
  case 'sources': {
    const data = await apiCall('/sources');
    const sources = (data.sources || []) as Array<Record<string, unknown>>;
    if (sources.length === 0) {
      console.log(`${DIM}No connected repos found.${RESET}`);
      break;
    }
    for (const s of sources) {
      const r = s.githubRepo as Record<string, unknown> | undefined;
      if (r) {
        const lock = r.isPrivate ? `${RED}private${RESET}` : `${GREEN}public${RESET}`;
        const branch = (r.defaultBranch as Record<string, unknown>)?.displayName || 'unknown';
        console.log(`  ${lock}  ${BOLD}${r.owner}/${r.repo}${RESET} ${DIM}(${branch})${RESET}`);
      }
    }
    break;
  }

  case 'sessions': {
    const data = await apiCall('/sessions');
    const sessions = (data.sessions || []) as Array<Record<string, unknown>>;
    const filter = args[0];

    if (sessions.length === 0) {
      console.log(`${DIM}No sessions found.${RESET}`);
      break;
    }

    console.log(`${BOLD}State           | Title                                                        | Session ID${RESET}`);
    console.log(`${DIM}${''.padEnd(95, '-')}${RESET}`);

    for (const s of sessions) {
      const state = s.state as string || 'UNKNOWN';
      if (filter && state !== filter) continue;
      const icon = stateIcon(state);
      const title = ((s.title as string) || 'untitled').substring(0, 60).padEnd(60);
      const name = s.name as string || '';
      console.log(`${icon} ${state.padEnd(14)} | ${title} | ${DIM}${name}${RESET}`);
    }
    break;
  }

  case 'create': {
    const prompt = args.join(' ');
    if (!prompt) {
      console.error(`${RED}Usage:${RESET} create "task description"`);
      process.exit(1);
    }

    const repo = process.env.JULES_REPO || DEFAULT_SOURCE;
    const branch = process.env.JULES_BRANCH || DEFAULT_BRANCH;

    console.log(`${DIM}Creating session on ${repo} (${branch})...${RESET}`);

    const data = await apiCall('/sessions', 'POST', {
      prompt,
      sourceContext: {
        source: repo,
        githubRepoContext: { startingBranch: branch },
      },
      automationMode: 'AUTO_CREATE_PR',
      title: prompt.substring(0, 80),
    });

    console.log(`${GREEN}+${RESET} Session created: ${BOLD}${data.name}${RESET}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  State: ${data.state}`);
    break;
  }

  case 'status': {
    const sessionId = args[0];
    if (!sessionId) {
      console.error(`${RED}Usage:${RESET} status <session-name>`);
      process.exit(1);
    }
    const path = sessionId.startsWith('sessions/') ? `/${sessionId}` : `/sessions/${sessionId}`;
    const data = await apiCall(path);
    console.log(JSON.stringify(data, null, 2));
    break;
  }

  case 'approve': {
    const sessionId = args[0];
    if (!sessionId) {
      console.error(`${RED}Usage:${RESET} approve <session-name>`);
      process.exit(1);
    }
    const path = sessionId.startsWith('sessions/')
      ? `/${sessionId}:approvePlan`
      : `/sessions/${sessionId}:approvePlan`;
    await apiCall(path, 'POST');
    console.log(`${GREEN}+${RESET} Plan approved for ${BOLD}${sessionId}${RESET}`);
    break;
  }

  case 'message': {
    const sessionId = args[0];
    const msg = args.slice(1).join(' ');
    if (!sessionId || !msg) {
      console.error(`${RED}Usage:${RESET} message <session-name> "message"`);
      process.exit(1);
    }
    const path = sessionId.startsWith('sessions/')
      ? `/${sessionId}:sendMessage`
      : `/sessions/${sessionId}:sendMessage`;
    await apiCall(path, 'POST', { message: msg });
    console.log(`${GREEN}+${RESET} Message sent to ${BOLD}${sessionId}${RESET}`);
    break;
  }

  default: {
    console.error(`${RED}Unknown command:${RESET} ${cmd}`);
    showHelp();
    process.exit(1);
  }
}
