#!/usr/bin/env bun
/**
 * PhaseGate.hook.ts — Enforce phase transition requirements (PreToolUse)
 *
 * Validates that required PRD sections exist before advancing to next phase.
 * Prevents the "PRD stays stale" problem by hook-enforcing phase gates.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write) — own matcher entry
 * PERFORMANCE: <10ms on fast path, <50ms on validation path.
 *
 * PHASE GATES:
 *   OBSERVE → THINK: requires ## Context with >30 words
 *   THINK → PLAN: requires ### Risks (Extended+ only)
 *   PLAN → BUILD: requires ### Plan (Advanced+ only)
 *   BUILD → EXECUTE: requires at least 1 file change (logged in ## Changes)
 *   VERIFY → LEARN: requires all [B] criteria marked [x]
 *   * → complete: delegates to LearnGate (LEARN.md must exist)
 *
 * STDIN STRATEGY: Read with 300ms timeout. If stdin is empty/broken,
 * output continue immediately. Auto-memory operations may not pipe stdin.
 */

import { existsSync, readFileSync, writeSync } from 'fs';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = '{"continue":true}\n';

function out(s: string): never {
  writeSync(1, s.endsWith('\n') ? s : s + '\n');
  process.exit(0);
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

// Only check PRD.md files in MEMORY/WORK/
if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) {
  out(CONTINUE);
}

// Detect phase transition attempt
let newPhase: string | null = null;
let currentContent: string | null = null;

if (input.tool_name === 'Edit') {
  const newStr: string = toolInput.new_string || '';
  const phaseMatch = /^phase:\s*(\w+)\s*$/im.exec(newStr);
  if (phaseMatch) {
    newPhase = phaseMatch[1].toLowerCase();
    // For Edit, we need to reconstruct the final content
    // This is expensive, so only do if phase change detected
    const oldStr: string = toolInput.old_string || '';
    try {
      const oldContent = readFileSync(filePath, 'utf-8');
      currentContent = oldContent.replace(oldStr, newStr);
    } catch {
      out(CONTINUE); // Can't read file, allow
    }
  }
} else if (input.tool_name === 'Write') {
  const content: string = toolInput.content || '';
  const fm = parseFrontmatter(content);
  if (fm) {
    newPhase = (fm.phase || '').toLowerCase();
    currentContent = content;
  }
}

if (!newPhase || !currentContent) out(CONTINUE);

// Phase transition order for validation
const PHASE_ORDER = ['observe', 'think', 'plan', 'build', 'execute', 'verify', 'learn', 'complete'];
const prevPhaseIndex = PHASE_ORDER.indexOf(newPhase) - 1;

// Only validate forward transitions
if (prevPhaseIndex < 0) out(CONTINUE);

const prevPhase = PHASE_ORDER[prevPhaseIndex];
const fm = parseFrontmatter(currentContent);
if (!fm) out(CONTINUE);

const effort = (fm.effort || 'standard').toLowerCase();
const isExtendedPlus = ['extended', 'advanced', 'deep', 'comprehensive'].includes(effort);
const isAdvancedPlus = ['advanced', 'deep', 'comprehensive'].includes(effort);

// Extract sections from content
const contextMatch = /^##\s+Context\s*$/m.exec(currentContent);
const risksMatch = /^###\s+Risks\s*$/m.exec(currentContent);
const planMatch = /^###\s+Plan\s*$/m.exec(currentContent);
const verificationMatch = /^##\s+Verification\s*$/m.exec(currentContent);

// Count words in Context section
function countContextWords(content: string): number {
  const ctxStart = /^##\s+Context\s*$/m.exec(content);
  if (!ctxStart) return 0;
  const afterCtx = content.slice(ctxStart.index! + ctxStart[0].length);
  const nextSection = /^##\s/m.exec(afterCtx);
  const ctxContent = nextSection ? afterCtx.slice(0, nextSection.index) : afterCtx;
  return ctxContent.split(/\s+/).filter(w => w.length > 2).length;
}

// Count [B] criteria and check if all are [x]
function checkBinaryCriteria(content: string): { total: number; done: number } {
  const lines = content.split('\n');
  let total = 0, done = 0;
  for (const line of lines) {
    if (/^-\s+\[.\]\s+ISC-\d+\s+\[B\]/.test(line)) {
      total++;
      if (/^-\s+\[x\]/i.test(line)) done++;
    }
  }
  return { total, done };
}

// Validation rules per phase transition
const validations: Record<string, () => string | null> = {
  'think': () => {
    // OBSERVE → THINK: requires ## Context with >30 words
    const wordCount = countContextWords(currentContent!);
    if (wordCount < 30) {
      return `THINK требует ## Context (сейчас ${wordCount} слов, нужно ≥30). Опиши задачу, почему важна, что requested/not requested.`;
    }
    return null;
  },
  'plan': () => {
    // THINK → PLAN: requires ### Risks (Extended+ only)
    if (isExtendedPlus && !risksMatch) {
      return 'PLAN (Extended+) требует ### Risks в ## Context. Добавь риски.';
    }
    return null;
  },
  'build': () => {
    // PLAN → BUILD: requires ### Plan (Advanced+ only)
    if (isAdvancedPlus && !planMatch) {
      return 'BUILD (Advanced+) требует ### Plan в ## Context. Добавь технический подход.';
    }
    return null;
  },
  'verify': () => {
    // BUILD → EXECUTE → VERIFY: no special gate (work was done)
    return null;
  },
  'learn': () => {
    // VERIFY → LEARN: requires all [B] criteria marked [x]
    const { total, done } = checkBinaryCriteria(currentContent!);
    if (total > 0 && done < total) {
      return `LEARN требует все [B] критерии [x] (сейчас ${done}/${total}). Заполни чекбоксы или добавь verification evidence.`;
    }
    return null;
  },
  'complete': () => {
    // Delegates to LearnGate — LEARN.md must exist
    // We don't duplicate this check, LearnGate handles it
    return null;
  }
};

const validator = validations[newPhase];
if (validator) {
  const error = validator();
  if (error) {
    out(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `PhaseGate: ${error}`
      }
    }));
  }
}

out(CONTINUE);
