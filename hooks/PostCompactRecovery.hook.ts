#!/usr/bin/env bun
/**
 * PostCompactRecovery.hook.ts - Re-inject critical context after compaction (SessionStart[compact])
 *
 * PURPOSE:
 * When Claude Code compacts conversation history, hook-injected context from
 * <system-reminder> blocks is treated as regular conversation and may be
 * summarized or dropped. This hook fires AFTER compaction completes and
 * re-injects critical identity and behavioral context via additionalContext.
 *
 * TRIGGER: SessionStart (matcher: "compact")
 *
 * INPUT:
 * - stdin: Hook input JSON with session_id, source ("compact")
 *
 * OUTPUT:
 * - stdout: JSON with additionalContext field (injected as system-reminder)
 * - stderr: Status messages
 *
 * BASED ON: PR #799 by jlacour-git (danielmiessler/PAI)
 */

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getIdentity, getPrincipal, getVoiceId } from './lib/identity';
import { appendEvent } from './lib/event-emitter';
import { getPaiDir } from './lib/paths';
import { loadAlgorithmPhases } from '../PAI/lib/vocabulary-loader';

interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: string;
}

async function main() {
  const raw = await Bun.stdin.text();
  let input: SessionStartInput;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Only fire on post-compaction recovery
  if (input.source !== 'compact') {
    process.exit(0);
  }

  const identity = getIdentity();
  const principal = getPrincipal();
  const voiceId = getVoiceId();
  const timestamp = new Date().toISOString();

  console.error(`[PostCompactRecovery] Post-compaction recovery at ${timestamp}`);

  // Read PreCompact snapshot if available
  const BASE_DIR = getPaiDir();
  const snapshotPath = join(BASE_DIR, 'MEMORY', 'STATE', `pre-compact-snapshot-${input.session_id}.json`);
  let dynamicContext = '';

  if (existsSync(snapshotPath)) {
    try {
      const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

      const lines: string[] = [];
      lines.push('ACTIVE WORK STATE (captured before compaction by PreCompact.hook.ts):');

      if (snapshot.algorithm) {
        const a = snapshot.algorithm;
        lines.push(`- Algorithm: ACTIVE, phase ${a.phase}, effort ${a.effort}`);
        lines.push(`- Task: ${a.task}`);
        lines.push(`- ISC progress: ${a.criteria_progress}`);
        if (a.prd_path) lines.push(`- PRD: ${a.prd_path}`);
      }

      if (snapshot.work) {
        const w = snapshot.work;
        lines.push(`- Work slug: ${w.slug}`);
        if (w.task) lines.push(`- Work task: ${w.task}`);
        if (w.phase) lines.push(`- Work phase: ${w.phase}`);
        if (w.progress) lines.push(`- Work progress: ${w.progress}`);
      }

      lines.push('');
      lines.push('IMPORTANT: Resume this work. Read the PRD file to restore full context.');

      dynamicContext = '\n\n' + lines.join('\n');

      // Cleanup snapshot after successful read
      unlinkSync(snapshotPath);
      console.error(`[PostCompactRecovery] Snapshot loaded and cleaned up`);
    } catch (err) {
      console.error(`[PostCompactRecovery] Snapshot read error: ${err}`);
    }
  } else {
    console.error('[PostCompactRecovery] No PreCompact snapshot found');
  }

  appendEvent({ type: 'custom.post_compact_recovery', source: 'PostCompactRecovery', has_snapshot: !!dynamicContext } as any);

  const phasesConfig = await loadAlgorithmPhases();
  const phaseList = Object.keys(phasesConfig.phases).join(', ');

  const recoveryContext = [
    `POST-COMPACTION CONTEXT RECOVERY (auto-injected by PostCompactRecovery.hook.ts)`,
    ``,
    `Context was just compacted. Prior conversation has been summarized.`,
    `The compaction summary may have lost or muddled key context. This block restores it.`,
    ``,
    `IDENTITY:`,
    `- Assistant name: ${identity.name} (use this name, not "Claude")`,
    `- User name: ${principal.name}`,
    `- Voice ID: ${voiceId || 'not configured'}`,
    `- Timezone: ${principal.timezone}`,
    ``,
    `FORMAT RULES (may have been lost in compaction summary):`,
    `- Use PAI Algorithm format with ${Object.keys(phasesConfig.phases).length} phases (${phaseList})`,
    `- Create ISC (Ideal State Criteria) via TaskCreate before doing work`,
    `- Voice curls at each phase transition`,
    `- Every response uses the Algorithm. The only variable is DEPTH (FULL/ITERATION/MINIMAL).`,
    ``,
    `LANGUAGE: Respond in Russian by default. English only for code, technical terms, git commits.`,
    ``,
    `BEHAVIORAL REMINDERS:`,
    `- Verify before claiming completion — use tools to confirm, don't just say "done"`,
    `- Read before modifying — always read existing code before changing it`,
    `- Ask before destructive actions — deletions, deployments, force pushes need approval`,
    `- Only make requested changes — don't refactor or "improve" beyond the ask`,
    `- Use ${identity.name} as your name in voice lines, not "Claude"`,
  ].join('\n') + dynamicContext;

  console.log(JSON.stringify({ additionalContext: recoveryContext }));
  process.exit(0);
}

main().catch((err) => { process.stderr.write(`[PostCompactRecovery] error description: ${err}\n`); process.exit(0); });
