#!/usr/bin/env bun
/**
 * LearnGate.hook.ts — Enforce LEARN phase persistence (PreToolUse)
 *
 * Blocks PRD.md from being set to `phase: complete` unless LEARN.md exists
 * in the same directory. Guarantees Algorithm LEARN reflections persist to disk.
 *
 * TRIGGER: PreToolUse (matcher: Edit, Write) — own matcher entry, not shared
 * PERFORMANCE: <30ms. Pure filesystem check, no AI inference.
 */

import { existsSync, writeSync } from 'fs';
import { dirname, join } from 'path';
import { parseFrontmatter } from './lib/prd-utils';

const CONTINUE = '{"continue":true}\n';

function output(json: string): never {
  // writeSync(1, ...) = synchronous write to stdout fd — guaranteed flush before exit
  writeSync(1, json.endsWith('\n') ? json : json + '\n');
  process.exit(0);
}

async function main() {
  let input: any;

  try {
    const reader = Bun.stdin.stream().getReader();
    let raw = '';

    const readLoop = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value, { stream: true });
      }
    })();

    await Promise.race([readLoop, new Promise<void>(r => setTimeout(r, 500))]);
    reader.cancel().catch(() => {});

    if (!raw.trim()) output(CONTINUE);
    input = JSON.parse(raw);
  } catch {
    output(CONTINUE);
  }

  const toolInput = input.tool_input || {};
  const filePath: string = toolInput.file_path || '';

  // Only check PRD.md files in MEMORY/WORK/
  if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) {
    output(CONTINUE);
  }

  // Detect if this edit/write sets phase to "complete"
  let setsPhaseComplete = false;

  if (input.tool_name === 'Edit') {
    const oldString: string = toolInput.old_string || '';
    const newString: string = toolInput.new_string || '';
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

  if (!setsPhaseComplete) output(CONTINUE);

  // Check if LEARN.md exists in the PRD directory
  const prdDir = dirname(filePath);
  const learnPath = join(prdDir, 'LEARN.md');

  if (existsSync(learnPath)) {
    output(CONTINUE);
  } else {
    output(JSON.stringify({
      decision: 'block',
      reason: `LEARN phase requires persistence: write LEARN.md to ${prdDir}/ before setting phase: complete. Шаблон: ## Reflections, ## Patterns, ## Actions.`
    }));
  }
}

main().catch(() => output(CONTINUE));
