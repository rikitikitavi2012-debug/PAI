#!/usr/bin/env bun
/**
 * PAI Session End Hook
 * Automatically indexes new conversations when session ends
 *
 * This hook should be added to settings.json:
 * {
 *   "hooks": {
 *     "Stop": [{
 *       "matcher": "",
 *       "hooks": ["bun", "run", "~/.claude/PAI/Tools/SessionSearch/index-hook.ts"]
 *     }]
 *   }
 * }
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEXER = join(__dirname, 'indexer.ts');

console.log('\n🔍 [SessionSearch] Indexing new conversations...');

try {
  // Run incremental indexing
  execSync(`bun run ${INDEXER} --incremental`, {
    encoding: 'utf-8',
    stdio: 'pipe',  // Capture output
  });

  console.log('✅ [SessionSearch] Indexing complete\n');
} catch (err) {
  // Silently fail - don't disrupt session end
  console.log('⚠️  [SessionSearch] Indexing failed (non-critical)\n');
}
