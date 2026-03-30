#!/usr/bin/env bun
/**
 * AutoSkillProposal.hook.ts — Automatic skill creation from session patterns
 *
 * PURPOSE:
 * Analyzes completed sessions for reusable patterns and proposes skill creation.
 * Inspired by Hermes Agent auto-skill creation pattern.
 *
 * TRIGGER: Stop event
 *
 * THRESHOLDS:
 * - Minimum 8 tool calls (complexity threshold)
 * - Must have identifiable pattern (not just "fixed bug")
 * - Rate limit: max 1 proposal per session
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, transcript_path, last_assistant_message)
 *
 * OUTPUT:
 * - Voice notification if pattern detected
 * - AskUserQuestion for user confirmation
 * - Skill file in skills/auto/ if approved
 *
 * FLOW:
 * 1. Read stdin with timeout
 * 2. Check session complexity (skip if <8 tool calls)
 * 3. Analyze last_assistant_message for patterns via Inference.ts
 * 4. If pattern found, notify via voice
 * 5. AskUserQuestion for confirmation
 * 6. If approved, create skill in skills/auto/
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { readHookInput } from './lib/hook-io';
import { execFileSync } from 'child_process';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const SKILLS_AUTO_DIR = join(BASE_DIR, 'skills', 'auto');

// Minimum complexity threshold (tool calls in last_assistant_message)
const MIN_TOOL_CALLS = 8;

// Rate limit: only propose once per session
const PROPOSAL_STATE_FILE = join(BASE_DIR, 'MEMORY', 'STATE', 'skill-proposal-state.json');

interface ProposalState {
  lastProposalSession: string;
  lastProposalTime: string;
}

interface SkillProposal {
  name: string;
  description: string;
  triggerPhrases: string[];
  usage: string;
  pattern: string;
}

/**
 * Check if we already proposed a skill this session
 */
function hasProposedThisSession(sessionId: string): boolean {
  try {
    if (!existsSync(PROPOSAL_STATE_FILE)) {
      return false;
    }
    const state: ProposalState = JSON.parse(readFileSync(PROPOSAL_STATE_FILE, 'utf-8'));
    return state.lastProposalSession === sessionId;
  } catch {
    return false;
  }
}

/**
 * Mark that we've proposed a skill this session
 */
function markProposalDone(sessionId: string): void {
  try {
    const state: ProposalState = {
      lastProposalSession: sessionId,
      lastProposalTime: new Date().toISOString(),
    };
    const dir = dirname(PROPOSAL_STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(PROPOSAL_STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Count tool calls in response (rough complexity estimate)
 */
function countToolCalls(response: string): number {
  // Count phase markers and tool invocations
  const patterns = [
    /━━━.*OBSERVE|THINK|PLAN|BUILD|EXECUTE|VERIFY|LEARN/,
    /\b(Read|Write|Edit|Bash|Grep|Glob|Skill|Agent)\(/g,
  ];
  let count = 0;
  for (const pattern of patterns) {
    const matches = response.match(pattern) || [];
    count += matches.length;
  }
  return Math.floor(count / patterns.length); // Average to avoid double-counting
}

/**
 * Analyze session for patterns using LLM
 */
async function analyzePatterns(response: string): Promise<SkillProposal | null> {
  const systemPrompt = `You are a pattern analyzer. Analyze the given AI assistant response and identify if there is a reusable pattern that could become a skill.

A pattern is something that:
  1. Repeats 2+ times in the response (same action or sequence)
  2. Has clear trigger conditions
  3. Would benefit other users or tasks
  4. Is NOT trivial (not just "fixed X" or "added Y")

If you pattern is found, respond with JSON:
  {
    "pattern_found": true,
    "name": "skill-name-in-kebab-case",
    "description": "Short description of what this skill does",
    "trigger_phrases": ["trigger1", "trigger2"],
    "usage": "How to use this skill",
    "pattern": "Description of the pattern detected"
  }

If no pattern found, respond with
  {
    "pattern_found": false
  }

Focus on patterns like:
  - Multi-step workflows (plan -> execute -> verify)
  - Repeated tool sequences
  - Analysis frameworks
  - Content generation patterns`;

  const userPrompt = `Analyze this AI response for reusable patterns:

Response:
${response.slice(0, 4000)}

Look for:
1. Repeated action sequences (same tools called in sequence)
2. Multi-step processes (planning, executing, verifying)
3. Analysis patterns (decomposing, analyzing, synthesizing)
4. Content patterns (specific formats, structures)

If a reusable pattern is found, return JSON with pattern_found: true and details.
If no reusable pattern is found, return { "pattern_found": false }.`;

  try {
    const output = execFileSync(
      'bun',
      [
        'run',
        join(BASE_DIR, 'PAI/Tools/Inference.ts'),
        '--level', 'fast',
        '--json',
        systemPrompt,
        userPrompt
      ],
      {
        encoding: 'utf-8',
        timeout: 15000,
        maxBuffer: 1024 * 1024
      }
    );

    return JSON.parse(output.toString().trim()) as SkillProposal;
  } catch (error: any) {
    if (error.status && error.status !== 0) {
      console.error(`[AutoSkillProposal] Inference failed: ${error.stderr?.toString('utf-8') || error.message}`);
    } else {
      console.error(`[AutoSkillProposal] Error analyzing patterns: ${error}`);
    }
    return null;
  }
}

/**
 * Send voice notification
 */
async function notifyPattern(name: string): Promise<void> {
  try {
    const response = await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Заметил паттерн: ${name}. Предлагаю создать skill.`,
        voice_id: '3EuKHIEZbSzrHGNmdYsx',
        voice_enabled: true,
      }),
    });
    if (!response.ok) {
      console.error(`[AutoSkillProposal] Voice notification failed`);
    }
  } catch (error) {
    console.error(`[AutoSkillProposal] Voice notification error: ${error}`);
  }
}

/**
 * Create skill file in skills/auto/
 */
function createSkill(proposal: SkillProposal): string {
  const skillPath = join(SKILLS_AUTO_DIR, `${proposal.name}`, 'SKILL.md');

  // Create directory if needed
  const skillDir = dirname(skillPath);
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true });
  }

  // Write skill file
  const skillContent = `# ${proposal.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

**Description:** ${proposal.description}

**Trigger Phrases:**
${proposal.triggerPhrases.map(p => `- \`${p}\``).join('\n')}

**Usage:**
\`\`\`
${proposal.usage}
\`\`\`

**Pattern:**
${proposal.pattern}

**Notes:**
- Auto-generated by AutoSkillProposal hook
- Created: ${new Date().toISOString()}
`;

  writeFileSync(skillPath, skillContent);
  return skillPath;
}

async function main() {
  try {
    // Read stdin with timeout
    const input = await readHookInput();
    if (!input) {
      console.error('[AutoSkillProposal] No input received');
      process.exit(0);
    }

    const { session_id, last_assistant_message } = input;

    // Check rate limit
    if (hasProposedThisSession(session_id)) {
      console.error('[AutoSkillProposal] Already proposed this session, skipping');
      process.exit(0);
    }

    // Check complexity threshold
    if (!last_assistant_message) {
      console.error('[AutoSkillProposal] No last_assistant_message, skipping');
      process.exit(0);
    }

    const toolCallCount = countToolCalls(last_assistant_message);
    if (toolCallCount < MIN_TOOL_CALLS) {
      console.error(`[AutoSkillProposal] Session too simple (${toolCallCount} tool calls), skipping`);
      process.exit(0);
    }

    console.error(`[AutoSkillProposal] Analyzing session with ${toolCallCount} tool calls...`);

    // Analyze patterns
    const proposal = await analyzePatterns(last_assistant_message);
    if (!proposal || !proposal.pattern_found) {
      console.error('[AutoSkillProposal] No reusable pattern found');
      process.exit(0);
    }

    console.error(`[AutoSkillProposal] Found pattern: ${proposal.name}`);
    console.error(`[AutoSkillProposal] Description: ${proposal.description}`);

    // Notify via voice
    await notifyPattern(proposal.name);

    // Mark as proposed
    markProposalDone(session_id);

    // Output proposal for AskUserQuestion
    console.log(JSON.stringify({
      askUserQuestion: {
        questions: [{
          question: `Заметил повторяющийся паттерн "${proposal.name}". Создать skill?`,
          header: "Skill",
          options: [
            {
              label: "Создать skill",
              description: `Создам ${proposal.name} в skills/auto/`
            },
            {
              label: "Не создавать",
              description: "Паттерн недостаточно полезен для skill"
            }
          ],
          multiSelect: false
        }]
      }
    }));

    process.exit(0);
  } catch (error) {
    console.error(`[AutoSkillProposal] Error: ${error}`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`[AutoSkillProposal] Fatal error: ${err}`);
  process.exit(0);
});
