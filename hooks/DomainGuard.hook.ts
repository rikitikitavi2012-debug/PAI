#!/usr/bin/env bun
/**
 * DomainGuard.hook.ts — Enforce domain ownership for subagents (PreToolUse)
 *
 * Prevents agents from modifying files outside their assigned domain.
 * Implements blast radius control for parallel agent execution.
 *
 * TRIGGER: PreToolUse (Edit, Write) — checks if caller is a subagent
 * PERFORMANCE: <5ms on fast path, <20ms on validation path.
 *
 * DOMAIN FORMAT (in agent frontmatter or settings.json):
 *   domain:
 *     read: ["*"]           # Can read anything
 *     write: ["src/frontend/", "docs/"]  # Can only write to these dirs
 *     deny: ["*.env", "*.key"]  # Explicitly denied patterns
 *
 * BEHAVIOR:
 *   - No domain config → allow all (backward compatible)
 *   - Domain configured + violation → deny with explanation
 *   - Parent agent (no parent_session_id) → bypass check
 */

import { readFileSync, writeSync, existsSync } from 'fs';
import { join, relative, isAbsolute } from 'path';
import { minimatch } from 'minimatch';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');

interface DomainConfig {
  read?: string[];
  write?: string[];
  deny?: string[];
}

interface AgentDomainMapping {
  [agentType: string]: DomainConfig;
}

// Default domain mappings for common agent types
const DEFAULT_DOMAINS: AgentDomainMapping = {
  'explore': { read: ['*'], write: ['MEMORY/RESEARCH/', 'MEMORY/WORK/'] },
  'plan': { read: ['*'], write: ['MEMORY/WORK/', 'PAI/Algorithm/'] },
  'engineer': { read: ['*'], write: ['*'] }, // Full access for engineer
  'researcher': { read: ['*'], write: ['MEMORY/RESEARCH/', 'MEMORY/WORK/'] },
  'general-purpose': { read: ['*'], write: ['*'] }, // Full access
};

const CONTINUE = '{"continue":true}\n';

function out(s: string): never {
  writeSync(1, s.endsWith('\n') ? s : s + '\n');
  process.exit(0);
}

function loadDomainMappings(): AgentDomainMapping {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
      return { ...DEFAULT_DOMAINS, ...(settings.agentDomains || {}) };
    }
  } catch {}
  return DEFAULT_DOMAINS;
}

function matchPath(path: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(pattern => {
    if (pattern === '*') return true;
    return minimatch(path, pattern, { dot: true });
  });
}

function checkDomain(
  filePath: string,
  domain: DomainConfig,
  operation: 'read' | 'write'
): { allowed: boolean; reason?: string } {
  // Normalize path
  const normalizedPath = isAbsolute(filePath)
    ? relative(PAI_DIR, filePath)
    : filePath;

  // Check deny list first (applies to both read and write)
  if (domain.deny && matchPath(normalizedPath, domain.deny)) {
    return { allowed: false, reason: `Path matches deny pattern` };
  }

  // Check operation-specific permissions
  const patterns = operation === 'read' ? domain.read : domain.write;
  if (!patterns) {
    return { allowed: true }; // No restrictions for this operation
  }

  if (matchPath(normalizedPath, patterns)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Path outside ${operation} domain: ${patterns.join(', ')}`
  };
}

// Read stdin with timeout
let raw = '';
const reader = Bun.stdin.stream().getReader();

const readDone = (async () => {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += new TextDecoder().decode(value, { stream: true });
    }
  } catch {}
})();

await Promise.race([readDone, new Promise<void>(r => setTimeout(r, 200))]);
reader.cancel().catch(() => {});

if (!raw.trim()) out(CONTINUE);

let input: any;
try {
  input = JSON.parse(raw);
} catch {
  out(CONTINUE);
}

const toolName = input.tool_name || '';
const toolInput = input.tool_input || {};

// Only check Edit and Write operations
if (!['Edit', 'Write'].includes(toolName)) {
  out(CONTINUE);
}

const filePath: string = toolInput.file_path || '';
if (!filePath) out(CONTINUE);

// Check if this is a subagent (has parent_session_id)
const sessionId = input.session_id || '';
const parentSessionId = input.parent_session_id || '';

// No parent = main agent = bypass domain check
if (!parentSessionId) {
  out(CONTINUE);
}

// Determine agent type from session context
// This could be enhanced to read from session metadata
const agentType = (input.agent_type || 'general-purpose').toLowerCase();

// Load domain mappings
const domains = loadDomainMappings();
const domain = domains[agentType];

// No domain config = allow all (backward compatible)
if (!domain) {
  out(CONTINUE);
}

// Check write permission (Edit and Write both modify files)
const result = checkDomain(filePath, domain, 'write');

if (!result.allowed) {
  out(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `DomainGuard: ${agentType} agent cannot write to "${filePath}". ${result.reason}. Extend domain in settings.json → agentDomains.${agentType}.write`
    }
  }));
}

out(CONTINUE);
