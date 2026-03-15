#!/usr/bin/env bun
/**
 * LearnGate.hook.ts — Enforce LEARN phase persistence (PreToolUse)
 *
 * Blocks PRD.md from being set to `phase: complete` unless LEARN.md exists
 * in the same directory. Guarantees Algorithm LEARN reflections persist to disk.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write)
 * PERFORMANCE: <5ms. Pure filesystem check, no AI inference.
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = JSON.stringify({ continue: true });

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  console.log(CONTINUE);
  process.exit(0);
}

const toolInput = input.tool_input || {};
const filePath: string = toolInput.file_path || '';

// Only check PRD.md files in MEMORY/WORK/
if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) {
  console.log(CONTINUE);
  process.exit(0);
}

// Detect if this edit/write sets phase to "complete"
let setsPhaseComplete = false;

if (input.tool_name === 'Edit') {
  const oldString: string = toolInput.old_string || '';
  const newString: string = toolInput.new_string || '';
  // Only match frontmatter edits: old_string must contain a known phase value
  const isFrontmatterEdit = /^phase:\s*(observe|think|plan|build|execute|verify|learn)/i.test(oldString);
  if (isFrontmatterEdit) {
    setsPhaseComplete = /^phase:\s*complete$/im.test(newString);
  }
} else if (input.tool_name === 'Write') {
  const content: string = toolInput.content || '';
  const fm = parseFrontmatter(content);
  if (fm) {
    setsPhaseComplete = fm.phase?.toLowerCase() === 'complete';
  }
}

if (!setsPhaseComplete) {
  console.log(CONTINUE);
  process.exit(0);
}

// Check if LEARN.md exists in the PRD directory
const prdDir = dirname(filePath);
const learnPath = join(prdDir, 'LEARN.md');

if (existsSync(learnPath)) {
  console.log(CONTINUE);
} else {
  console.log(JSON.stringify({
    decision: 'block',
    reason: `LEARN phase requires persistence: write LEARN.md to ${prdDir}/ before setting phase: complete. Шаблон: ## Reflections (что делать по-другому), ## Patterns (переиспользуемые инсайты), ## Actions (файлы MEMORY/WISDOM).`
  }));
}

process.exit(0);
