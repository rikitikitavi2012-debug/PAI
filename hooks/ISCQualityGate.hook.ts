#!/usr/bin/env bun
// ISCQualityGate.hook.ts - Block PRD writes with too many trivial ISC criteria
// TRIGGER: PreToolUse (Edit, Write) on MEMORY/WORK/*/PRD.md
import { writeSync } from 'fs';

const CONTINUE = '{"continue":true}\n';
function out(s: string): never { writeSync(1, s.endsWith('\n') ? s : s + '\n'); process.exit(0); }

// Stdin with 300ms timeout
let raw = '';
const reader = Bun.stdin.stream().getReader();
const readDone = (async () => {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += new TextDecoder().decode(value, { stream: true });
    }
  } catch {}
})();
await Promise.race([readDone, new Promise<void>(r => setTimeout(r, 300))]);
reader.cancel().catch(() => {});

if (!raw.trim()) out(CONTINUE);
let input: any;
try { input = JSON.parse(raw); } catch { out(CONTINUE); }

const toolInput = input.tool_input || {};
const filePath: string = toolInput.file_path || '';
if (!filePath.includes('MEMORY/WORK/') || !filePath.endsWith('PRD.md')) out(CONTINUE);

const content: string =
  input.tool_name === 'Edit' ? (toolInput.new_string || '') :
  input.tool_name === 'Write' ? (toolInput.content || '') : '';
if (!content) out(CONTINUE);

const iscLines = content.match(/- \[[ x~!]\] ISC-\d+.*$/gm);
if (!iscLines || iscLines.length === 0) out(CONTINUE);

const TRIVIAL_RE = [
  /\b(exists?|существует|present)\b/i,
  /\b(no\s+(errors?|typos?|warnings?)|без\s+ошибок)\b/i,
  /\b(valid\s+(json|yaml|xml)|правильный\s+формат)\b/i,
];

const trivialIds: string[] = [];
for (const line of iscLines) {
  const idMatch = line.match(/ISC-(\d+)/);
  const id = idMatch ? `ISC-${idMatch[1]}` : '?';
  const textMatch = line.match(/ISC-\d+[:\s]\s*(.*)/);
  const text = textMatch ? textMatch[1].trim() : '';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 5) { trivialIds.push(id); continue; }
  if (TRIVIAL_RE.some(re => re.test(text))) { trivialIds.push(id); }
}

const total = iscLines.length;
const trivCount = trivialIds.length;
const ratio = trivCount / total;

if (ratio > 0.30) {
  const pct = Math.round(ratio * 100);
  out(JSON.stringify({
    decision: 'block',
    reason: `ISC Quality Gate: ${trivCount} из ${total} критериев тривиальны (${pct}%). Замени тривиальные на поведенческие. Тривиальные: ${trivialIds.join(', ')}`
  }));
}

out(CONTINUE);
