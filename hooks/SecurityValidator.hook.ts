#!/usr/bin/env bun
/**
 * SecurityValidator.hook.ts - Security Validation for Tool Calls (PreToolUse)
 *
 * PURPOSE:
 * Validates Bash commands and file operations against security patterns before
 * execution. Prevents accidental or malicious operations that could damage the
 * system, expose secrets, or compromise security.
 *
 * TRIGGER: PreToolUse (matcher: Bash, Edit, Write, Read)
 *
 * INPUT:
 * - tool_name: "Bash" | "Edit" | "Write" | "Read"
 * - tool_input: { command?: string, file_path?: string, ... }
 * - session_id: Current session identifier
 *
 * OUTPUT:
 * - stdout: JSON decision object
 *   - {"continue": true} → Allow operation
 *   - {"decision": "ask", "message": "..."} → Prompt user for confirmation
 * - exit(0): Normal completion (with decision)
 * - exit(2): Hard block (catastrophic operation prevented)
 *
 * SIDE EFFECTS:
 * - Writes to: MEMORY/SECURITY/YYYY/MM/security-{summary}-{timestamp}.jsonl
 * - User prompt: May trigger confirmation dialog for confirm-level operations
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: patterns.yaml (security pattern definitions)
 * - COORDINATES WITH: None (standalone validation)
 * - MUST RUN BEFORE: Tool execution (blocking)
 * - MUST RUN AFTER: None
 *
 * ERROR HANDLING:
 * - Missing patterns.yaml: Uses default safe patterns
 * - Parse errors: Logs warning, allows operation (fail-open for usability)
 * - Logging failures: Silent (should not block operations)
 *
 * PERFORMANCE:
 * - Blocking: Yes (must complete before tool executes)
 * - Typical execution: ~26ms (including Bun subprocess startup)
 * - Optimization: JSON cache of patterns.yaml (mtime-invalidated) eliminates
 *   YAML library import (~50ms) and parse (~10ms) on cache hits
 * - Design: Fast path for safe operations, pattern matching only when needed
 *
 * PATTERN CATEGORIES:
 * Bash commands:
 * - blocked: Always prevented (rm -rf /, format, etc.)
 * - confirm: Requires user confirmation (git push --force, etc.)
 * - alert: Logged but allowed (sudo, etc.)
 *
 * File paths:
 * - zeroAccess: Never readable or writable (~/.ssh, credentials, etc.)
 * - readOnly: Readable but not writable (system configs)
 * - confirmWrite: Requires confirmation to write
 * - noDelete: Cannot be deleted
 *
 * SECURITY MODEL:
 * - Defense in depth: Multiple pattern layers
 * - Fail-safe for catastrophic operations (exit 2)
 * - Fail-open for minor concerns (log and allow)
 * - All decisions logged for audit trail
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { paiPath } from './lib/paths';

// ========================================
// Security Event Logging
// ========================================

// Logs to individual files: MEMORY/SECURITY/YYYY/MM/security-{summary}-{timestamp}.jsonl
// Each event gets a descriptive filename for easy scanning

interface SecurityEvent {
  timestamp: string;
  session_id: string;
  event_type: 'block' | 'confirm' | 'alert' | 'allow';
  tool: string;
  category: 'bash_command' | 'path_access';
  target: string;  // command or path
  pattern_matched?: string;
  reason?: string;
  action_taken: string;
}

function generateEventSummary(event: SecurityEvent): string {
  // Create a 6-word-max slug from event type and target/reason
  const eventWord = event.event_type; // block, confirm, alert, allow

  // Extract key words from target or reason
  const source = event.reason || event.target || 'unknown';
  const words = source
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // Remove special chars
    .split(/\s+/)
    .filter(w => w.length > 1)     // Skip tiny words
    .slice(0, 5);                   // Max 5 words (+ event type = 6)

  return [eventWord, ...words].join('-');
}

function getSecurityLogPath(event: SecurityEvent): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const sec = now.getSeconds().toString().padStart(2, '0');

  const summary = generateEventSummary(event);
  const timestamp = `${year}${month}${day}-${hour}${min}${sec}`;

  return paiPath('MEMORY', 'SECURITY', year, month, `security-${summary}-${timestamp}.jsonl`);
}

function logSecurityEvent(event: SecurityEvent): void {
  try {
    const logPath = getSecurityLogPath(event);
    const dir = logPath.substring(0, logPath.lastIndexOf('/'));

    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(event, null, 2);
    writeFileSync(logPath, content);
  } catch {
    // Logging failure should not block operations
    console.error('Warning: Failed to log security event');
  }
}

// ========================================
// Types
// ========================================

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown> | string;
  additionalContext?: string;
}

interface Pattern {
  pattern: string;
  reason: string;
}

interface PatternsConfig {
  version: string;
  philosophy: {
    mode: string;
    principle: string;
  };
  bash: {
    trusted: Pattern[];
    blocked: Pattern[];
    confirm: Pattern[];
    alert: Pattern[];
  };
  paths: {
    zeroAccess: string[];
    readOnly: string[];
    confirmWrite: string[];
    noDelete: string[];
  };
  content?: {
    blocked?: Pattern[];
    confirm?: Pattern[];
  };
  projects: Record<string, {
    path: string;
    rules: Array<{ action: string; reason: string }>;
  }>;
}

// ========================================
// Config Loading - JSON Cache with YAML Fallback
// ========================================

// Pattern paths in priority order:
// 1. PAI/USER/PAISECURITYSYSTEM/patterns.yaml (user's custom rules)
// 2. PAI/PAISECURITYSYSTEM/patterns.example.yaml (default template)
//
// Performance: YAML parsing + library import adds ~60ms cold-start overhead.
// We pre-compile patterns.yaml -> patterns.cache.json on first run.
// Subsequent runs load the JSON cache (~0.03ms parse vs ~10ms YAML parse,
// plus no yaml library import overhead).
// Cache invalidation: compare patterns.yaml mtime vs cache mtime.

const USER_PATTERNS_PATH = paiPath('PAI', 'USER', 'PAISECURITYSYSTEM', 'patterns.yaml');
const SYSTEM_PATTERNS_PATH = paiPath('PAI', 'PAISECURITYSYSTEM', 'patterns.example.yaml');

let patternsCache: PatternsConfig | null = null;
let patternsSource: 'user' | 'system' | 'none' = 'none';

function getPatternsPath(): string | null {
  // Try USER patterns first (user's custom rules)
  if (existsSync(USER_PATTERNS_PATH)) {
    patternsSource = 'user';
    return USER_PATTERNS_PATH;
  }

  // Fall back to SYSTEM patterns (default template)
  if (existsSync(SYSTEM_PATTERNS_PATH)) {
    patternsSource = 'system';
    return SYSTEM_PATTERNS_PATH;
  }

  // No patterns found
  patternsSource = 'none';
  return null;
}

function getCachePath(yamlPath: string): string {
  // Place cache next to the YAML file: patterns.yaml -> patterns.cache.json
  const dir = yamlPath.substring(0, yamlPath.lastIndexOf('/'));
  return join(dir, 'patterns.cache.json');
}

function isCacheValid(yamlPath: string, cachePath: string): boolean {
  try {
    if (!existsSync(cachePath)) return false;
    const yamlMtime = statSync(yamlPath).mtimeMs;
    const cacheMtime = statSync(cachePath).mtimeMs;
    return cacheMtime > yamlMtime;
  } catch {
    return false;
  }
}

function loadFromCache(cachePath: string): PatternsConfig | null {
  try {
    const content = readFileSync(cachePath, 'utf-8');
    return JSON.parse(content) as PatternsConfig;
  } catch {
    return null;
  }
}

async function compileAndCache(yamlPath: string, cachePath: string): Promise<PatternsConfig> {
  // Dynamic import: only load yaml library when cache miss (cold path)
  const { parse: parseYaml } = await import('yaml');
  const content = readFileSync(yamlPath, 'utf-8');
  const config = parseYaml(content) as PatternsConfig;

  // Write cache atomically (write to temp, rename)
  try {
    const tmpPath = cachePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(config));
    const { renameSync } = await import('fs');
    renameSync(tmpPath, cachePath);
  } catch {
    // Cache write failure is non-fatal — next run will try again
  }

  return config;
}

// Fallback config when patterns.yaml is missing/broken.
// Contains HARDCODED critical blocks so security isn't zero even without yaml.
const EMPTY_CONFIG: PatternsConfig = {
  version: '0.0-fallback',
  philosophy: { mode: 'permissive', principle: 'Fallback — critical blocks only' },
  bash: {
    trusted: [],
    blocked: [
      { pattern: '^\\s*rm\\s+-rf\\s+/', reason: 'Dangerous recursive delete from root' },
      { pattern: 'chmod\\s+777', reason: 'World-writable permissions' },
      { pattern: '>(\\s+)/etc/', reason: 'Writing to system config' },
    ],
    confirm: [],
    alert: [],
  },
  paths: {
    zeroAccess: ['\\.env$', 'credentials\\.json$', 'id_rsa'],
    readOnly: [],
    confirmWrite: ['settings\\.json$'],
    noDelete: [],
  },
  projects: {}
};

async function loadPatterns(): Promise<PatternsConfig> {
  if (patternsCache) return patternsCache;

  const yamlPath = getPatternsPath();

  if (!yamlPath) {
    return EMPTY_CONFIG;
  }

  try {
    const cachePath = getCachePath(yamlPath);

    // Fast path: load from JSON cache if valid
    if (isCacheValid(yamlPath, cachePath)) {
      const cached = loadFromCache(cachePath);
      if (cached) {
        patternsCache = cached;
        return cached;
      }
    }

    // Slow path: parse YAML, write cache for next time
    const config = await compileAndCache(yamlPath, cachePath);
    patternsCache = config;
    return config;
  } catch (error) {
    // Parse error - fail open
    console.error(`Failed to parse ${patternsSource} patterns:`, error);
    return EMPTY_CONFIG;
  }
}

// ========================================
// Command Normalization
// ========================================

/**
 * Strip leading environment variable assignments from a command.
 * Prevents bypass like: LANG=C rm -rf / or FOO="bar" dangerous-cmd
 * Also strips leading whitespace.
 */
function stripEnvVarPrefix(command: string): string {
  return command.replace(
    /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]*)\s+)*/,
    ''
  );
}

// ========================================
// Pattern Matching
// ========================================

function matchesPattern(command: string, pattern: string): boolean {
  // Convert pattern to regex
  // Patterns can use .* for wildcards
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(command);
  } catch {
    // Invalid regex - try literal match
    return command.toLowerCase().includes(pattern.toLowerCase());
  }
}

function expandPath(path: string): string {
  // Expand ~ to home directory
  if (path.startsWith('~')) {
    return path.replace('~', homedir());
  }
  return path;
}

function matchesPathPattern(filePath: string, pattern: string): boolean {
  const expandedPattern = expandPath(pattern);
  const expandedPath = expandPath(filePath);

  // Handle glob patterns
  if (pattern.includes('*')) {
    // First replace ** with a placeholder, then escape, then convert back
    let regexPattern = expandedPattern
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')  // Protect **
      .replace(/\*/g, '<<<SINGLESTAR>>>')    // Protect *
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special chars
      .replace(/<<<DOUBLESTAR>>>/g, '.*')    // ** = anything including /
      .replace(/<<<SINGLESTAR>>>/g, '[^/]*'); // * = anything except /

    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(expandedPath);
    } catch {
      return false;
    }
  }

  // Exact match or prefix match for directories
  return expandedPath === expandedPattern ||
         expandedPath.startsWith(expandedPattern.endsWith('/') ? expandedPattern : expandedPattern + '/');
}

// ========================================
// Bash Command Validation
// ========================================

async function validateBashCommand(command: string): Promise<{ action: 'allow' | 'block' | 'confirm' | 'alert'; reason?: string }> {
  const patterns = await loadPatterns();

  // Check trusted patterns FIRST (fast-path allow, no logging)
  for (const p of (patterns.bash.trusted || [])) {
    if (matchesPattern(command, p.pattern)) {
      return { action: 'allow' };
    }
  }

  // Check blocked patterns (hard block)
  for (const p of patterns.bash.blocked) {
    if (matchesPattern(command, p.pattern)) {
      return { action: 'block', reason: p.reason };
    }
  }

  // Check confirm patterns (prompt user)
  for (const p of patterns.bash.confirm) {
    if (matchesPattern(command, p.pattern)) {
      return { action: 'confirm', reason: p.reason };
    }
  }

  // Check alert patterns (log but allow)
  for (const p of patterns.bash.alert) {
    if (matchesPattern(command, p.pattern)) {
      return { action: 'alert', reason: p.reason };
    }
  }

  return { action: 'allow' };
}

// ========================================
// Path Validation
// ========================================

type PathAction = 'read' | 'write' | 'delete';

async function validatePath(filePath: string, action: PathAction): Promise<{ action: 'allow' | 'block' | 'confirm'; reason?: string }> {
  const patterns = await loadPatterns();

  // Check zeroAccess (complete denial)
  for (const p of patterns.paths.zeroAccess) {
    if (matchesPathPattern(filePath, p)) {
      return { action: 'block', reason: `Zero access path: ${p}` };
    }
  }

  // Check readOnly (can read, cannot write/delete)
  if (action === 'write' || action === 'delete') {
    for (const p of patterns.paths.readOnly) {
      if (matchesPathPattern(filePath, p)) {
        return { action: 'block', reason: `Read-only path: ${p}` };
      }
    }
  }

  // Check confirmWrite (can read, writing requires confirmation)
  if (action === 'write') {
    for (const p of patterns.paths.confirmWrite) {
      if (matchesPathPattern(filePath, p)) {
        return { action: 'confirm', reason: `Writing to protected file requires confirmation: ${p}` };
      }
    }
  }

  // Check noDelete (can read/write, cannot delete)
  if (action === 'delete') {
    for (const p of patterns.paths.noDelete) {
      if (matchesPathPattern(filePath, p)) {
        return { action: 'block', reason: `Cannot delete protected path: ${p}` };
      }
    }
  }

  return { action: 'allow' };
}

// ========================================
// Tool-Specific Handlers
// ========================================

async function handleBash(input: HookInput): Promise<void> {
  const rawCommand = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.command as string) || '';

  if (!rawCommand) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Normalize: strip env var prefixes to prevent bypass (e.g., LANG=C rm -rf /)
  const command = stripEnvVarPrefix(rawCommand);
  const result = await validateBashCommand(command);

  switch (result.action) {
    case 'block':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'block',
        tool: 'Bash',
        category: 'bash_command',
        target: command.slice(0, 500),
        reason: result.reason,
        action_taken: 'Hard block - exit 2'
      });
      console.error(`[PAI SECURITY] 🚨 BLOCKED: ${result.reason}`);
      console.error(`Command: ${command.slice(0, 100)}`);
      process.exit(2);
      break;

    case 'confirm':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'confirm',
        tool: 'Bash',
        category: 'bash_command',
        target: command.slice(0, 500),
        reason: result.reason,
        action_taken: 'Prompted user for confirmation'
      });
      console.log(JSON.stringify({
        decision: 'ask',
        message: `[PAI SECURITY] ⚠️ ${result.reason}\n\nCommand: ${command.slice(0, 200)}\n\nProceed?`
      }));
      break;

    case 'alert':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'alert',
        tool: 'Bash',
        category: 'bash_command',
        target: command.slice(0, 500),
        reason: result.reason,
        action_taken: 'Logged alert, allowed execution'
      });
      console.error(`[PAI SECURITY] ⚠️ ALERT: ${result.reason}`);
      console.error(`Command: ${command.slice(0, 100)}`);
      console.log(JSON.stringify({ continue: true }));
      break;

    default:
      console.log(JSON.stringify({ continue: true }));
  }
}

async function validateContent(content: string): Promise<{ action: 'allow' | 'block' | 'confirm'; reason?: string }> {
  const patterns = await loadPatterns();
  if (!patterns.content) return { action: 'allow' };

  // Check blocked content patterns
  for (const p of (patterns.content.blocked || [])) {
    try {
      if (new RegExp(p.pattern).test(content)) {
        return { action: 'block', reason: p.reason };
      }
    } catch (err) { process.stderr.write(`[SecurityValidator] error description: ${err}\n`); /* invalid regex — skip */ }
  }

  // Check confirm content patterns
  for (const p of (patterns.content.confirm || [])) {
    try {
      if (new RegExp(p.pattern).test(content)) {
        return { action: 'confirm', reason: p.reason };
      }
    } catch (err) { process.stderr.write(`[SecurityValidator] error description: ${err}\n`); /* invalid regex — skip */ }
  }

  return { action: 'allow' };
}

async function handleFileWrite(input: HookInput, toolName: string): Promise<void> {
  const filePath = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.file_path as string) || '';

  if (!filePath) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const result = await validatePath(filePath, 'write');

  switch (result.action) {
    case 'block':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'block',
        tool: toolName,
        category: 'path_access',
        target: filePath,
        reason: result.reason,
        action_taken: 'Hard block - exit 2'
      });
      console.error(`[PAI SECURITY] 🚨 BLOCKED: ${result.reason}`);
      console.error(`Path: ${filePath}`);
      process.exit(2);
      break;

    case 'confirm':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'confirm',
        tool: toolName,
        category: 'path_access',
        target: filePath,
        reason: result.reason,
        action_taken: 'Prompted user for confirmation'
      });
      console.log(JSON.stringify({
        decision: 'ask',
        message: `[PAI SECURITY] ⚠️ ${result.reason}\n\nPath: ${filePath}\n\nProceed?`
      }));
      return;

    default:
      break;
  }

  // Content inspection via additionalContext (Edit/Write provide file content)
  const content = input.additionalContext
    || (typeof input.tool_input !== 'string' ? (input.tool_input?.content as string || input.tool_input?.new_string as string) : '');

  if (content && content.length < 1_000_000) {
    const contentResult = await validateContent(content);
    if (contentResult.action === 'block') {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'block',
        tool: toolName,
        category: 'content_pattern',
        target: filePath,
        reason: contentResult.reason!,
        action_taken: 'Hard block - exit 2'
      });
      console.error(`[PAI SECURITY] 🚨 BLOCKED: ${contentResult.reason}`);
      console.error(`Path: ${filePath}`);
      process.exit(2);
    }
    if (contentResult.action === 'confirm') {
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'confirm',
        tool: toolName,
        category: 'content_pattern',
        target: filePath,
        reason: contentResult.reason!,
        action_taken: 'Prompted user for confirmation'
      });
      console.log(JSON.stringify({
        decision: 'ask',
        message: `[PAI SECURITY] ⚠️ ${contentResult.reason}\n\nPath: ${filePath}\n\nProceed?`
      }));
      return;
    }
  }

  console.log(JSON.stringify({ continue: true }));
}

async function handleRead(input: HookInput): Promise<void> {
  const filePath = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.file_path as string) || '';

  if (!filePath) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const result = await validatePath(filePath, 'read');

  switch (result.action) {
    case 'block':
      logSecurityEvent({
        timestamp: new Date().toISOString(),
        session_id: input.session_id,
        event_type: 'block',
        tool: 'Read',
        category: 'path_access',
        target: filePath,
        reason: result.reason,
        action_taken: 'Hard block - exit 2'
      });
      console.error(`[PAI SECURITY] 🚨 BLOCKED: ${result.reason}`);
      console.error(`Path: ${filePath}`);
      process.exit(2);
      break;

    default:
      console.log(JSON.stringify({ continue: true }));
  }
}

// ========================================
// Main
// ========================================

async function main(): Promise<void> {
  let input: HookInput;

  try {
    // Streaming stdin read with hard timeout.
    // Bun.stdin.text() can hang forever if stdin never closes (known Bun issue).
    // Use streaming reader + setTimeout that forces process.exit on timeout.
    const reader = Bun.stdin.stream().getReader();
    let raw = '';
    const readLoop = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value, { stream: true });
      }
    })();

    // Hard timeout: if stdin doesn't close in 500ms, fail open.
    // 500ms is generous — stdin data arrives within single-digit ms when piped.
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
    }, 500);

    await Promise.race([readLoop, new Promise<void>(r => setTimeout(r, 500))]);
    clearTimeout(timeoutId);

    if (timedOut && !raw.trim()) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    if (!raw.trim()) {
      console.log(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    input = JSON.parse(raw);
  } catch (err) {
    // Parse error or timeout - fail open but LOG
    process.stderr.write(`[SecurityValidator] stdin parse error, failing open: ${err}\n`);
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
    return;
  }

  // Route to appropriate handler
  switch (input.tool_name) {
    case 'Bash':
      await handleBash(input);
      break;
    case 'Edit':
    case 'MultiEdit':
      await handleFileWrite(input, input.tool_name);
      break;
    case 'Write':
      await handleFileWrite(input, 'Write');
      break;
    case 'Read':
      await handleRead(input);
      break;
    default:
      // Allow all other tools
      console.log(JSON.stringify({ continue: true }));
  }

  // Explicit exit: prevents dangling setTimeout timers from Promise.race
  // from keeping the event loop alive for an extra 100-200ms.
  process.exit(0);
}

// Run main, fail open on any error (but LOG it so failures are visible)
main().catch((err) => {
  process.stderr.write(`[SecurityValidator] CRITICAL: main() crashed, failing open: ${err}\n`);
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
