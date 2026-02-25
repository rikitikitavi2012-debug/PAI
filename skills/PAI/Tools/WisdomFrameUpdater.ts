#!/usr/bin/env bun
/**
 * WisdomFrameUpdater.ts - Wisdom Frame management for PAI
 *
 * Stores and retrieves domain-specific observations that persist across
 * sessions, building up a compound knowledge layer about how Ivan works.
 *
 * Used by the Algorithm's LEARN phase (WRITE) and OBSERVE phase (READ).
 *
 * COMMANDS:
 *   --add    --domain X --observation "Y" --type Z  Add observation
 *   --list   [--domain X]                           List frames/observations
 *   --read   --domain X                             Read full domain frame
 *   --domains                                       List all known domains
 *
 * OBSERVATION TYPES:
 *   anti-pattern       Something that leads to problems
 *   contextual-rule    How Ivan prefers things done
 *   prediction         Expected request pattern
 *   principle          Confirmed core principle
 *
 * EXAMPLES:
 *   bun WisdomFrameUpdater.ts --add --domain development --observation "Ivan prefers MVP before ideal" --type contextual-rule
 *   bun WisdomFrameUpdater.ts --list --domain development
 *   bun WisdomFrameUpdater.ts --read --domain development
 *   bun WisdomFrameUpdater.ts --domains
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ── Types ──

type ObservationType = 'anti-pattern' | 'contextual-rule' | 'prediction' | 'principle';

interface Observation {
  type: ObservationType;
  observation: string;
  timestamp: string;
  session_id?: string;
  confirmed: number;  // how many times this has been reinforced
}

interface WisdomFrame {
  domain: string;
  updated: string;
  observations: Observation[];
}

// ── Config ──

const CLAUDE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const WISDOM_DIR = join(CLAUDE_DIR, 'MEMORY', 'WISDOM');

const KNOWN_DOMAINS = [
  'development',
  'deployment',
  'communication',
  'system',
  'workflow',
  'learning',
];

const TYPE_ICONS: Record<ObservationType, string> = {
  'anti-pattern': '⚠️',
  'contextual-rule': '📌',
  'prediction': '🔮',
  'principle': '💎',
};

// ── Helpers ──

function ensureWisdomDir(): void {
  if (!existsSync(WISDOM_DIR)) mkdirSync(WISDOM_DIR, { recursive: true });
}

function getFramePath(domain: string): string {
  return join(WISDOM_DIR, `${domain}.json`);
}

function loadFrame(domain: string): WisdomFrame {
  const path = getFramePath(domain);
  if (!existsSync(path)) {
    return { domain, updated: new Date().toISOString(), observations: [] };
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as WisdomFrame;
}

function saveFrame(frame: WisdomFrame): void {
  ensureWisdomDir();
  frame.updated = new Date().toISOString();
  writeFileSync(getFramePath(frame.domain), JSON.stringify(frame, null, 2), 'utf-8');
}

function listDomainFiles(): string[] {
  if (!existsSync(WISDOM_DIR)) return [];
  return readdirSync(WISDOM_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

// ── Commands ──

function cmdAdd(domain: string, observation: string, type: ObservationType, sessionId?: string): void {
  if (!domain || !observation || !type) {
    console.error('Usage: --add --domain X --observation "Y" --type Z');
    console.error('Types: anti-pattern | contextual-rule | prediction | principle');
    process.exit(1);
  }

  const validTypes: ObservationType[] = ['anti-pattern', 'contextual-rule', 'prediction', 'principle'];
  if (!validTypes.includes(type)) {
    console.error(`Invalid type: ${type}. Valid: ${validTypes.join(' | ')}`);
    process.exit(1);
  }

  const frame = loadFrame(domain);

  // Check for duplicate (by observation text similarity)
  const existing = frame.observations.find(o =>
    o.observation.toLowerCase() === observation.toLowerCase()
  );

  if (existing) {
    existing.confirmed += 1;
    existing.timestamp = new Date().toISOString();
    console.log(`[WisdomFrameUpdater] Reinforced existing: "${observation}" (confirmed: ${existing.confirmed}x)`);
  } else {
    frame.observations.push({
      type,
      observation,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      confirmed: 1,
    });
    console.log(`[WisdomFrameUpdater] Added to domain '${domain}': ${TYPE_ICONS[type]} [${type}] "${observation}"`);
  }

  saveFrame(frame);
  console.log(`[WisdomFrameUpdater] Frame saved → ${getFramePath(domain)}`);
}

function cmdList(domain?: string): void {
  const domains = domain ? [domain] : listDomainFiles();

  if (domains.length === 0) {
    console.log('No wisdom frames found. Add observations with --add.');
    return;
  }

  for (const d of domains) {
    const frame = loadFrame(d);
    console.log(`\n── ${d.toUpperCase()} (${frame.observations.length} observations) ──`);
    console.log(`   Updated: ${frame.updated}`);

    if (frame.observations.length === 0) {
      console.log('   (empty)');
      continue;
    }

    // Group by type
    const byType: Record<ObservationType, Observation[]> = {
      'principle': [],
      'contextual-rule': [],
      'anti-pattern': [],
      'prediction': [],
    };
    for (const obs of frame.observations) {
      byType[obs.type].push(obs);
    }

    for (const [type, obs] of Object.entries(byType)) {
      if (obs.length === 0) continue;
      console.log(`\n   ${TYPE_ICONS[type as ObservationType]} ${type.toUpperCase()}:`);
      for (const o of obs) {
        const conf = o.confirmed > 1 ? ` (×${o.confirmed})` : '';
        console.log(`     • ${o.observation}${conf}`);
      }
    }
  }
}

function cmdRead(domain: string): void {
  if (!domain) {
    console.error('Usage: --read --domain X');
    process.exit(1);
  }

  const frame = loadFrame(domain);

  if (frame.observations.length === 0) {
    console.log(`No observations for domain: ${domain}`);
    return;
  }

  // Output as compact context block suitable for injection into OBSERVE
  console.log(`=== WISDOM FRAME: ${domain.toUpperCase()} ===`);
  console.log(`Updated: ${frame.updated} | ${frame.observations.length} observations\n`);

  for (const obs of frame.observations) {
    const conf = obs.confirmed > 1 ? ` [confirmed ×${obs.confirmed}]` : '';
    console.log(`${TYPE_ICONS[obs.type]} [${obs.type}] ${obs.observation}${conf}`);
  }
}

function cmdDomains(): void {
  const domains = listDomainFiles();
  if (domains.length === 0) {
    console.log('No wisdom frames yet. Known domain names:');
    for (const d of KNOWN_DOMAINS) console.log(`  - ${d}`);
    return;
  }

  console.log('Wisdom frames on disk:');
  for (const d of domains) {
    const frame = loadFrame(d);
    console.log(`  ${d}: ${frame.observations.length} observations (updated ${frame.updated.split('T')[0]})`);
  }
}

// ── Main ──

const args = process.argv.slice(2);

if (args.includes('--add')) {
  const domainIdx = args.indexOf('--domain');
  const obsIdx = args.indexOf('--observation');
  const typeIdx = args.indexOf('--type');
  const sessionIdx = args.indexOf('--session');

  cmdAdd(
    domainIdx >= 0 ? args[domainIdx + 1] : '',
    obsIdx >= 0 ? args[obsIdx + 1] : '',
    typeIdx >= 0 ? args[typeIdx + 1] as ObservationType : '' as ObservationType,
    sessionIdx >= 0 ? args[sessionIdx + 1] : undefined,
  );
} else if (args.includes('--list')) {
  const domainIdx = args.indexOf('--domain');
  cmdList(domainIdx >= 0 ? args[domainIdx + 1] : undefined);
} else if (args.includes('--read')) {
  const domainIdx = args.indexOf('--domain');
  cmdRead(domainIdx >= 0 ? args[domainIdx + 1] : '');
} else if (args.includes('--domains')) {
  cmdDomains();
} else {
  console.log(`WisdomFrameUpdater — PAI compound knowledge across sessions

USAGE:
  bun WisdomFrameUpdater.ts --add --domain X --observation "Y" --type Z
  bun WisdomFrameUpdater.ts --list [--domain X]
  bun WisdomFrameUpdater.ts --read --domain X
  bun WisdomFrameUpdater.ts --domains

TYPES: anti-pattern | contextual-rule | prediction | principle
DOMAINS: ${KNOWN_DOMAINS.join(' | ')} (or any custom name)`);
}
