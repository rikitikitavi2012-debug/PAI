#!/usr/bin/env bun
/**
 * AddCompatibility.ts - Add compatibility frontmatter to all skill SKILL.md files
 *
 * Schema:
 *   compatibility:
 *     min_model: haiku | sonnet | opus
 *
 * Defaults to "sonnet" unless skill is in the haiku or opus list.
 * Skips files that already have compatibility field.
 * Additive only — never overwrites existing content.
 *
 * Usage: bun AddCompatibility.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.join(process.env.HOME!, '.claude', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

// Skills that can run on haiku (fast, simple lookups)
const HAIKU_SKILLS = new Set([
  'Aphorisms',
  'USMetrics',
]);

// Skills that need opus (deep reasoning, massive analysis)
const OPUS_SKILLS = new Set([
  'Council',
  'RedTeam',
  'WorldThreatModelHarness',
  'BeCreative',
  'Science',
]);

// Non-skill directories to skip
const SKIP_DIRS = new Set(['PAI', 'CORE']);

function getMinModel(skillName: string): string {
  if (HAIKU_SKILLS.has(skillName)) return 'haiku';
  if (OPUS_SKILLS.has(skillName)) return 'opus';
  return 'sonnet';
}

function addCompatibilityToFile(filePath: string, skillName: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip if already has compatibility
  if (content.includes('compatibility:')) {
    console.log(`  [SKIP] ${skillName} — already has compatibility field`);
    return false;
  }

  // Check if has frontmatter
  if (!content.startsWith('---')) {
    console.log(`  [SKIP] ${skillName} — no frontmatter found`);
    return false;
  }

  const minModel = getMinModel(skillName);

  // Find end of frontmatter and insert compatibility before closing ---
  const frontmatterEnd = content.indexOf('\n---', 3);
  if (frontmatterEnd === -1) {
    console.log(`  [SKIP] ${skillName} — malformed frontmatter`);
    return false;
  }

  const newContent =
    content.slice(0, frontmatterEnd) +
    `\ncompatibility:\n  min_model: ${minModel}` +
    content.slice(frontmatterEnd);

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newContent);
  }

  console.log(`  [${DRY_RUN ? 'DRY' : 'OK'}] ${skillName} → min_model: ${minModel}`);
  return true;
}

// Scan all skill directories
const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
let updated = 0;
let skipped = 0;

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Adding compatibility field to skills...\n`);

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  if (SKIP_DIRS.has(entry.name)) continue;

  const skillDir = path.join(SKILLS_DIR, entry.name);
  const skillMd = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillMd)) continue;

  const changed = addCompatibilityToFile(skillMd, entry.name);
  if (changed) updated++;
  else skipped++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
