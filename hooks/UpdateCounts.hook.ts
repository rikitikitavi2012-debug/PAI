#!/usr/bin/env bun
/**
 * UpdateCounts.hook.ts - System Counts Update (SessionEnd)
 *
 * PURPOSE:
 * Updates settings.json counts (skills, hooks, ratings, etc.) and refreshes
 * usage cache from Anthropic API. Runs at session end so banner/statusline
 * have fresh data next session.
 *
 * TRIGGER: SessionEnd
 * PERFORMANCE: ~1-2s (file counting + API calls). Non-blocking at session end.
 */

import { handleUpdateCounts } from './handlers/UpdateCounts';

async function main() {
  try {
    const raw = await Bun.stdin.text();
    let sessionCostUsd: number | undefined;
    if (raw) {
      try {
        const input = JSON.parse(raw);
        if (input.cost && typeof input.cost.session_cost_usd === 'number') {
          sessionCostUsd = input.cost.session_cost_usd;
        }
      } catch (err) {
        // Ignored
      }
    }
    await handleUpdateCounts(sessionCostUsd);
  } catch (err) {
    console.error('[UpdateCounts] Error:', err);
  }
  process.exit(0);
}

main().catch((err) => { process.stderr.write(`[UpdateCounts] error description: ${err}\n`); process.exit(0); });
