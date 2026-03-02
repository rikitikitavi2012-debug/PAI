#!/usr/bin/env bun
/**
 * HookHealthCheck.ts — Verify integrity of the entire PAI hook system
 *
 * Checks:
 * 1. Registration: all hooks in settings.json exist on disk
 * 2. Orphans: all .hook.ts files on disk are registered
 * 3. Syntax: bun build --no-bundle passes for each file
 * 4. Imports: all local imports (./lib/*, ./handlers/*) resolve
 *
 * Usage:
 *   bun run ~/.claude/PAI/Tools/HookHealthCheck.ts
 *   bun run ~/.claude/PAI/Tools/HookHealthCheck.ts --json
 *
 * Exit: 0 = all healthy, 1 = issues found
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { $ } from 'bun';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const HOOKS_DIR = join(BASE_DIR, 'hooks');
const SETTINGS_PATH = join(BASE_DIR, 'settings.json');
const JSON_OUTPUT = process.argv.includes('--json');

// ── Types ──

interface CheckResult {
  name: string;
  exists: boolean;
  syntax: boolean;
  imports: boolean;
  registered: boolean;
  errors: string[];
}

// ── Helpers ──

function expandPaiDir(path: string): string {
  return path
    .replace('${PAI_DIR}', BASE_DIR)
    .replace('$PAI_DIR', BASE_DIR);
}

/** Extract unique hook file paths from settings.json */
function getRegisteredHooks(): string[] {
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  const hooksConfig = settings.hooks || {};
  const paths = new Set<string>();

  // Structure: hooks.EventName[] -> { matcher, hooks: [{ type, command }] }
  for (const eventName of Object.keys(hooksConfig)) {
    const matchers = hooksConfig[eventName];
    if (!Array.isArray(matchers)) continue;

    for (const matcher of matchers) {
      const hookEntries = matcher.hooks;
      if (!Array.isArray(hookEntries)) continue;

      for (const entry of hookEntries) {
        const cmd: string = entry.command || '';
        // Extract the hook path — handles both "path/hook.ts" and "bun path/hook.ts"
        const match = cmd.match(/(?:bun\s+)?(.*?hooks\/[^\s"]+\.ts)/);
        if (match) {
          paths.add(expandPaiDir(match[1]));
        }
      }
    }
  }

  return [...paths].sort();
}

/** Get all .hook.ts files on disk */
function getHookFilesOnDisk(): string[] {
  try {
    return readdirSync(HOOKS_DIR)
      .filter(f => f.endsWith('.hook.ts'))
      .map(f => join(HOOKS_DIR, f))
      .sort();
  } catch { return []; }
}

/** Get all handler files on disk */
function getHandlerFilesOnDisk(): string[] {
  const handlersDir = join(HOOKS_DIR, 'handlers');
  try {
    return readdirSync(handlersDir)
      .filter(f => f.endsWith('.ts'))
      .map(f => join(handlersDir, f))
      .sort();
  } catch { return []; }
}

/** Get all lib files on disk */
function getLibFilesOnDisk(): string[] {
  const libDir = join(HOOKS_DIR, 'lib');
  try {
    return readdirSync(libDir)
      .filter(f => f.endsWith('.ts'))
      .map(f => join(libDir, f))
      .sort();
  } catch { return []; }
}

/** Extract local imports from a TypeScript file */
function extractLocalImports(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports: string[] = [];
    // Match: import ... from './...' or import ... from '../...'
    const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  } catch { return []; }
}

/** Resolve an import path to an actual file */
function resolveImport(importPath: string, fromFile: string): string | null {
  const dir = dirname(fromFile);
  const base = resolve(dir, importPath);

  // Try exact match, .ts extension, /index.ts
  const candidates = [
    base,
    base + '.ts',
    base + '.js',
    join(base, 'index.ts'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Run bun build syntax check */
async function checkSyntax(filePath: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await $`bun build ${filePath} --no-bundle 2>&1`.quiet().nothrow();
    if (result.exitCode !== 0) {
      return { ok: false, error: result.text().trim().slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 200) };
  }
}

// ── Main ──

async function main() {
  const registeredPaths = getRegisteredHooks();
  const diskHooks = getHookFilesOnDisk();
  const diskHandlers = getHandlerFilesOnDisk();
  const diskLibs = getLibFilesOnDisk();

  const registeredSet = new Set(registeredPaths);
  const diskHookSet = new Set(diskHooks);

  const results: CheckResult[] = [];
  let totalIssues = 0;

  // ── 1. Check registered hooks ──
  for (const hookPath of registeredPaths) {
    const name = basename(hookPath);
    const result: CheckResult = {
      name,
      exists: existsSync(hookPath),
      syntax: false,
      imports: true,
      registered: true,
      errors: [],
    };

    if (!result.exists) {
      result.errors.push('FILE MISSING');
      totalIssues++;
    } else {
      // Syntax check
      const syntaxResult = await checkSyntax(hookPath);
      result.syntax = syntaxResult.ok;
      if (!syntaxResult.ok) {
        result.errors.push(`SYNTAX: ${syntaxResult.error}`);
        totalIssues++;
      }

      // Import check
      const imports = extractLocalImports(hookPath);
      for (const imp of imports) {
        const resolved = resolveImport(imp, hookPath);
        if (!resolved) {
          result.imports = false;
          result.errors.push(`IMPORT NOT FOUND: ${imp}`);
          totalIssues++;
        }
      }
    }

    results.push(result);
  }

  // ── 2. Orphan check ──
  const orphans: string[] = [];
  for (const diskHook of diskHooks) {
    if (!registeredSet.has(diskHook)) {
      orphans.push(basename(diskHook));
    }
  }

  // ── 3. Syntax check for lib/ and handlers/ ──
  const libResults: { name: string; ok: boolean; error?: string }[] = [];
  for (const lib of diskLibs) {
    const syntaxResult = await checkSyntax(lib);
    libResults.push({ name: basename(lib), ...syntaxResult });
    if (!syntaxResult.ok) totalIssues++;
  }

  const handlerResults: { name: string; ok: boolean; error?: string }[] = [];
  for (const handler of diskHandlers) {
    const syntaxResult = await checkSyntax(handler);
    handlerResults.push({ name: basename(handler), ...syntaxResult });
    if (!syntaxResult.ok) totalIssues++;
  }

  // ── Output ──

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      healthy: totalIssues === 0,
      total_issues: totalIssues,
      hooks: results,
      orphans,
      lib: libResults,
      handlers: handlerResults,
    }, null, 2));
  } else {
    // Table output
    const COL = { name: 32, exists: 7, syntax: 7, imports: 8, status: 8 };

    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                    PAI Hook Health Check                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

    // Hooks table
    console.log('── Registered Hooks (' + registeredPaths.length + ') ──\n');
    console.log(
      'Hook'.padEnd(COL.name) +
      'Exists'.padEnd(COL.exists) +
      'Syntax'.padEnd(COL.syntax) +
      'Import'.padEnd(COL.imports) +
      'Status'
    );
    console.log('─'.repeat(COL.name + COL.exists + COL.syntax + COL.imports + COL.status));

    for (const r of results) {
      const status = r.errors.length === 0 ? '✓ PASS' : '✗ FAIL';
      console.log(
        r.name.slice(0, COL.name - 1).padEnd(COL.name) +
        (r.exists ? '✓' : '✗').padEnd(COL.exists) +
        (r.syntax ? '✓' : '✗').padEnd(COL.syntax) +
        (r.imports ? '✓' : '✗').padEnd(COL.imports) +
        status
      );
      for (const err of r.errors) {
        console.log('  └─ ' + err);
      }
    }

    // Orphans
    if (orphans.length > 0) {
      console.log('\n── Orphaned Hooks (' + orphans.length + ') ──\n');
      for (const o of orphans) {
        console.log('  ⚠ ' + o + ' — on disk but not in settings.json');
      }
    } else {
      console.log('\n── Orphaned Hooks: 0 ──');
    }

    // Lib modules
    const libFailed = libResults.filter(l => !l.ok);
    console.log('\n── Lib Modules (' + diskLibs.length + ') ──');
    if (libFailed.length > 0) {
      for (const l of libFailed) {
        console.log('  ✗ ' + l.name + ': ' + l.error);
      }
    } else {
      console.log('  All ' + diskLibs.length + ' modules pass syntax check ✓');
    }

    // Handlers
    const handlerFailed = handlerResults.filter(h => !h.ok);
    console.log('\n── Handlers (' + diskHandlers.length + ') ──');
    if (handlerFailed.length > 0) {
      for (const h of handlerFailed) {
        console.log('  ✗ ' + h.name + ': ' + h.error);
      }
    } else {
      console.log('  All ' + diskHandlers.length + ' handlers pass syntax check ✓');
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    const passed = results.filter(r => r.errors.length === 0).length;
    const hookTotal = results.length;
    if (totalIssues === 0) {
      console.log(`✅ ALL HEALTHY — ${hookTotal} hooks, ${diskLibs.length} lib, ${diskHandlers.length} handlers, 0 orphans`);
    } else {
      console.log(`⚠ ${totalIssues} ISSUES FOUND — ${passed}/${hookTotal} hooks pass, ${orphans.length} orphans`);
    }
    console.log('═'.repeat(70) + '\n');
  }

  process.exit(totalIssues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('HookHealthCheck fatal:', err);
  process.exit(2);
});
