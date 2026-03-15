#!/usr/bin/env bun
/**
 * LearnGate.hook.ts — Enforce LEARN phase persistence (PreToolUse)
 *
 * Blocks PRD.md from being set to `phase: complete` unless LEARN.md exists
 * in the same directory. Guarantees Algorithm LEARN reflections persist to disk.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write) — own matcher entry
 * PERFORMANCE: <5ms on fast path, <30ms on PRD path.
 *
 * STDIN STRATEGY: Read with 100ms timeout. If stdin is empty/broken,
 * output continue immediately. Auto-memory operations may not pipe stdin.
 */

import { existsSync, writeSync } from 'fs';
import { dirname, join } from 'path';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = '{"continue":true}\n';

function out(s: string): never {
  writeSync(1, s.endsWith('\n') ? s : s + '\n');
  process.exit(0);
}

// Read stdin with very short timeout — fail fast for auto-memory ops
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

// 100ms is enough — stdin data arrives in <5ms when piped correctly
await Promise.race([readDone, new Promise<void>(r => setTimeout(r, 100))]);
reader.cancel().catch(() => {});

if (!raw.trim()) out(CONTINUE);

let input: any;
try {
  input = JSON.parse(raw);
} catch {
  out(CONTINUE);
}

const toolInput = input.tool_input || {};
const filePath: string = toolInput.file_path || '';

if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) {
  out(CONTINUE);
}

let setsPhaseComplete = false;

if (input.tool_name === 'Edit') {
  const oldStr: string = toolInput.old_string || '';
  const newStr: string = toolInput.new_string || '';
  if (/^phase:\s*(observe|think|plan|build|execute|verify|learn)/i.test(oldStr)) {
    setsPhaseComplete = /^phase:\s*complete$/im.test(newStr);
  }
} else if (input.tool_name === 'Write') {
  const fm = parseFrontmatter(toolInput.content || '');
  if (fm) setsPhaseComplete = fm.phase?.toLowerCase() === 'complete';
}

if (!setsPhaseComplete) out(CONTINUE);

const prdDir = dirname(filePath);
if (existsSync(join(prdDir, 'LEARN.md'))) {
  out(CONTINUE);
} else {
  out(JSON.stringify({
    decision: 'block',
    reason: `LEARN: напиши LEARN.md в ${prdDir}/ перед phase: complete. Секции: ## Reflections, ## Patterns, ## Actions.`
  }));
}
