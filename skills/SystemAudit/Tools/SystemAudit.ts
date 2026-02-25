#!/usr/bin/env bun
/**
 * SystemAudit.ts — Deterministic PAI System Audit Tool
 *
 * Performs comprehensive, reproducible checks across all PAI subsystems:
 * hooks, skills, tools, memory, config, voice, and security.
 *
 * Usage:
 *   bun SystemAudit.ts              — run all checks
 *   bun SystemAudit.ts --domain hooks
 *   bun SystemAudit.ts --domain hooks,skills,security
 *   bun SystemAudit.ts --quick      — critical checks only
 *   bun SystemAudit.ts --json       — JSON output
 *   bun SystemAudit.ts --help       — usage info
 *
 * Exit codes: 0 = all pass, 1 = warnings, 2 = critical failures
 *
 * No external dependencies — uses only node builtins + Bun globals.
 */

import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
  appendFileSync,
  writeFileSync,
} from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// ─── Constants ──────────────────────────────────────────────────

const PAI_DIR = process.env.PAI_DIR
  ? process.env.PAI_DIR.replace(/^\$HOME/, homedir()).replace(/^~/, homedir())
  : join(homedir(), ".claude");

const SETTINGS_PATH = join(PAI_DIR, "settings.json");
const HOOKS_DIR = join(PAI_DIR, "hooks");
const SKILLS_DIR = join(PAI_DIR, "skills");
const SKILL_INDEX_PATH = join(SKILLS_DIR, "skill-index.json");
const TOOLS_DIR = join(SKILLS_DIR, "PAI", "Tools");
const MEMORY_DIR = join(PAI_DIR, "MEMORY");
const VALIDATORS_PATH = join(HOOKS_DIR, "lib", "output-validators.ts");
const GITIGNORE_PATH = join(PAI_DIR, ".gitignore");

// Skill dirs excluded from orphan detection (not in skill-index.json by design)
const SKILL_EXCEPTIONS = new Set([
  "CORE",
  "PAI",
  "skill-index.json",
  "skill-workflow-capabilities.json",
]);

// ANSI colors
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// ─── Types ──────────────────────────────────────────────────────

type Status = "pass" | "warn" | "fail";

interface CheckResult {
  domain: string;
  check: string;
  status: Status;
  message: string;
  details?: string[];
}

type DomainName =
  | "hooks"
  | "skills"
  | "tools"
  | "memory"
  | "config"
  | "voice"
  | "security";

// Quick mode: only these checks run
const QUICK_CHECKS = new Set([
  "hooks-file-sync",
  "hooks-executable",
  "skills-index-sync",
  "config-counts",
  "voice-server",
  "memory-learning-freshness",
  "security-exposed-keys",
  "security-gitignore",
  "config-mcp-env",
]);

// ─── Helpers ────────────────────────────────────────────────────

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function safeReadFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

/**
 * List immediate child entries in a directory.
 * Returns [] if directory does not exist.
 */
function listDir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Check if a path is a directory.
 */
function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Count files matching a pattern in a directory (non-recursive).
 */
function countFiles(dir: string, ext?: string): number {
  const entries = listDir(dir);
  if (!ext) return entries.length;
  return entries.filter((e) => e.endsWith(ext)).length;
}

/**
 * Count lines in a file. Returns 0 if file doesn't exist.
 */
function countLines(filePath: string): number {
  const content = safeReadFile(filePath);
  if (!content) return 0;
  // Trim trailing newline so we don't count an empty last line
  const trimmed = content.endsWith("\n") ? content.slice(0, -1) : content;
  return trimmed.split("\n").length;
}

/**
 * Recursively find files matching a predicate.
 */
function findFilesRecursive(
  dir: string,
  predicate: (name: string, fullPath: string) => boolean
): string[] {
  const results: string[] = [];
  if (!isDir(dir)) return results;

  function walk(d: string) {
    for (const entry of listDir(d)) {
      const full = join(d, entry);
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          walk(full);
        } else if (predicate(entry, full)) {
          results.push(full);
        }
      } catch {
        // Permission denied or broken symlink — skip
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Find empty directories recursively.
 */
function findEmptyDirs(dir: string): string[] {
  const results: string[] = [];
  if (!isDir(dir)) return results;

  function walk(d: string) {
    const entries = listDir(d);
    if (entries.length === 0) {
      results.push(d);
      return;
    }
    for (const entry of entries) {
      const full = join(d, entry);
      if (isDir(full)) {
        walk(full);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Extract all unique hook file basenames referenced in settings.json hooks config.
 */
function extractHookReferences(settings: any): Set<string> {
  const refs = new Set<string>();
  if (!settings?.hooks) return refs;

  for (const eventType of Object.values(settings.hooks) as any[]) {
    if (!Array.isArray(eventType)) continue;
    for (const entry of eventType) {
      const hookList = entry?.hooks ?? [];
      for (const hook of hookList) {
        if (hook?.command) {
          // Command is like "${PAI_DIR}/hooks/VoiceGate.hook.ts"
          const cmd: string = hook.command;
          const match = cmd.match(/hooks\/([^/]+\.hook\.ts)$/);
          if (match) {
            refs.add(match[1]);
          }
        }
      }
    }
  }
  return refs;
}

/**
 * Check if a binary/command exists on PATH or as absolute path.
 */
function commandExists(cmd: string): boolean {
  // If it's an absolute path, check directly
  if (cmd.startsWith("/")) {
    return existsSync(cmd);
  }
  // Check common locations
  const pathDirs = (process.env.PATH || "").split(":");
  for (const dir of pathDirs) {
    if (existsSync(join(dir, cmd))) return true;
  }
  return false;
}

// ─── Domain Checks ──────────────────────────────────────────────

function checkHooks(settings: any): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. hooks-file-sync: each hook in settings has a .hook.ts file
  const referencedHooks = extractHookReferences(settings);
  const missingFiles: string[] = [];
  for (const hookFile of referencedHooks) {
    if (!existsSync(join(HOOKS_DIR, hookFile))) {
      missingFiles.push(hookFile);
    }
  }
  results.push({
    domain: "hooks",
    check: "hooks-file-sync",
    status: missingFiles.length === 0 ? "pass" : "fail",
    message:
      missingFiles.length === 0
        ? `${referencedHooks.size}/${referencedHooks.size} hooks have files`
        : `${missingFiles.length} hook(s) missing files`,
    details: missingFiles.length > 0 ? missingFiles : undefined,
  });

  // 2. hooks-orphaned: .hook.ts files not referenced in settings
  const diskHooks = listDir(HOOKS_DIR).filter((f) => f.endsWith(".hook.ts"));
  const orphaned = diskHooks.filter((f) => !referencedHooks.has(f));
  results.push({
    domain: "hooks",
    check: "hooks-orphaned",
    status: orphaned.length === 0 ? "pass" : "warn",
    message: `${orphaned.length} orphaned hook file(s)`,
    details: orphaned.length > 0 ? orphaned : undefined,
  });

  // 3. hooks-hardcoded-voice: grep for literal voice ID strings
  // Skip comment lines and lines using getVoiceId() (dynamic lookup)
  const voiceIdPattern = /voice_id.*['"][a-zA-Z0-9]{20,}['"]/;
  const hardcodedVoiceFiles: string[] = [];
  for (const hookFile of diskHooks) {
    const content = safeReadFile(join(HOOKS_DIR, hookFile));
    const lines = content.split("\n").filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.includes("getVoiceId");
    });
    if (voiceIdPattern.test(lines.join("\n"))) {
      hardcodedVoiceFiles.push(hookFile);
    }
  }
  results.push({
    domain: "hooks",
    check: "hooks-hardcoded-voice",
    status: hardcodedVoiceFiles.length === 0 ? "pass" : "warn",
    message: `${hardcodedVoiceFiles.length} file(s) with hardcoded voice ID`,
    details:
      hardcodedVoiceFiles.length > 0 ? hardcodedVoiceFiles : undefined,
  });

  // 4. hooks-empty-dirs: empty directories inside hooks/
  const emptyDirs = findEmptyDirs(HOOKS_DIR);
  results.push({
    domain: "hooks",
    check: "hooks-empty-dirs",
    status: emptyDirs.length === 0 ? "pass" : "warn",
    message: `${emptyDirs.length} empty director${emptyDirs.length === 1 ? "y" : "ies"}`,
    details:
      emptyDirs.length > 0
        ? emptyDirs.map((d) => d.replace(PAI_DIR + "/", ""))
        : undefined,
  });

  // 5. hooks-executable: check +x permission on all .hook.ts files
  const nonExecutable: string[] = [];
  for (const hookFile of diskHooks) {
    try {
      const s = statSync(join(HOOKS_DIR, hookFile));
      // Check if any execute bit is set (owner, group, or other)
      if ((s.mode & 0o111) === 0) {
        nonExecutable.push(hookFile);
      }
    } catch { /* skip */ }
  }
  results.push({
    domain: "hooks",
    check: "hooks-executable",
    status: nonExecutable.length === 0 ? "pass" : "warn",
    message: nonExecutable.length === 0
      ? `All ${diskHooks.length} hooks are executable`
      : `${nonExecutable.length} hook(s) missing execute permission`,
    details: nonExecutable.length > 0 ? nonExecutable : undefined,
  });

  // 6. hooks-hardcoded-keys: scan hooks/*.ts and hooks/lib/*.ts for API key patterns
  const hookKeyPattern = /API_KEY.*=.*['"][a-f0-9-]{20,}['"]/i;
  const hookFilesWithKeys: string[] = [];
  const hookTsFiles = listDir(HOOKS_DIR).filter((f) => f.endsWith(".ts"));
  const hookLibDir = join(HOOKS_DIR, "lib");
  const hookLibTsFiles = listDir(hookLibDir).filter((f) => f.endsWith(".ts"));
  const allHookTsFiles = [
    ...hookTsFiles.map((f) => ({ name: f, path: join(HOOKS_DIR, f) })),
    ...hookLibTsFiles.map((f) => ({ name: `lib/${f}`, path: join(hookLibDir, f) })),
  ];
  for (const { name, path } of allHookTsFiles) {
    const content = safeReadFile(path);
    if (hookKeyPattern.test(content)) {
      hookFilesWithKeys.push(name);
    }
  }
  results.push({
    domain: "hooks",
    check: "hooks-hardcoded-keys",
    status: hookFilesWithKeys.length === 0 ? "pass" : "fail",
    message:
      hookFilesWithKeys.length === 0
        ? "No hardcoded API keys in hooks"
        : `${hookFilesWithKeys.length} hook file(s) with hardcoded API key patterns`,
    details: hookFilesWithKeys.length > 0 ? hookFilesWithKeys : undefined,
  });

  return results;
}

function checkSkills(skillIndex: any): CheckResult[] {
  const results: CheckResult[] = [];

  const indexedSkills: Record<string, any> = skillIndex?.skills ?? {};
  const indexedCount = skillIndex?.totalSkills ?? Object.keys(indexedSkills).length;

  // Collect actual skill directories on disk (excluding known exceptions)
  const diskEntries = listDir(SKILLS_DIR).filter(
    (e) => !SKILL_EXCEPTIONS.has(e) && isDir(join(SKILLS_DIR, e))
  );

  // 1. skills-index-sync: compare totalSkills with actual disk dirs
  // Note: skill-index includes nested skills (e.g., Documents/Pdf) so we compare
  // the totalSkills count with the number of entries in the skills object
  const actualIndexedCount = Object.keys(indexedSkills).length;
  const syncMatch = indexedCount === actualIndexedCount;
  const nestedNote = indexedCount !== diskEntries.length ? " (including nested)" : "";
  results.push({
    domain: "skills",
    check: "skills-index-sync",
    status: syncMatch ? "pass" : "warn",
    message: `${indexedCount} indexed${nestedNote}, ${actualIndexedCount} in skills object, ${diskEntries.length} top-level dirs on disk`,
  });

  // 2. skills-disk-missing: for each indexed skill, verify path exists
  const missingPaths: string[] = [];
  for (const [key, skill] of Object.entries(indexedSkills) as [string, any][]) {
    if (skill.path) {
      const skillDir = join(SKILLS_DIR, skill.path.replace(/\/SKILL\.md$/, ""));
      const skillFile = join(SKILLS_DIR, skill.path);
      if (!existsSync(skillDir) && !existsSync(skillFile)) {
        missingPaths.push(`${key} -> ${skill.path}`);
      }
    }
  }
  results.push({
    domain: "skills",
    check: "skills-disk-missing",
    status: missingPaths.length === 0 ? "pass" : "fail",
    message:
      missingPaths.length === 0
        ? `All ${actualIndexedCount} indexed skills exist on disk`
        : `${missingPaths.length} indexed skill(s) missing on disk`,
    details: missingPaths.length > 0 ? missingPaths : undefined,
  });

  // 3. skills-orphaned-dirs: dirs on disk not in skill-index
  // Build set of top-level dirs referenced by indexed skills
  const indexedTopDirs = new Set<string>();
  for (const skill of Object.values(indexedSkills) as any[]) {
    if (skill.path) {
      const topDir = skill.path.split("/")[0];
      indexedTopDirs.add(topDir);
    }
  }
  const orphanedDirs = diskEntries.filter((d) => !indexedTopDirs.has(d));
  results.push({
    domain: "skills",
    check: "skills-orphaned-dirs",
    status: orphanedDirs.length === 0 ? "pass" : "warn",
    message: `${orphanedDirs.length} orphaned skill director${orphanedDirs.length === 1 ? "y" : "ies"}`,
    details: orphanedDirs.length > 0 ? orphanedDirs : undefined,
  });

  // 4. skills-truncated-desc: fullDescription < 10 chars
  const truncated: string[] = [];
  for (const [key, skill] of Object.entries(indexedSkills) as [string, any][]) {
    if (!skill.fullDescription || skill.fullDescription.length < 10) {
      truncated.push(`${key}: "${skill.fullDescription || ""}"`);
    }
  }
  results.push({
    domain: "skills",
    check: "skills-truncated-desc",
    status: truncated.length === 0 ? "pass" : "warn",
    message:
      truncated.length === 0
        ? "All skill descriptions are adequate"
        : `${truncated.length} skill(s) with truncated description (<10 chars)`,
    details: truncated.length > 0 ? truncated : undefined,
  });

  return results;
}

function checkTools(): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. tools-count: count .ts files in Tools/
  const tsCount = countFiles(TOOLS_DIR, ".ts");
  results.push({
    domain: "tools",
    check: "tools-count",
    status: "pass",
    message: `${tsCount} .ts files in PAI/Tools/`,
  });

  // 2. tools-hardcoded-keys: grep for API key patterns
  const keyPattern = /API_KEY.*=.*['"][a-f0-9-]{20,}['"]/i;
  const filesWithKeys: string[] = [];
  const toolFiles = listDir(TOOLS_DIR).filter((f) => f.endsWith(".ts"));
  for (const tf of toolFiles) {
    const content = safeReadFile(join(TOOLS_DIR, tf));
    if (keyPattern.test(content)) {
      filesWithKeys.push(tf);
    }
  }
  results.push({
    domain: "tools",
    check: "tools-hardcoded-keys",
    status: filesWithKeys.length === 0 ? "pass" : "fail",
    message:
      filesWithKeys.length === 0
        ? "No hardcoded API keys found"
        : `${filesWithKeys.length} file(s) with hardcoded API key patterns`,
    details: filesWithKeys.length > 0 ? filesWithKeys : undefined,
  });

  return results;
}

function checkMemory(): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. memory-work-count: count dirs in MEMORY/WORK/
  const workDir = join(MEMORY_DIR, "WORK");
  const workEntries = listDir(workDir).filter((e) => isDir(join(workDir, e)));
  results.push({
    domain: "memory",
    check: "memory-work-count",
    status: "pass",
    message: `${workEntries.length} work session(s)`,
  });

  // 2. memory-ratings-count: count lines in ratings.jsonl
  const ratingsPath = join(MEMORY_DIR, "LEARNING", "SIGNALS", "ratings.jsonl");
  const ratingsCount = existsSync(ratingsPath) ? countLines(ratingsPath) : 0;
  results.push({
    domain: "memory",
    check: "memory-ratings-count",
    status: ratingsCount > 0 ? "pass" : "warn",
    message: `${ratingsCount} rating(s) recorded`,
  });

  // memory-learning-freshness: check last rating is within 7 days
  let freshnessStatus: Status = "warn";
  let freshnessMessage = "No ratings found";
  if (ratingsCount > 0) {
    try {
      const content = safeReadFile(ratingsPath);
      const lines = content.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      const parsed = JSON.parse(lastLine);
      const lastTimestamp = parsed.timestamp || parsed.date || parsed.created;
      if (lastTimestamp) {
        const lastDate = new Date(lastTimestamp);
        const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) {
          freshnessStatus = "pass";
          freshnessMessage = `Last rating ${daysSince.toFixed(1)} days ago`;
        } else {
          freshnessMessage = `Last rating ${daysSince.toFixed(0)} days ago (>7 days stale)`;
        }
      } else {
        freshnessMessage = "Cannot parse timestamp from last rating";
      }
    } catch {
      freshnessMessage = "Cannot parse last rating entry";
    }
  }
  results.push({
    domain: "memory",
    check: "memory-learning-freshness",
    status: freshnessStatus,
    message: freshnessMessage,
  });

  // 3. memory-wisdom-domains: count .md/.json files in MEMORY/WISDOM/
  const wisdomDir = join(MEMORY_DIR, "WISDOM");
  const wisdomFiles = listDir(wisdomDir).filter(
    (f) => f.endsWith(".md") || f.endsWith(".json")
  );
  results.push({
    domain: "memory",
    check: "memory-wisdom-domains",
    status: wisdomFiles.length > 0 ? "pass" : "warn",
    message: `${wisdomFiles.length} wisdom domain file(s)`,
    details: wisdomFiles.length > 0 ? wisdomFiles : undefined,
  });

  // 4. memory-stale-bak: find .bak files under MEMORY/ or skills/PAI/USER/
  const bakFiles: string[] = [];
  for (const searchDir of [MEMORY_DIR, join(SKILLS_DIR, "PAI", "USER")]) {
    bakFiles.push(
      ...findFilesRecursive(searchDir, (name) => name.endsWith(".bak"))
    );
  }
  results.push({
    domain: "memory",
    check: "memory-stale-bak",
    status: bakFiles.length === 0 ? "pass" : "warn",
    message:
      bakFiles.length === 0
        ? "No stale .bak files"
        : `${bakFiles.length} .bak file(s) found`,
    details:
      bakFiles.length > 0
        ? bakFiles.map((f) => f.replace(PAI_DIR + "/", ""))
        : undefined,
  });

  return results;
}

function checkConfig(settings: any): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. config-counts: compare settings.json counts with reality
  const counts = settings?.counts ?? {};
  const drifts: string[] = [];

  // Skills count
  const skillIndex = readJson(SKILL_INDEX_PATH);
  const actualSkills = skillIndex?.totalSkills ?? 0;
  if (counts.skills !== undefined && counts.skills !== actualSkills) {
    drifts.push(
      `skills: settings=${counts.skills}, actual=${actualSkills}`
    );
  }

  // Hooks count
  const actualHooks = listDir(HOOKS_DIR).filter((f) =>
    f.endsWith(".hook.ts")
  ).length;
  if (counts.hooks !== undefined && counts.hooks !== actualHooks) {
    drifts.push(
      `hooks: settings=${counts.hooks}, actual=${actualHooks}`
    );
  }

  // Ratings count
  const ratingsPath = join(MEMORY_DIR, "LEARNING", "SIGNALS", "ratings.jsonl");
  const actualRatings = existsSync(ratingsPath) ? countLines(ratingsPath) : 0;
  if (counts.ratings !== undefined && counts.ratings !== actualRatings) {
    drifts.push(
      `ratings: settings=${counts.ratings}, actual=${actualRatings}`
    );
  }

  // Work sessions count
  const workDir = join(MEMORY_DIR, "WORK");
  const actualWork = listDir(workDir).filter((e) => isDir(join(workDir, e))).length;
  if (counts.work !== undefined && counts.work !== actualWork) {
    drifts.push(
      `work: settings=${counts.work}, actual=${actualWork}`
    );
  }

  // Sessions, workflows, signals, files — incremental counters managed by hooks
  // Not comparable to disk state, skip verification

  results.push({
    domain: "config",
    check: "config-counts",
    status: drifts.length === 0 ? "pass" : "warn",
    message:
      drifts.length === 0
        ? "All counts match reality"
        : `${drifts.length} count(s) drifted`,
    details: drifts.length > 0 ? drifts : undefined,
  });

  // 2. config-context-files: verify each contextFiles path exists
  const contextFiles: string[] = settings?.contextFiles ?? [];
  const missingCtx: string[] = [];
  for (const cf of contextFiles) {
    const fullPath = join(PAI_DIR, cf);
    if (!existsSync(fullPath)) {
      missingCtx.push(cf);
    }
  }
  results.push({
    domain: "config",
    check: "config-context-files",
    status: missingCtx.length === 0 ? "pass" : "fail",
    message:
      missingCtx.length === 0
        ? `All ${contextFiles.length} context file(s) exist`
        : `${missingCtx.length} context file(s) missing`,
    details: missingCtx.length > 0 ? missingCtx : undefined,
  });

  // 3. config-mcp-binaries: verify MCP server commands exist
  const mcpServers: Record<string, any> = settings?.mcpServers ?? {};
  const missingMcp: string[] = [];
  for (const [name, server] of Object.entries(mcpServers)) {
    const cmd = server?.command;
    if (cmd && !commandExists(cmd)) {
      missingMcp.push(`${name}: ${cmd}`);
    }
  }
  results.push({
    domain: "config",
    check: "config-mcp-binaries",
    status: missingMcp.length === 0 ? "pass" : "warn",
    message:
      missingMcp.length === 0
        ? `All ${Object.keys(mcpServers).length} MCP server command(s) found`
        : `${missingMcp.length} MCP command(s) not found on PATH`,
    details: missingMcp.length > 0 ? missingMcp : undefined,
  });

  // 4. config-mcp-env: verify MCP server env vars are set (not empty, not placeholder)
  // Note: ${VAR_NAME} is valid Claude Code syntax for env var resolution at runtime
  const missingEnv: string[] = [];
  for (const [name, server] of Object.entries(mcpServers)) {
    const env: Record<string, string> = (server as any)?.env ?? {};
    for (const [key, value] of Object.entries(env)) {
      // ${VAR} syntax is valid — Claude Code resolves at runtime
      const isEnvRef = /^\$\{[A-Z_]+\}$/.test(value);
      if (!value || value === "YOUR_" || (!isEnvRef && value.length < 5)) {
        missingEnv.push(`${name}.${key}`);
      }
    }
  }
  results.push({
    domain: "config",
    check: "config-mcp-env",
    status: missingEnv.length === 0 ? "pass" : "warn",
    message:
      missingEnv.length === 0
        ? `All MCP env vars are set`
        : `${missingEnv.length} MCP env var(s) missing or placeholder`,
    details: missingEnv.length > 0 ? missingEnv : undefined,
  });

  return results;
}

async function checkVoice(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. voice-server: fetch health endpoint with 3s timeout
  let voiceStatus: Status = "fail";
  let voiceMessage = "Voice server unreachable";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch("http://localhost:8888/health", {
      signal: controller.signal,
    }).catch(() =>
      // /health might not exist, try root
      fetch("http://localhost:8888/", { signal: controller.signal })
    );
    clearTimeout(timer);
    if (resp.ok || resp.status < 500) {
      voiceStatus = "pass";
      voiceMessage = `Voice server responding (HTTP ${resp.status})`;
    } else {
      voiceStatus = "warn";
      voiceMessage = `Voice server returned HTTP ${resp.status}`;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      voiceMessage = "Voice server timed out (>3s)";
    } else {
      voiceMessage = `Voice server unreachable: ${err?.message ?? "unknown error"}`;
    }
  }
  results.push({
    domain: "voice",
    check: "voice-server",
    status: voiceStatus,
    message: voiceMessage,
  });

  // 2. voice-cyrillic: check if output-validators.ts contains Cyrillic regex
  let cyrillicStatus: Status = "fail";
  let cyrillicMessage = "output-validators.ts not found";
  if (existsSync(VALIDATORS_PATH)) {
    const content = safeReadFile(VALIDATORS_PATH);
    // Check for Cyrillic character class pattern like а-яё or а-я
    if (/[а-яё]/.test(content)) {
      cyrillicStatus = "pass";
      cyrillicMessage = "Cyrillic support found in output validators";
    } else {
      cyrillicStatus = "warn";
      cyrillicMessage = "No Cyrillic patterns in output validators";
    }
  }
  results.push({
    domain: "voice",
    check: "voice-cyrillic",
    status: cyrillicStatus,
    message: cyrillicMessage,
  });

  return results;
}

function checkSecurity(settings: any): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. security-exposed-keys: grep settings.json for raw API key patterns
  // Look for strings that look like actual keys (not ${VAR} references)
  const settingsRaw = safeReadFile(SETTINGS_PATH);
  const exposedKeys: string[] = [];

  // Match key-like values: long hex/alphanum strings that aren't ${...} references
  const keyPatterns = [
    // Direct string values that look like API keys (20+ alphanum chars, not a ${} ref)
    /"[A-Za-z_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Za-z_]*"\s*:\s*"(?!\$\{)([a-zA-Z0-9_-]{20,})"/gi,
    // Also check env section for non-variable values
    /"(?:API_KEY|ACCESS_TOKEN|SECRET_KEY|AUTH_TOKEN)"\s*:\s*"(?!\$\{)([a-zA-Z0-9_-]{20,})"/gi,
  ];

  for (const pattern of keyPatterns) {
    let match;
    while ((match = pattern.exec(settingsRaw)) !== null) {
      const line = settingsRaw
        .substring(
          settingsRaw.lastIndexOf("\n", match.index) + 1,
          settingsRaw.indexOf("\n", match.index)
        )
        .trim();
      exposedKeys.push(line);
    }
  }

  // Also do a broader scan: any value field that's a long alphanumeric string
  // but skip known safe fields (voiceId, displayName, etc.)
  const safeFields = new Set([
    "voiceId",
    "color",
    "command",
    "topic",
    "server",
    "repoUrl",
    "name",
    "fullName",
    "displayName",
    "pronunciation",
    "voiceName",
    "provider",
    "startupCatchphrase",
    "baseVoice",
    "_docs",
    "_overview",
    "_migration",
    "_env",
    "type",
    "mode",
    "matcher",
    "$schema",
  ]);

  // Scan for "key": "sk-..." or "key": "xai-..." patterns (provider key formats)
  const providerKeyPattern = /:\s*"(sk-[a-zA-Z0-9]{20,}|xai-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|ghu_[a-zA-Z0-9]{20,}|glpat-[a-zA-Z0-9]{20,})"/g;
  let providerMatch;
  while ((providerMatch = providerKeyPattern.exec(settingsRaw)) !== null) {
    exposedKeys.push(`Provider key pattern: ${providerMatch[1].substring(0, 10)}...`);
  }

  results.push({
    domain: "security",
    check: "security-exposed-keys",
    status: exposedKeys.length === 0 ? "pass" : "fail",
    message:
      exposedKeys.length === 0
        ? "No exposed API keys in settings.json"
        : `${exposedKeys.length} potential exposed key(s) in settings.json`,
    details: exposedKeys.length > 0 ? exposedKeys : undefined,
  });

  // 2. security-gitignore: verify .gitignore exists with critical entries
  const missingEntries: string[] = [];
  const requiredEntries = [".env", "node_modules"];

  if (!existsSync(GITIGNORE_PATH)) {
    results.push({
      domain: "security",
      check: "security-gitignore",
      status: "fail",
      message: ".gitignore does not exist",
    });
  } else {
    const gitignoreContent = safeReadFile(GITIGNORE_PATH);
    const lines = gitignoreContent.split("\n").map((l) => l.trim());
    for (const entry of requiredEntries) {
      // Check for the entry or entry/ or entry/*
      const found = lines.some(
        (l) =>
          l === entry ||
          l === `${entry}/` ||
          l === `${entry}/*` ||
          l === `**/node_modules/` ||
          l === `**/node_modules`
      );
      if (!found) {
        missingEntries.push(entry);
      }
    }
    results.push({
      domain: "security",
      check: "security-gitignore",
      status: missingEntries.length === 0 ? "pass" : "warn",
      message:
        missingEntries.length === 0
          ? ".gitignore contains all required entries"
          : `Missing .gitignore entries: ${missingEntries.join(", ")}`,
      details: missingEntries.length > 0 ? missingEntries : undefined,
    });
  }

  return results;
}

// ─── Domain Registry ────────────────────────────────────────────

type DomainRunner = (
  settings: any,
  skillIndex: any
) => CheckResult[] | Promise<CheckResult[]>;

const DOMAIN_RUNNERS: Record<DomainName, DomainRunner> = {
  hooks: (settings) => checkHooks(settings),
  skills: (_settings, skillIndex) => checkSkills(skillIndex),
  tools: () => checkTools(),
  memory: () => checkMemory(),
  config: (settings) => checkConfig(settings),
  voice: () => checkVoice(),
  security: (settings) => checkSecurity(settings),
};

const ALL_DOMAINS: DomainName[] = [
  "hooks",
  "skills",
  "tools",
  "memory",
  "config",
  "voice",
  "security",
];

// ─── Output Formatting ──────────────────────────────────────────

function statusIcon(status: Status): string {
  switch (status) {
    case "pass":
      return `${GREEN}PASS${RESET}`;
    case "warn":
      return `${YELLOW}WARN${RESET}`;
    case "fail":
      return `${RED}FAIL${RESET}`;
  }
}

function statusEmoji(status: Status): string {
  switch (status) {
    case "pass":
      return `${GREEN}  v ${RESET}`;
    case "warn":
      return `${YELLOW}  ! ${RESET}`;
    case "fail":
      return `${RED}  x ${RESET}`;
  }
}

function formatText(results: CheckResult[], startTime: number): string {
  const lines: string[] = [];
  const durationMs = Date.now() - startTime;

  lines.push("");
  lines.push(`${BOLD}PAI System Audit${RESET}`);
  lines.push(`${DIM}${new Date().toLocaleString("sv-SE", { timeZone: "Europe/Moscow" }).replace("T", " ")} MSK${RESET}`);
  lines.push(`${"=".repeat(52)}`);
  lines.push("");

  // Group by domain
  const grouped = new Map<string, CheckResult[]>();
  for (const r of results) {
    if (!grouped.has(r.domain)) grouped.set(r.domain, []);
    grouped.get(r.domain)!.push(r);
  }

  for (const [domain, checks] of grouped) {
    lines.push(
      `${BOLD}${domain.toUpperCase()}${RESET} ${DIM}(${checks.length} check${checks.length === 1 ? "" : "s"})${RESET}`
    );
    for (const c of checks) {
      lines.push(`${statusEmoji(c.status)} ${c.check}: ${c.message}`);
      if (c.details && c.details.length > 0) {
        for (const d of c.details.slice(0, 10)) {
          lines.push(`${DIM}       -> ${d}${RESET}`);
        }
        if (c.details.length > 10) {
          lines.push(
            `${DIM}       ... and ${c.details.length - 10} more${RESET}`
          );
        }
      }
    }
    lines.push("");
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.status === "pass").length;
  const warned = results.filter((r) => r.status === "warn").length;
  const failed = results.filter((r) => r.status === "fail").length;

  lines.push(`${"=".repeat(52)}`);
  const durationSec = (durationMs / 1000).toFixed(1);
  lines.push(
    `SUMMARY: ${total} checks | ${GREEN}${passed} PASS${RESET} | ${YELLOW}${warned} WARN${RESET} | ${RED}${failed} FAIL${RESET} ${DIM}(${durationSec}s)${RESET}`
  );
  lines.push("");

  return lines.join("\n");
}

function formatJson(results: CheckResult[], startTime: number): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    results,
  }, null, 2);
}

// ─── CLI Entrypoint ─────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${BOLD}PAI System Audit${RESET} — Deterministic system health checker

${BOLD}USAGE${RESET}
  bun SystemAudit.ts [OPTIONS]

${BOLD}OPTIONS${RESET}
  --domain <list>   Run specific domain(s), comma-separated
                    Domains: ${ALL_DOMAINS.join(", ")}
  --quick           Run critical checks only (fast subset)
  --json            Output as JSON array
  --help            Show this help

${BOLD}EXAMPLES${RESET}
  bun SystemAudit.ts                            Run all checks
  bun SystemAudit.ts --domain hooks             Single domain
  bun SystemAudit.ts --domain hooks,security    Multiple domains
  bun SystemAudit.ts --quick                    Critical checks only
  bun SystemAudit.ts --json                     JSON output
  bun SystemAudit.ts --quick --json             Combined flags

${BOLD}EXIT CODES${RESET}
  0   All checks passed
  1   One or more warnings (no failures)
  2   One or more critical failures
`);
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const args = process.argv.slice(2);

  // Parse flags
  let showHelp = false;
  let jsonOutput = false;
  let quickMode = false;
  let domainFilter: DomainName[] | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      showHelp = true;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--quick") {
      quickMode = true;
    } else if (arg === "--domain" && i + 1 < args.length) {
      i++;
      const raw = args[i].split(",").map((s) => s.trim().toLowerCase());
      const valid: DomainName[] = [];
      for (const d of raw) {
        if (ALL_DOMAINS.includes(d as DomainName)) {
          valid.push(d as DomainName);
        } else {
          console.error(
            `${RED}Unknown domain: ${d}${RESET}. Valid: ${ALL_DOMAINS.join(", ")}`
          );
          process.exit(2);
        }
      }
      domainFilter = valid;
    } else {
      console.error(`${RED}Unknown argument: ${arg}${RESET}`);
      console.error(`Run with --help for usage.`);
      process.exit(2);
    }
  }

  if (showHelp) {
    printHelp();
    process.exit(0);
  }

  // Determine which domains to run
  const domainsToRun = domainFilter ?? ALL_DOMAINS;

  // In quick mode, we run all domains but filter results to QUICK_CHECKS only
  // However, for efficiency, we determine which domains have quick checks
  const quickDomains = new Set<DomainName>();
  if (quickMode) {
    for (const check of QUICK_CHECKS) {
      const domain = check.split("-")[0] as DomainName;
      if (ALL_DOMAINS.includes(domain)) {
        quickDomains.add(domain);
      }
    }
  }

  const effectiveDomains = quickMode
    ? domainsToRun.filter((d) => quickDomains.has(d))
    : domainsToRun;

  // Load shared data
  const settings = readJson(SETTINGS_PATH);
  const skillIndex = readJson(SKILL_INDEX_PATH);

  if (!settings) {
    console.error(`${RED}FATAL: Cannot read ${SETTINGS_PATH}${RESET}`);
    process.exit(2);
  }

  // Run domain checks
  let allResults: CheckResult[] = [];

  for (const domain of effectiveDomains) {
    const runner = DOMAIN_RUNNERS[domain];
    const domainResults = await runner(settings, skillIndex);
    allResults.push(...domainResults);
  }

  // In quick mode, filter to quick checks only
  if (quickMode) {
    allResults = allResults.filter((r) => QUICK_CHECKS.has(r.check));
  }

  // Output
  if (jsonOutput) {
    console.log(formatJson(allResults, startTime));
  } else {
    console.log(formatText(allResults, startTime));
  }

  // Save audit history
  const auditDir = join(MEMORY_DIR, "AUDIT");
  const reportsDir = join(auditDir, "reports");
  try {
    mkdirSync(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const passed = allResults.filter((r) => r.status === "pass").length;
    const warned = allResults.filter((r) => r.status === "warn").length;
    const failed = allResults.filter((r) => r.status === "fail").length;

    // Append to history JSONL
    const historyEntry = JSON.stringify({
      timestamp,
      mode: quickMode ? "quick" : domainFilter ? `domain:${domainFilter.join(",")}` : "full",
      total: allResults.length,
      passed,
      warned,
      failed,
      duration_ms: Date.now() - startTime,
      warnings: allResults.filter((r) => r.status === "warn").map((r) => r.check),
      failures: allResults.filter((r) => r.status === "fail").map((r) => r.check),
    });
    appendFileSync(join(auditDir, "audit-history.jsonl"), historyEntry + "\n");

    // Save full report
    const reportFile = join(reportsDir, `${timestamp.slice(0, 19).replace(/[T:]/g, "-")}.json`);
    writeFileSync(reportFile, JSON.stringify(allResults, null, 2));
  } catch (err) {
    // Non-fatal -- don't crash audit because of logging failure
    if (!jsonOutput) {
      console.error(`${DIM}(Could not save audit history: ${(err as Error).message})${RESET}`);
    }
  }

  // Exit code
  const hasFail = allResults.some((r) => r.status === "fail");
  const hasWarn = allResults.some((r) => r.status === "warn");

  if (hasFail) process.exit(2);
  if (hasWarn) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${RED}FATAL: ${err.message}${RESET}`);
  process.exit(2);
});
