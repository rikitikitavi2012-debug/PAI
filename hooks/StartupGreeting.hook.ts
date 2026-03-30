#!/usr/bin/env bun
/**
 * StartupGreeting.hook.ts - Display PAI Banner at Session Start (SessionStart)
 *
 * PURPOSE:
 * Displays the responsive neofetch-style PAI banner with system statistics.
 * Creates a visual confirmation that PAI is initialized and shows key metrics
 * like skill count, session count, and learning items.
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: COLUMNS, KITTY_WINDOW_ID for terminal detection
 * - Settings: settings.json for identity configuration
 *
 * OUTPUT:
 * - stdout: Banner display (captured by Claude Code)
 * - stderr: Error messages on failure
 * - exit(0): Normal completion
 * - exit(1): Banner display failed
 *
 * SIDE EFFECTS:
 * - Spawns Banner.ts tool as child process
 * - Reads settings.json for configuration
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None (runs independently at session start)
 * - COORDINATES WITH: LoadContext (both run at SessionStart)
 * - MUST RUN BEFORE: None (visual feedback only)
 * - MUST RUN AFTER: None
 *
 * ERROR HANDLING:
 * - Missing settings: Error logged, exits with error code
 * - Banner tool failure: Error logged, exits with error code
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (banner is informational)
 * - Typical execution: <100ms
 * - Skipped for subagents: Yes
 *
 * BANNER MODES:
 * - nano (<40 cols): Minimal single-line
 * - micro (40-59 cols): Compact with stats
 * - mini (60-84 cols): Medium layout
 * - normal (85+ cols): Full neofetch-style
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

import { getPaiDir, getSettingsPath } from './lib/paths';
import { persistKittySession } from './lib/tab-setter';
import { getVoiceId } from './lib/identity';

const paiDir = getPaiDir();
const settingsPath = getSettingsPath();

async function main() {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      process.exit(0);
    }

    // Read session_id from stdin (Claude Code passes hook input as JSON)
    // REDUCED TIMEOUT: 500ms (was 3000ms) — stdin is usually available immediately
    let sessionId: string | null = null;
    try {
      const stdinText = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
      ]);
      if (stdinText.trim()) {
        const hookInput = JSON.parse(stdinText);
        sessionId = hookInput.session_id || null;
      }
    } catch (err) { /* stdin parse failed or timed out — proceed without session_id */ }

    // Persist Kitty environment for hooks that run later without terminal context.
    // Uses per-session mapping so multiple tabs don't overwrite each other's window IDs.
    const kittyListenOn = process.env.KITTY_LISTEN_ON;
    const kittyWindowId = process.env.KITTY_WINDOW_ID;
    if (kittyListenOn && kittyWindowId) {
      if (sessionId) {
        persistKittySession(sessionId, kittyListenOn, kittyWindowId);
      } else {
        // Fallback: write singleton for backward compat when no session_id available
        const stateDir = join(paiDir, 'MEMORY', 'STATE');
        if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
        writeFileSync(
          join(stateDir, 'kitty-env.json'),
          JSON.stringify({ KITTY_LISTEN_ON: kittyListenOn, KITTY_WINDOW_ID: kittyWindowId }, null, 2)
        );
      }
    }

    // Run the banner tool (cached for 30s to avoid repeated spawns)
    const bannerPath = join(paiDir, 'PAI/Tools/Banner.ts');
    const bannerCachePath = join(paiDir, 'MEMORY', 'STATE', 'banner-cache.json');
    const BANNER_CACHE_TTL = 30000; // 30 seconds

    let bannerOutput = '';
    const now = Date.now();

    // Try to load cached banner
    if (existsSync(bannerCachePath)) {
      try {
        const cached = JSON.parse(readFileSync(bannerCachePath, 'utf-8'));
        if (cached.output && (now - cached.timestamp) < BANNER_CACHE_TTL) {
          bannerOutput = cached.output;
          console.error('📦 Using cached banner');
        }
      } catch { /* invalid cache */ }
    }

    // Generate fresh banner if cache miss
    if (!bannerOutput) {
      const result = spawnSync('bun', ['run', bannerPath], {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 5000,
        env: {
          ...process.env,
          COLUMNS: process.env.COLUMNS,
          KITTY_WINDOW_ID: process.env.KITTY_WINDOW_ID,
        }
      });

      if (result.stdout) {
        bannerOutput = result.stdout;
        // Cache it
        try {
          mkdirSync(join(paiDir, 'MEMORY', 'STATE'), { recursive: true });
          writeFileSync(bannerCachePath, JSON.stringify({ output: bannerOutput, timestamp: now }));
        } catch { /* non-fatal */ }
      }
    }

    if (bannerOutput) {
      console.log(bannerOutput);
    }

    // Voice greeting — audio only, no visual output (avoids duplication with Banner.ts)
    try {
      await fetch('http://localhost:8888/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Navi готов к работе', voice_id: getVoiceId() }),
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) { process.stderr.write(`[StartupGreeting] error description: ${err}\n`); /* voice server unavailable — not critical */ }

    process.exit(0);
  } catch (error) {
    console.error('StartupGreeting: Failed to display banner', error);
    process.exit(0);
  }
}

main().catch((err) => { process.stderr.write(`[StartupGreeting] error description: ${err}\n`); process.exit(0); });
