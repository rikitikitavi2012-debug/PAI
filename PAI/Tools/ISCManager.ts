#!/usr/bin/env bun
/**
 * ISCManager — Deterministic ISC management for PRD.md files.
 * Commands: create, update, show, verify
 * Usage: bun PAI/Tools/ISCManager.ts <command> [--prd <path>] [options]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const R = '\x1b[0m', G = '\x1b[32m', RD = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', DIM = '\x1b[2m';

interface ISC { id: string; status: ' ' | 'x' | '~' | '!'; text: string; verify?: string; line: number; }

const PATTERN = /^- \[([ x~!])\] (ISC-[A-Za-z]*-?\d+)(?:\s*\[[BQ]\])?:?\s*(.+?)(?:\(verify:\s*(.+?)\))?\s*$/;

function findPRD(prdArg?: string): string {
  if (prdArg) {
    if (!existsSync(prdArg)) { console.error(`${RD}Error: PRD not found: ${prdArg}${R}`); process.exit(1); }
    return prdArg;
  }
  const workDir = join(process.env.HOME || '', '.claude', 'MEMORY', 'WORK');
  if (!existsSync(workDir)) { console.error(`${RD}Error: MEMORY/WORK not found${R}`); process.exit(1); }
  const dirs = readdirSync(workDir).filter(d => {
    const p = join(workDir, d, 'PRD.md');
    return existsSync(p);
  }).sort().reverse();
  if (!dirs.length) { console.error(`${RD}Error: No PRD.md found in MEMORY/WORK${R}`); process.exit(1); }
  return join(workDir, dirs[0], 'PRD.md');
}

function parsePRD(path: string): { lines: string[]; iscs: ISC[]; frontmatter: { start: number; end: number } } {
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split('\n');
  const iscs: ISC[] = [];
  let fmStart = -1, fmEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') { if (fmStart < 0) fmStart = i; else if (fmEnd < 0) fmEnd = i; }
    const m = lines[i].match(PATTERN);
    if (m) iscs.push({ id: m[2], status: m[1] as ISC['status'], text: m[3].trim(), verify: m[4]?.trim(), line: i });
  }
  return { lines, iscs, frontmatter: { start: fmStart, end: fmEnd } };
}

function updateProgress(lines: string[], fm: { start: number; end: number }, iscs: ISC[]): void {
  const done = iscs.filter(i => i.status === 'x').length;
  const total = iscs.length;
  for (let i = fm.start; i <= fm.end; i++) {
    if (lines[i].match(/^progress:/)) { lines[i] = `progress: ${done}/${total}`; return; }
  }
}

function writeBack(path: string, lines: string[]): void { writeFileSync(path, lines.join('\n')); }

function maxISCNum(iscs: ISC[]): number {
  let max = 0;
  for (const i of iscs) { const m = i.id.match(/ISC-(\d+)$/); if (m) max = Math.max(max, parseInt(m[1])); }
  return max;
}

function cmdCreate(prdPath: string, text: string): void {
  const { lines, iscs, frontmatter } = parsePRD(prdPath);
  const next = maxISCNum(iscs) + 1;
  const id = `ISC-${next}`;
  // Find ## Criteria section end (last ISC line or section header)
  let insertAt = lines.length;
  if (iscs.length) insertAt = iscs[iscs.length - 1].line + 1;
  else { for (let i = 0; i < lines.length; i++) if (lines[i].match(/^## Criteria/)) { insertAt = i + 1; break; } }
  const newLine = `- [ ] ${id}: ${text}`;
  lines.splice(insertAt, 0, newLine);
  const newISC: ISC = { id, status: ' ', text, line: insertAt };
  iscs.push(newISC);
  updateProgress(lines, frontmatter, iscs);
  writeBack(prdPath, lines);
  console.log(`${G}Created ${id}: ${text}${R}`);
}

function cmdUpdate(prdPath: string, targetId: string, status: string): void {
  const { lines, iscs, frontmatter } = parsePRD(prdPath);
  const isc = iscs.find(i => i.id === targetId);
  if (!isc) { console.error(`${RD}Error: ${targetId} not found${R}`); process.exit(1); }
  const mark = status === 'done' ? 'x' : status === 'skip' ? '~' : status === 'fail' ? '!' : status === 'todo' ? ' ' : status;
  lines[isc.line] = lines[isc.line].replace(/- \[[ x~!]\]/, `- [${mark}]`);
  isc.status = mark as ISC['status'];
  updateProgress(lines, frontmatter, iscs);
  writeBack(prdPath, lines);
  const icon = mark === 'x' ? G + 'DONE' : mark === '~' ? Y + 'SKIP' : mark === '!' ? RD + 'FAIL' : 'TODO';
  console.log(`${icon}${R} ${targetId}: ${isc.text}`);
}

function cmdShow(prdPath: string): void {
  const { iscs } = parsePRD(prdPath);
  if (!iscs.length) { console.log(`${Y}No ISC criteria found${R}`); return; }
  const maxId = Math.max(5, ...iscs.map(i => i.id.length));
  const maxTxt = Math.max(9, ...iscs.map(i => i.text.length));
  const hr = `${'─'.repeat(maxId + 2)}┼────────┼${'─'.repeat(maxTxt + 2)}`;
  console.log(`${B}${C}┌${'─'.repeat(maxId + 2)}┬────────┬${'─'.repeat(maxTxt + 2)}┐${R}`);
  console.log(`${B}${C}│${R}${B} ${'ID'.padEnd(maxId)} ${C}│${R}${B} Status ${C}│${R}${B} ${'Criterion'.padEnd(maxTxt)} ${C}│${R}`);
  console.log(`${C}├${hr}┤${R}`);
  for (const i of iscs) {
    const icon = i.status === 'x' ? G + ' DONE ' : i.status === '~' ? Y + ' SKIP ' : i.status === '!' ? RD + ' FAIL ' : DIM + ' TODO ';
    console.log(`${C}│${R} ${i.id.padEnd(maxId)} ${C}│${R}${icon}${R}${C}│${R} ${i.text.padEnd(maxTxt)} ${C}│${R}`);
  }
  console.log(`${C}└${'─'.repeat(maxId + 2)}┴────────┴${'─'.repeat(maxTxt + 2)}┘${R}`);
  const done = iscs.filter(i => i.status === 'x').length;
  const pct = Math.round((done / iscs.length) * 100);
  console.log(`\n${B}Progress:${R} ${done}/${iscs.length} (${pct}%)`);
}

function cmdVerify(prdPath: string): void {
  const { iscs } = parsePRD(prdPath);
  const verifiable = iscs.filter(i => i.verify);
  if (!verifiable.length) { console.log(`${Y}No verifiable criteria (none have verify: commands)${R}`); return; }
  let pass = 0, fail = 0;
  for (const i of verifiable) {
    try {
      const out = execSync(i.verify!, { timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
      console.log(`${G}PASS${R} ${i.id}: ${i.text} ${DIM}(${out.slice(0, 60)})${R}`);
      pass++;
    } catch {
      console.log(`${RD}FAIL${R} ${i.id}: ${i.text}`);
      fail++;
    }
  }
  console.log(`\n${B}Verify:${R} ${G}${pass} pass${R}, ${RD}${fail} fail${R} / ${verifiable.length} total`);
}

// --- CLI ---
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log(`${B}ISCManager${R} — manage ISC criteria in PRD.md files

${B}Usage:${R} bun ISCManager.ts <command> [--prd <path>] [options]

${B}Commands:${R}
  show                        Show all criteria in table format
  create --text "criterion"   Add new ISC criterion
  update --id ISC-N --status done|todo|skip|fail
  verify                      Run verify commands for each criterion

${B}Options:${R}
  --prd <path>   Path to PRD.md (default: newest in MEMORY/WORK/)
  --help         Show this help`);
  process.exit(0);
}

const cmd = args[0];
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const prdPath = findPRD(flag('--prd'));

switch (cmd) {
  case 'show': cmdShow(prdPath); break;
  case 'create': {
    const text = flag('--text');
    if (!text) { console.error(`${RD}Error: --text required${R}`); process.exit(1); }
    cmdCreate(prdPath, text); break;
  }
  case 'update': {
    const id = flag('--id'), status = flag('--status');
    if (!id || !status) { console.error(`${RD}Error: --id and --status required${R}`); process.exit(1); }
    cmdUpdate(prdPath, id, status); break;
  }
  case 'verify': cmdVerify(prdPath); break;
  default: console.error(`${RD}Unknown command: ${cmd}${R}`); process.exit(1);
}
