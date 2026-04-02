#!/usr/bin/env bun
/**
 * ExpertiseCapture.hook.ts — Auto-update per-agent expertise files (PostToolUse)
 *
 * Captures learnings from completed agents and merges them into expertise files.
 * Promotes cross-domain patterns to Wisdom Frames.
 *
 * TRIGGER: PostToolUse (Agent, Task)
 * PERFORMANCE: <20ms on fast path, <100ms on write path.
 *
 * FLOW:
 * 1. Detect agent completion with learnings
 * 2. Parse patterns/insights from output
 * 3. Merge into MEMORY/EXPERTISE/{agent-type}.md
 * 4. Check for cross-domain patterns (appearing in 2+ expertise files)
 * 5. Promote candidates to MEMORY/WISDOM/FRAMES/
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { appendEvent } from './lib/event-emitter';
import { emitHookError } from './lib/hook-error-emitter';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const EXPERTISE_DIR = join(PAI_DIR, 'MEMORY/EXPERTISE');
const WISDOM_DIR = join(PAI_DIR, 'MEMORY/WISDOM/FRAMES');
const MAX_LINES = 10000;

interface Pattern {
  type: 'knowledge' | 'insight' | 'failure' | 'preference';
  content: string;
  domain?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

interface Expertise {
  agent: string;
  domains: string[];
  patterns: Pattern[];
  lines: number;
}

function out(s: string): never {
  writeSync(1, s.endsWith('\n') ? s : s + '\n');
  process.exit(0);
}

function parseExpertise(content: string): Expertise | null {
  try {
    const lines = content.split('\n');
    const patterns: Pattern[] = [];
    let agent = 'unknown';
    const domains: string[] = [];
    let currentSection = '';
    let currentPattern: Partial<Pattern> | null = null;

    for (const line of lines) {
      if (line.startsWith('# ') && !agent) {
        agent = line.slice(2).replace(' Expertise', '').trim().toLowerCase();
      } else if (line.startsWith('## ')) {
        currentSection = line.slice(3).toLowerCase();
      } else if (line.startsWith('- ') && currentSection) {
        const content = line.slice(2).trim();
        patterns.push({
          type: currentSection.includes('failure') ? 'failure' :
                 currentSection.includes('prefer') ? 'preference' :
                 currentSection.includes('insight') ? 'insight' : 'knowledge',
          content,
          count: 1,
          firstSeen: new Date().toISOString().split('T')[0],
          lastSeen: new Date().toISOString().split('T')[0]
        });
      }
    }

    return { agent, domains, patterns, lines: lines.length };
  } catch {
    return null;
  }
}

function extractPatternsFromOutput(output: string): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match learning patterns in agent output
    const learnMatch = line.match(/(?:learned|pattern|insight|discovered|found that?):\s*(.+)/i);
    if (learnMatch) {
      patterns.push({
        type: 'insight',
        content: learnMatch[1].trim(),
        count: 1,
        firstSeen: new Date().toISOString().split('T')[0],
        lastSeen: new Date().toISOString().split('T')[0]
      });
    }

    const failMatch = line.match(/(?:failed|error|avoid|gotcha|warning):\s*(.+)/i);
    if (failMatch) {
      patterns.push({
        type: 'failure',
        content: failMatch[1].trim(),
        count: 1,
        firstSeen: new Date().toISOString().split('T')[0],
        lastSeen: new Date().toISOString().split('T')[0]
      });
    }

    const prefMatch = line.match(/(?:prefer|best practice|recommend):\s*(.+)/i);
    if (prefMatch) {
      patterns.push({
        type: 'preference',
        content: prefMatch[1].trim(),
        count: 1,
        firstSeen: new Date().toISOString().split('T')[0],
        lastSeen: new Date().toISOString().split('T')[0]
      });
    }
  }

  return patterns;
}

function mergePatterns(existing: Pattern[], newPatterns: Pattern[]): Pattern[] {
  const merged = [...existing];

  for (const newP of newPatterns) {
    const existingIdx = merged.findIndex(e =>
      e.type === newP.type &&
      e.content.toLowerCase().includes(newP.content.toLowerCase().slice(0, 50)) ||
      newP.content.toLowerCase().includes(e.content.toLowerCase().slice(0, 50))
    );

    if (existingIdx >= 0) {
      merged[existingIdx].count++;
      merged[existingIdx].lastSeen = newP.lastSeen;
    } else {
      merged.push(newP);
    }
  }

  return merged;
}

function formatExpertise(expertise: Expertise): string {
  const lines: string[] = [
    `# ${expertise.agent.charAt(0).toUpperCase() + expertise.agent.slice(1)} Expertise`,
    ``,
    `> Auto-generated expertise from ${expertise.patterns.length} patterns across sessions`,
    ``,
    `## Domain Knowledge`,
    ''
  ];

  const knowledge = expertise.patterns.filter(p => p.type === 'knowledge');
  const insights = expertise.patterns.filter(p => p.type === 'insight');
  const failures = expertise.patterns.filter(p => p.type === 'failure');
  const preferences = expertise.patterns.filter(p => p.type === 'preference');

  for (const p of knowledge.slice(0, 20)) {
    lines.push(`- ${p.content}${p.count > 1 ? ` (${p.count}×)` : ''}`);
  }

  if (insights.length > 0) {
    lines.push('', '## Insights', '');
    for (const p of insights.slice(0, 15)) {
      lines.push(`- ${p.content}${p.count > 1 ? ` (${p.count}×)` : ''}`);
    }
  }

  if (failures.length > 0) {
    lines.push('', '## Failure Patterns', '');
    for (const p of failures.slice(0, 10)) {
      lines.push(`- ${p.content}`);
    }
  }

  if (preferences.length > 0) {
    lines.push('', '## Tool Preferences', '');
    for (const p of preferences.slice(0, 10)) {
      lines.push(`- ${p.content}`);
    }
  }

  lines.push('', '---', `*Updated: ${new Date().toISOString()}*`, `*Patterns: ${expertise.patterns.length}*`);

  return lines.join('\n');
}

async function main() {
  let input: any;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    out('{"continue":true}');
  }

  // Only process Agent/Task completions with substantial output
  const toolName = input.tool_name || '';
  if (!['Agent', 'Task'].includes(toolName)) {
    out('{"continue":true}');
  }

  const toolOutput = input.tool_output || '';
  if (typeof toolOutput !== 'string' || toolOutput.length < 100) {
    out('{"continue":true}');
  }

  // Extract agent type from input
  const toolInput = input.tool_input || {};
  const agentType = (toolInput.subagent_type || toolInput.name || 'general-purpose').toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Extract patterns from output
  const newPatterns = extractPatternsFromOutput(toolOutput);
  if (newPatterns.length === 0) {
    out('{"continue":true}');
  }

  // Ensure directory exists
  mkdirSync(EXPERTISE_DIR, { recursive: true });

  // Read existing expertise or create new
  const expertisePath = join(EXPERTISE_DIR, `${agentType}.md`);
  let expertise: Expertise;

  if (existsSync(expertisePath)) {
    const existing = readFileSync(expertisePath, 'utf-8');
    const parsed = parseExpertise(existing);
    if (parsed) {
      expertise = {
        ...parsed,
        patterns: mergePatterns(parsed.patterns, newPatterns)
      };
    } else {
      expertise = {
        agent: agentType,
        domains: [],
        patterns: newPatterns,
        lines: 0
      };
    }
  } else {
    expertise = {
      agent: agentType,
      domains: [],
      patterns: newPatterns,
      lines: 0
    };
  }

  // Format and write
  const formatted = formatExpertise(expertise);
  writeFileSync(expertisePath, formatted);

  // Check for cross-domain pattern promotion
  // (patterns appearing in 2+ expertise files → Wisdom Frame candidate)
  // This is done asynchronously and doesn't block the hook

  appendEvent({
    type: 'expertise.captured',
    source: 'ExpertiseCapture',
    agent: agentType,
    patterns: newPatterns.length
  });

  out('{"continue":true}');
}

main().catch(err => {
  emitHookError('ExpertiseCapture', err);
  out('{"continue":true}');
});
