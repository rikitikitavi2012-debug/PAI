#!/usr/bin/env bun
/**
 * WisdomExtractor.ts - Auto-extract Wisdom Frame observations from session transcripts
 *
 * Called during the Algorithm's LEARN phase to automatically extract domain
 * observations about how Ivan works, then persist them via WisdomFrameUpdater.
 *
 * This is the automated WRITE side of the Wisdom Frames dual loop:
 *   OBSERVE reads MEMORY/WISDOM/ → WisdomExtractor writes MEMORY/WISDOM/
 *
 * USAGE:
 *   bun WisdomExtractor.ts --transcript /path/to/transcript.jsonl
 *   bun WisdomExtractor.ts --session SESSION_ID
 *   bun WisdomExtractor.ts --dry-run --transcript /path/...   (preview without writing)
 *
 * OUTPUT:
 *   Lists extracted observations and writes them via WisdomFrameUpdater.ts
 *   Returns exit 0 on success, exit 1 on failure
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { inference } from './Inference';
import { execSync } from 'child_process';

// ── Config ──

const CLAUDE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const TOOLS_DIR = join(CLAUDE_DIR, 'skills', 'PAI', 'Tools');
const WISDOM_UPDATER = join(TOOLS_DIR, 'WisdomFrameUpdater.ts');

const VALID_DOMAINS = ['development', 'deployment', 'communication', 'system', 'workflow', 'learning'];
const VALID_TYPES = ['anti-pattern', 'contextual-rule', 'prediction', 'principle'];

const MAX_TRANSCRIPT_CHARS = 6000; // Keep Haiku prompt reasonable
const MIN_OBSERVATION_LENGTH = 20;
const MAX_OBSERVATIONS_PER_SESSION = 3;

// ── Types ──

interface ExtractedObservation {
  domain: string;
  type: string;
  observation: string;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
}

// ── Transcript Reader ──

function readTranscript(path: string): string {
  if (!existsSync(path)) return '';

  try {
    const content = readFileSync(path, 'utf-8');
    const lines = content.trim().split('\n');
    const exchanges: string[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'user' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text.trim()) exchanges.push(`User: ${text.slice(0, 300)}`);
        }

        if (entry.type === 'assistant' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text) {
            // Extract key summary lines from algorithm output
            const taskMatch = text.match(/🗒️\s*TASK:\s*([^\n]+)/);
            const summaryMatch = text.match(/🗣️[^:]+:\s*([^\n]+)/);
            const summary = taskMatch
              ? `Navi: [${taskMatch[1].trim()}] ${summaryMatch ? summaryMatch[1].slice(0, 150) : ''}`
              : `Navi: ${text.slice(0, 200)}`;
            exchanges.push(summary);
          }
        }
      } catch {}
    }

    const full = exchanges.join('\n');
    // Take last portion if too long
    return full.length > MAX_TRANSCRIPT_CHARS
      ? '...[earlier context omitted]...\n' + full.slice(-MAX_TRANSCRIPT_CHARS)
      : full;
  } catch {
    return '';
  }
}

function findTranscriptBySession(sessionId: string): string | null {
  const projectsDir = join(CLAUDE_DIR, 'projects');
  if (!existsSync(projectsDir)) return null;

  try {
    const { readdirSync } = require('fs');
    const dirs = readdirSync(projectsDir);
    for (const dir of dirs) {
      const candidate = join(projectsDir, dir, `${sessionId}.jsonl`);
      if (existsSync(candidate)) return candidate;
    }
  } catch {}
  return null;
}

// ── Extraction ──

const EXTRACT_SYSTEM_PROMPT = `You are analyzing an AI assistant (Navi) work session with Ivan to extract persistent observations.

Ivan is a solo entrepreneur working in WSL2 Ubuntu / Windows Terminal. Navi is his PAI (Personal AI Infrastructure) assistant.

Your job: Extract 0-${MAX_OBSERVATIONS_PER_SESSION} observations that would be USEFUL TO REMEMBER in future sessions.

EXTRACTION RULES:
1. Only extract SPECIFIC, ACTIONABLE observations about Ivan's working style or preferences
2. Skip generic/obvious things ("Ivan likes quality work")
3. Skip one-off events that won't repeat
4. Focus on PATTERNS that will recur
5. If nothing genuinely new → return empty array []

VALID DOMAINS: development | deployment | communication | system | workflow | learning
VALID TYPES:
  - anti-pattern: behavior that consistently causes problems
  - contextual-rule: how Ivan specifically prefers things done
  - prediction: a pattern in what Ivan will ask for
  - principle: a core working value Ivan has demonstrated

OUTPUT FORMAT (JSON array only, no other text):
[
  {
    "domain": "development",
    "type": "contextual-rule",
    "observation": "specific factual statement, 10-30 words"
  }
]

EXAMPLES of GOOD observations:
- {"domain":"workflow","type":"contextual-rule","observation":"Ivan asks 'what else can we check?' after fixing bugs — likes comprehensive auditing"}
- {"domain":"system","type":"anti-pattern","observation":"PAI hooks silently fail when env vars differ between WSL2 and native Linux — always verify platform vars"}
- {"domain":"development","type":"prediction","observation":"After finding one bug in a subsystem, Ivan will ask to audit the whole subsystem"}

EXAMPLES of BAD observations (too generic):
- "Ivan likes good work" — too vague
- "Navi should fix bugs" — not about Ivan
- "WSL2 exists" — not actionable`;

async function extractObservations(transcript: string): Promise<ExtractedObservation[]> {
  if (!transcript.trim()) {
    console.error('[WisdomExtractor] Empty transcript, skipping extraction');
    return [];
  }

  const result = await inference({
    systemPrompt: EXTRACT_SYSTEM_PROMPT,
    userPrompt: `SESSION TRANSCRIPT:\n${transcript}\n\nExtract 0-${MAX_OBSERVATIONS_PER_SESSION} observations. Return [] if nothing new.`,
    expectJson: true,
    timeout: 180000,
    level: 'fast',
  });

  if (!result.success || !result.parsed) {
    console.error(`[WisdomExtractor] Inference failed: ${result.error}`);
    return [];
  }

  const parsed = result.parsed;
  if (!Array.isArray(parsed)) {
    console.error('[WisdomExtractor] Response not an array, skipping');
    return [];
  }

  // Validate each observation
  return parsed.filter((obs: any) => {
    if (!obs.domain || !obs.type || !obs.observation) return false;
    if (!VALID_DOMAINS.includes(obs.domain)) return false;
    if (!VALID_TYPES.includes(obs.type)) return false;
    if (obs.observation.length < MIN_OBSERVATION_LENGTH) return false;
    return true;
  }) as ExtractedObservation[];
}

// ── Writer ──

function writeObservation(obs: ExtractedObservation, sessionId: string, dryRun: boolean): boolean {
  const cmd = `bun "${WISDOM_UPDATER}" --add --domain "${obs.domain}" --observation "${obs.observation.replace(/"/g, '\\"')}" --type "${obs.type}" --session "${sessionId}"`;

  if (dryRun) {
    console.log(`  [DRY RUN] Would call: ${cmd}`);
    return true;
  }

  try {
    execSync(cmd, { cwd: TOOLS_DIR, stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error(`[WisdomExtractor] Failed to write observation: ${err}`);
    return false;
  }
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let transcriptPath: string | null = null;
  let sessionId = 'unknown';

  const transcriptIdx = args.indexOf('--transcript');
  const sessionIdx = args.indexOf('--session');

  if (transcriptIdx >= 0) {
    transcriptPath = args[transcriptIdx + 1];
    sessionId = transcriptPath?.split('/').pop()?.replace('.jsonl', '') || 'unknown';
  } else if (sessionIdx >= 0) {
    sessionId = args[sessionIdx + 1];
    transcriptPath = findTranscriptBySession(sessionId);
    if (!transcriptPath) {
      console.error(`[WisdomExtractor] Could not find transcript for session: ${sessionId}`);
      process.exit(1);
    }
  } else {
    console.error(`Usage:
  bun WisdomExtractor.ts --transcript /path/to/transcript.jsonl
  bun WisdomExtractor.ts --session SESSION_ID
  bun WisdomExtractor.ts --dry-run --transcript /path/...`);
    process.exit(1);
  }

  if (!transcriptPath || !existsSync(transcriptPath)) {
    console.error(`[WisdomExtractor] Transcript not found: ${transcriptPath}`);
    process.exit(1);
  }

  console.error(`[WisdomExtractor] Reading transcript: ${transcriptPath}`);
  const transcript = readTranscript(transcriptPath);
  console.error(`[WisdomExtractor] Transcript: ${transcript.length} chars`);

  console.error('[WisdomExtractor] Running Haiku extraction...');
  const observations = await extractObservations(transcript);

  if (observations.length === 0) {
    console.log('[WisdomExtractor] No new observations extracted — session had no new wisdom');
    process.exit(0);
  }

  console.log(`\n[WisdomExtractor] Extracted ${observations.length} observation(s):`);
  let written = 0;
  for (const obs of observations) {
    const icon = obs.type === 'anti-pattern' ? '⚠️' : obs.type === 'principle' ? '💎' : obs.type === 'prediction' ? '🔮' : '📌';
    console.log(`  ${icon} [${obs.domain}/${obs.type}] "${obs.observation}"`);
    if (writeObservation(obs, sessionId, dryRun)) written++;
  }

  if (!dryRun) {
    console.log(`\n[WisdomExtractor] ✅ Written ${written}/${observations.length} observations to MEMORY/WISDOM/`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`[WisdomExtractor] Fatal error: ${err}`);
  process.exit(1);
});
