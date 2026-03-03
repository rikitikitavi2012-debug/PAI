#!/usr/bin/env bun
/**
 * PRDSync.hook.ts — Read-only PRD → work.json sync via PostToolUse
 *
 * TRIGGER: PostToolUse (Write, Edit)
 *
 * v3.2.0: Hooks are READ-ONLY from PRD's perspective.
 * The AI writes all PRD content directly (criteria, checkboxes, frontmatter).
 * This hook ONLY reads the PRD and syncs to work.json for the dashboard.
 *
 * - Write/Edit on PRD.md → read frontmatter + criteria → sync to work.json
 */

import { readFileSync, existsSync } from 'fs';
import {
  parseFrontmatter,
  parseCriteriaList,
  syncToWorkJson,
  readRegistry,
} from './lib/prd-utils';
import { setPhaseTab } from './lib/tab-setter';
import type { AlgorithmTabPhase } from './lib/tab-constants';
import { appendEvent } from './lib/event-emitter';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};

async function main() {
  // Only trigger for PRD.md files in MEMORY/WORK/
  const filePath = toolInput.file_path || '';
  if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) return;

  // Use the actual file path that was just written/edited, not findLatestPRD()
  // findLatestPRD() scans all PRDs by mtime and can return the wrong file
  // when multiple sessions exist or when a file's mtime is bumped by git ops.
  const prdPath = filePath;
  if (!existsSync(prdPath)) return;

  const content = readFileSync(prdPath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm) return;

  // Read existing registry for change detection
  const newPhase = (fm.phase || '').toUpperCase();
  let oldPhase = '';
  let hasChanges = true; // default: sync (safe for new entries)

  if (fm.slug) {
    try {
      const registry = readRegistry();
      const existing = registry.sessions[fm.slug];
      if (existing) {
        oldPhase = (existing.phase || '').toUpperCase();

        // Change detection: compare sync-relevant fields
        const newCriteria = parseCriteriaList(content);
        const criteriaSignature = newCriteria.map(c => `${c.id}:${c.status}`).join(',');
        const existingSignature = (existing.criteria || []).map((c: any) => `${c.id}:${c.status}`).join(',');

        const phaseMatch = (fm.phase || 'observe') === (existing.phase || 'observe');
        const progressMatch = (fm.progress || '0/0') === (existing.progress || '0/0');
        const taskMatch = (fm.task || '') === (existing.task || '');
        const effortMatch = (fm.effort || 'standard') === (existing.effort || 'standard');
        const criteriaMatch = criteriaSignature === existingSignature;

        hasChanges = !(phaseMatch && progressMatch && taskMatch && effortMatch && criteriaMatch);
      }
      // No existing entry → hasChanges stays true (first sync for new slug)
    } catch (err) { process.stderr.write(`[PRDSync] error description: ${err}\n`); /* silent — fail open, sync anyway */ }
  }

  // Only sync + emit event when structural data actually changed
  if (hasChanges) {
    syncToWorkJson(fm, prdPath, content, input.session_id);
    appendEvent({ type: 'prd.synced', source: 'PRDSync', slug: fm.slug || '', phase: fm.phase, progress: fm.progress });
  }

  // Update tab color when algorithm phase changes
  const VALID_PHASES = new Set(['OBSERVE', 'THINK', 'PLAN', 'BUILD', 'EXECUTE', 'VERIFY', 'LEARN', 'COMPLETE']);
  if (newPhase !== oldPhase && VALID_PHASES.has(newPhase) && input.session_id) {
    try {
      setPhaseTab(newPhase as AlgorithmTabPhase, input.session_id);
    } catch (err) {
      console.error('[PRDSync] setPhaseTab failed:', err);
    }
  }

}

main().catch((err) => { process.stderr.write(`[PRDSync] error description: ${err}\n`); }).finally(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
