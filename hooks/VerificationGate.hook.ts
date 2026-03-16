#!/usr/bin/env bun
/**
 * VerificationGate.hook.ts — Enforce verification evidence before completion (PreToolUse)
 *
 * Blocks PRD.md from being set to `phase: complete` unless the Verification
 * section contains at least one checked item with evidence.
 * This is the #1 failure pattern (6+ incidents of "Verification Bypass").
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write) — own matcher entry
 * PERFORMANCE: <5ms on fast path, <30ms on PRD path.
 *
 * STDIN STRATEGY: Read with 300ms timeout (matches LearnGate).
 */

import { readFileSync, writeSync } from 'fs';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = '{"continue":true}\n';

function out(s: string): never {
  writeSync(1, s.endsWith('\n') ? s : s + '\n');
  process.exit(0);
}

// Read stdin with 300ms timeout
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

await Promise.race([readDone, new Promise<void>(r => setTimeout(r, 300))]);
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

// Only act on PRD.md in MEMORY/WORK/
if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) {
  out(CONTINUE);
}

// Check if this edit/write sets phase to "complete"
let setsPhaseComplete = false;

if (input.tool_name === 'Edit') {
  const oldStr: string = toolInput.old_string || '';
  const newStr: string = toolInput.new_string || '';
  if (/^\s*phase:\s*(observe|think|plan|build|execute|verify|learn)/im.test(oldStr)) {
    setsPhaseComplete = /^phase:\s*complete$/im.test(newStr);
  }
} else if (input.tool_name === 'Write') {
  const fm = parseFrontmatter(toolInput.content || '');
  if (fm) setsPhaseComplete = fm.phase?.toLowerCase() === 'complete';
}

if (!setsPhaseComplete) out(CONTINUE);

// Phase is being set to complete — check for verification evidence
// Read the CURRENT PRD content (before this edit) to check Verification section
let prdContent = '';
try {
  prdContent = readFileSync(filePath, 'utf-8');
} catch {
  // If we can't read PRD, also check the new content being written
  if (input.tool_name === 'Write') {
    prdContent = toolInput.content || '';
  }
}

// For Write tool, use the new content (it's a full rewrite)
if (input.tool_name === 'Write') {
  prdContent = toolInput.content || '';
}

// For Edit tool, apply the edit to get final content
if (input.tool_name === 'Edit' && prdContent) {
  const oldStr = toolInput.old_string || '';
  const newStr = toolInput.new_string || '';
  if (prdContent.includes(oldStr)) {
    prdContent = prdContent.replace(oldStr, newStr);
  }
}

// Check: does the Verification section have at least one checked item?
const verifyMatch = prdContent.match(/## Verification\n([\s\S]*?)(?=\n## |\n---|\Z)/i);

if (!verifyMatch) {
  // No Verification section at all — block
  out(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'VERIFICATION GATE: PRD не содержит секцию ## Verification. Добавь секцию с доказательствами (скриншот, тест, diff, лог) перед phase: complete.'
    }
  }));
}

const verifyContent = verifyMatch![1];
const checkedItems = verifyContent.split('\n').filter(l => /^- \[x\]/i.test(l.trim()));

if (checkedItems.length === 0) {
  // Verification section exists but nothing checked — block
  out(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'VERIFICATION GATE: секция ## Verification пуста или ничего не отмечено. Перед phase: complete нужно хотя бы одно [x] доказательство (тест, скриншот, diff, лог). Exit code 0 и "file exists" — НЕ доказательства.'
    }
  }));
}

// Has checked verification items — allow
out(CONTINUE);
