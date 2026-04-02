#!/usr/bin/env bun
/**
 * AutoSkillProposal.hook.ts — Automatic skill creation from session patterns
 *
 * PURPOSE:
 * Analyzes completed sessions for reusable patterns and AUTO-CREATES skills.
 * Uses LLM inference (Sonnet) to evaluate session complexity and identify
 * workflows worth codifying as skills.
 *
 * TRIGGER: Stop event (PostToolUse or session end)
 *
 * THRESHOLDS:
 * - Minimum 5 unique tool calls in transcript
 * - Confidence >= 0.7 from LLM analysis
 * - Not a duplicate of existing skill (>50% trigger overlap)
 * - Rate limit: 1 skill per session, 5-minute cooldown
 *
 * INPUT:  stdin JSON via readHookInput + parseTranscriptFromInput
 * OUTPUT: Skill file in skills/auto/<Name>/SKILL.md + voice notification
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

import { readHookInput, parseTranscriptFromInput } from './lib/hook-io';
import { inference } from '../PAI/Tools/Inference';

// ── Constants ──────────────────────────────────────────────────────────────

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const SKILLS_AUTO_DIR = join(BASE_DIR, 'skills', 'auto');
const STATE_FILE = join(BASE_DIR, 'MEMORY', 'STATE', 'skill-proposal-state.json');
const TIMEOUT_MS = 30_000;
const MIN_TOOL_CALLS = 5;

// ── Interfaces ─────────────────────────────────────────────────────────────

interface SkillProposal {
  should_create: boolean;
  confidence: number;
  reason: string;
  skill?: {
    name: string;
    description: string;
    triggers: string[];
    workflow_hint: string;
  };
}

interface ProposalState {
  lastSessionId: string;
  lastProposalTime: string;
}

// ── System Prompt ──────────────────────────────────────────────────────────

const SKILL_ANALYSIS_PROMPT = `You are a skill creation analyst. Analyze Claude Code sessions for reusable patterns.

A GOOD skill candidate:
1. Repeats 2+ times in session (same tool sequence or workflow)
2. Useful to OTHER sessions (not just this specific task)
3. Non-trivial (not "fix bug", "add file", "run command")
4. Has clear triggers (when would user want this?)

A BAD skill candidate:
- One-off task (specific to this session only)
- Simple operation (single tool call)
- Generic advice (no concrete workflow)
- Already exists as a skill

Output JSON:
{
  "should_create": boolean,
  "confidence": 0.0-1.0,
  "reason": "why creating or not",
  "skill": {
    "name": "TitleCase",
    "description": "Brief description. USE WHEN trigger1, trigger2.",
    "triggers": ["trigger1", "trigger2"],
    "workflow_hint": "What the skill should do"
  }
}

IMPORTANT:
- name MUST be TitleCase (e.g., "DebugWorkflow", not "debug-workflow")
- description MUST include USE WHEN clause with triggers
- confidence MUST be 0.0-1.0
- If should_create is false, omit skill field`;

// ── Helper Functions ───────────────────────────────────────────────────────

/**
 * Count unique tools used in transcript by matching tool_use blocks.
 * Handles both JSON format ("name": "Tool") and XML format (<function=Tool>).
 */
export function countToolCalls(transcript: string): number {
  // JSON format: "name": "ToolName" (in tool_use blocks)
  const jsonPattern = /"name":\s*"([A-Za-z]+)"/g;
  // XML format: <function=ToolName>
  const xmlPattern = /<function=([A-Za-z]+)>/g;

  const tools = new Set<string>();

  // Extract from JSON format
  let match;
  while ((match = jsonPattern.exec(transcript)) !== null) {
    // Filter out non-tool names (common JSON fields)
    if (!['type', 'id', 'role', 'content', 'model', 'session'].includes(match[1].toLowerCase())) {
      tools.add(match[1]);
    }
  }

  // Extract from XML format
  while ((match = xmlPattern.exec(transcript)) !== null) {
    tools.add(match[1]);
  }

  return tools.size;
}

/**
 * Check if proposed triggers overlap >50% with any existing skill's triggers.
 */
export function checkDuplicate(triggers: string[], existingSkills: Record<string, any>): boolean {
  if (triggers.length === 0) return false;

  for (const skill of Object.values(existingSkills.skills || {})) {
    const existingTriggers: string[] = (skill as any).triggers || [];
    if (existingTriggers.length === 0) continue;

    const intersection = triggers.filter(t => existingTriggers.includes(t));
    if (intersection.length >= Math.min(triggers.length, existingTriggers.length) * 0.5) {
      return true;
    }
  }
  return false;
}

/**
 * Convert any string to TitleCase (no separators).
 */
export function toTitleCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Check rate limit: skip if same session or within cooldown window.
 */
export function checkRateLimit(sessionId: string): boolean {
  try {
    if (!existsSync(STATE_FILE)) return true;
    const state: ProposalState = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (state.lastSessionId === sessionId) return false;
    if (Date.now() - new Date(state.lastProposalTime).getTime() < 5 * 60 * 1000) return false;
  } catch {
    // State file corrupt or missing — allow
  }
  return true;
}

/**
 * Persist state after successful proposal.
 */
function updateState(sessionId: string): void {
  const dir = join(STATE_FILE, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify({
    lastSessionId: sessionId,
    lastProposalTime: new Date().toISOString(),
  }));
}

/**
 * Load existing skills from skills/ directory to check for duplicates.
 * Scans each SKILL.md for description field containing trigger keywords.
 */
function loadExistingSkills(): { skills: Record<string, { triggers: string[] }> } {
  const skillsDir = join(BASE_DIR, 'skills');
  const result: Record<string, { triggers: string[] }> = {};

  try {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillFile = join(skillsDir, entry.name, 'SKILL.md');
      if (!existsSync(skillFile)) continue;

      try {
        const content = readFileSync(skillFile, 'utf-8');
        // Extract USE WHEN clause from description
        const useWhenMatch = content.match(/USE WHEN\s+(.+?)[.\n]/i);
        const descMatch = content.match(/description:\s*(.+?)(?:\n---|\n\n)/s);

        const triggerText = useWhenMatch?.[1] || descMatch?.[1] || '';
        const triggers = triggerText
          .split(/[,;]+/)
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 2);

        if (triggers.length > 0) {
          result[entry.name] = { triggers };
        }
      } catch {
        // Skip unreadable skill files
      }
    }
  } catch {
    // skills/ directory missing — no existing skills
  }

  return { skills: result };
}

/**
 * Send voice notification about created skill.
 */
async function notifySkillCreated(name: string): Promise<void> {
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Создан skill: ${name}. Если не нужен — удали из skills/auto/`,
        voice_id: 'hU3rD0Yk7DoiYULTX1pD',
        voice_enabled: true,
      }),
    });
  } catch {
    // Voice server unavailable — non-critical
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  // Global timeout — graceful exit if anything hangs
  const timeoutId = setTimeout(() => {
    console.error('[AutoSkillProposal] Timeout, exiting');
    process.exit(0);
  }, TIMEOUT_MS);

  try {
    // 1. Read input
    const input = await readHookInput();
    if (!input) {
      console.error('[AutoSkillProposal] No input received');
      process.exit(0);
    }

    const sessionId = input.session_id;

    // 2. Rate limit check
    if (!checkRateLimit(sessionId)) {
      console.error('[AutoSkillProposal] Rate limited, skipping');
      process.exit(0);
    }

    // 3. Parse transcript — ALWAYS read from file, not fast path
    //    AutoSkillProposal needs FULL session, not just last message
    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for file flush
    const { parseTranscript } = await import('../PAI/Tools/TranscriptParser');
    const transcript = parseTranscript(input.transcript_path);
    const rawText = transcript.raw || '';
    if (rawText.length < 200) {
      console.error('[AutoSkillProposal] Transcript too short, skipping');
      process.exit(0);
    }

    // 4. Count tool calls
    const toolCallCount = countToolCalls(rawText);
    if (toolCallCount < MIN_TOOL_CALLS) {
      console.error(`[AutoSkillProposal] Session too simple (${toolCallCount} unique tools, need ${MIN_TOOL_CALLS}), skipping`);
      process.exit(0);
    }

    console.error(`[AutoSkillProposal] Analyzing session: ${toolCallCount} unique tools, ${rawText.length} chars`);

    // 5. Inference — Sonnet analysis
    const result = await inference({
      systemPrompt: SKILL_ANALYSIS_PROMPT,
      userPrompt: `SESSION STATS:
- Tool calls: ${toolCallCount}
- Transcript length: ${rawText.length} chars

FULL TRANSCRIPT:
${rawText}`,
      level: 'standard',
      expectJson: true,
    });

    if (!result.success || !result.parsed) {
      console.error('[AutoSkillProposal] Inference failed:', result.error || 'no parsed output');
      process.exit(0);
    }

    const proposal = result.parsed as SkillProposal;
    if (!proposal.should_create || proposal.confidence < 0.7) {
      console.error(`[AutoSkillProposal] Skipping: ${proposal.reason} (confidence: ${proposal.confidence})`);
      process.exit(0);
    }

    if (!proposal.skill) {
      console.error('[AutoSkillProposal] No skill in proposal despite should_create=true');
      process.exit(0);
    }

    // 6. Normalize name
    const skillName = toTitleCase(proposal.skill.name);

    // 7. Duplicate check
    const existingSkills = loadExistingSkills();
    if (checkDuplicate(proposal.skill.triggers, existingSkills)) {
      console.error(`[AutoSkillProposal] Duplicate skill detected: ${skillName}`);
      process.exit(0);
    }

    // 8. Create skill file
    const skillDir = join(SKILLS_AUTO_DIR, skillName);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }

    const skillContent = `---
name: ${skillName}
description: ${proposal.skill.description}
---

# ${skillName}

${proposal.skill.workflow_hint}

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Create** | "create" | \`Workflows/Create.md\` |

## Examples

**Auto-generated from session:**
${rawText.slice(0, 1000)}...
`;

    writeFileSync(join(skillDir, 'SKILL.md'), skillContent);

    // 9. Update state
    updateState(sessionId);

    // 10. Notify
    clearTimeout(timeoutId);
    console.error(`[AutoSkillProposal] Created skill: ${skillName} (confidence: ${proposal.confidence})`);
    await notifySkillCreated(skillName);

    process.exit(0);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[AutoSkillProposal] Error: ${error}`);
    process.exit(0);
  }
}

if (import.meta.main) {
  main();
}
