#!/usr/bin/env bun
/**
 * LearnGate.hook.ts — Enforce LEARN phase persistence (PreToolUse)
 *
 * Blocks PRD.md from being set to `phase: complete` unless LEARN.md exists
 * in the same directory. Guarantees Algorithm LEARN reflections persist to disk.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write)
 * PERFORMANCE: <30ms. Pure filesystem check, no AI inference.
 *
 * NOTE: PreToolUse hooks MUST use async stdin (Bun.stdin.stream) — not
 * readFileSync(0) which hangs when Claude Code's pipe doesn't close promptly.
 * PostToolUse hooks can use readFileSync(0) safely.
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = JSON.stringify({ continue: true });

async function main() {
  let input: any;

  try {
    const reader = Bun.stdin.stream().getReader();
    let raw = '';
    let timedOut = false;

    const readLoop = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value, { stream: true });
      }
    })();

    const timer = setTimeout(() => { timedOut = true; }, 500);
    await Promise.race([readLoop, new Promise<void>(r => setTimeout(r, 500))]);
    clearTimeout(timer);
    reader.cancel().catch(() => {});

    if (timedOut || !raw.trim()) {
      console.log(CONTINUE);
      process.exit(0);
    }

    input = JSON.parse(raw);
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
}

main().catch(() => {
  console.log(CONTINUE);
  process.exit(0);
});
