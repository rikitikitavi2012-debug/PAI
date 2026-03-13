#!/usr/bin/env bun
/**
 * ProjectsSync.hook.ts — Sync TELOS/PROJECTS.md → USER/PROJECTS/PROJECTS.md
 *
 * TRIGGER: PostToolUse (Write, Edit)
 *
 * When TELOS/PROJECTS.md is modified, parses it and regenerates
 * the compact snapshot in USER/PROJECTS/PROJECTS.md for loadAtStartup.
 *
 * Deterministic parsing — no LLM needed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { appendEvent } from './lib/event-emitter';
import { emitHookError } from './lib/hook-error-emitter';
import { getPaiDir } from './lib/paths';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const PAI_DIR = getPaiDir();
const TELOS_PROJECTS = join(PAI_DIR, 'PAI', 'USER', 'TELOS', 'PROJECTS.md');
const SNAPSHOT_PATH = join(PAI_DIR, 'PAI', 'USER', 'PROJECTS', 'PROJECTS.md');

async function main() {
  const filePath = (input.tool_input || {}).file_path || '';

  // Only trigger on TELOS/PROJECTS.md changes
  if (!filePath.endsWith('TELOS/PROJECTS.md') && !filePath.endsWith('TELOS\\PROJECTS.md')) return;
  if (!existsSync(TELOS_PROJECTS)) return;

  const content = readFileSync(TELOS_PROJECTS, 'utf-8');
  const lines = content.split('\n');

  // --- Parse active projects ---
  const activeProjects: Array<{
    id: string;
    name: string;
    path: string;
    stack: string;
    status: string;
    focus: string;
  }> = [];

  const plannedProjects: Array<{
    id: string;
    name: string;
    status: string;
    depends: string;
  }> = [];

  const frozenProjects: Array<{
    name: string;
    reason: string;
  }> = [];

  // State machine for parsing
  let section = ''; // 'active', 'planned', 'frozen', 'priority', 'completed'
  let currentProject: any = null;
  let priorityLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect sections (## level headers)
    if (line.startsWith('## Активные проекты')) { section = 'active'; continue; }
    if (line.startsWith('## Планируемые проекты')) { section = 'planned'; flushProject(); continue; }
    if (line.startsWith('## Приоритизация проектов')) { section = 'priority'; flushProject(); continue; }
    if (line.startsWith('## Завершённые проекты')) { section = 'completed'; flushProject(); continue; }
    if (line.startsWith('## Замороженные проекты')) { section = 'frozen'; flushProject(); continue; }

    // Parse active/planned project headers (### P0: Name)
    if ((section === 'active' || section === 'planned') && line.startsWith('### ')) {
      flushProject();
      const headerMatch = line.match(/^### (P\d+):\s*(.+)/);
      if (headerMatch) {
        currentProject = {
          id: headerMatch[1],
          name: headerMatch[2].trim(),
          path: '',
          stack: '',
          status: '',
          focus: '',
          depends: '',
          section,
        };
      }
      continue;
    }

    // Parse project fields (bold key-value pairs)
    if (currentProject) {
      if (line.startsWith('**Статус:**')) {
        currentProject.status = line.replace('**Статус:**', '').trim();
      } else if (line.startsWith('**Стек:**')) {
        currentProject.stack = line.replace('**Стек:**', '').trim();
      } else if (line.startsWith('**Рабочая директория:**')) {
        currentProject.path = line.replace('**Рабочая директория:**', '').trim().replace(/`/g, '');
      } else if (line.startsWith('**Блокеры:**')) {
        currentProject.depends = line.replace('**Блокеры:**', '').trim();
      } else if (line.startsWith('**Архитектура')) {
        // P0 has architecture block with stack details — extract key info
        if (!currentProject.stack) {
          currentProject.stack = 'TypeScript, Bun, Hooks';
        }
      } else if (line.startsWith('**Версия:**')) {
        // Extract version for status enrichment
        const ver = line.replace('**Версия:**', '').trim();
        if (ver && !currentProject.status.includes(ver)) {
          currentProject.status += ` (${ver})`;
        }
      }
    }

    // Parse frozen projects table (4 columns: Проект | Заморожен | Почему | Возобновить когда)
    if (section === 'frozen' && line.startsWith('|') && !line.includes('Проект') && !line.includes('---')) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        frozenProjects.push({ name: cols[0], reason: cols[2] }); // col[2] = "Почему"
      }
    }

    // Capture priority section
    if (section === 'priority') {
      priorityLines.push(line);
    }
  }
  flushProject();

  function flushProject() {
    if (!currentProject) return;
    if (currentProject.section === 'active') {
      activeProjects.push(currentProject);
    } else if (currentProject.section === 'planned') {
      plannedProjects.push(currentProject);
    }
    currentProject = null;
  }

  // --- Extract current focus from priority section ---
  const prioText = priorityLines.join('\n');
  let currentFocus = '';
  // Look for "Текущий фокус" subsection or numbered list after it
  const focusMatch = prioText.match(/\*\*Текущий фокус[^*]*\*\*:?\s*\n([\s\S]*?)(?=\n\*\*(?:Принцип|W5)|$)/);
  if (focusMatch) {
    currentFocus = focusMatch[1].trim().split('\n').filter(l => l.trim()).slice(0, 8).join('\n');
  }

  // --- Extract priority table row ---
  let priorityOrder = '';
  // Find the priority table and extract the order
  const prioTableMatch = prioText.match(/\| P\d+[^|]*\|[^|]*\|[^|]*\|/g);
  if (prioTableMatch) {
    // Build priority order from table: "P1 > P3 > P4 > P0"
    const ids = prioTableMatch.map(row => {
      const m = row.match(/\| (P\d+)/);
      return m ? m[1] : '';
    }).filter(Boolean);
    if (ids.length > 0) priorityOrder = ids.join(' > ');
  }

  // --- Extract brigade from P0 section ---
  // Brigade is in format: **AI Brigade (N членов, T1/T2/T3)** — T1: ..., T2: ..., T3: ...
  let brigadeCompact = '';
  const brigadeMatch = content.match(/\*\*AI Brigade[^*]*\*\*\s*—\s*(.+)/);
  if (brigadeMatch) {
    brigadeCompact = brigadeMatch[1].trim();
  }

  // --- Enrich P0 with known defaults (no explicit Стек/Путь fields in TELOS) ---
  for (const p of activeProjects) {
    if (p.id === 'P0' && !p.path) p.path = '~/.claude';
    if (p.id === 'P0' && p.stack === 'TypeScript, Bun, Hooks') {
      // Already set by architecture detection
    }
  }

  // --- Generate compact snapshot ---
  const today = new Date().toISOString().split('T')[0];
  const snapshot = generateSnapshot(today, activeProjects, plannedProjects, frozenProjects, currentFocus, priorityOrder, brigadeCompact);

  // --- Change detection ---
  if (existsSync(SNAPSHOT_PATH)) {
    const existing = readFileSync(SNAPSHOT_PATH, 'utf-8');
    // Strip date line for comparison
    const normalize = (s: string) => s.replace(/\*Обновлено:.*\*/, '').trim();
    if (normalize(existing) === normalize(snapshot)) return; // No changes
  }

  writeFileSync(SNAPSHOT_PATH, snapshot, 'utf-8');
  appendEvent({ type: 'custom.projects_synced' as any, source: 'ProjectsSync' });
  process.stderr.write(`[ProjectsSync] Synced ${activeProjects.length} active + ${plannedProjects.length} planned projects\n`);
}

function generateSnapshot(
  date: string,
  active: any[],
  planned: any[],
  frozen: any[],
  focus: string,
  priority: string,
  brigade: string,
): string {
  let out = `# Projects Registry (Оперативный снимок)\n\n`;
  out += `*Компактная сводка для стартового контекста. Полные данные: \`PAI/USER/TELOS/PROJECTS.md\`*\n`;
  out += `*Обновлено: ${date}*\n\n`;

  // Active projects table
  out += `## Активные\n\n`;
  out += `| # | Проект | Путь | Стек | Статус |\n`;
  out += `|---|--------|------|------|--------|\n`;
  for (const p of active) {
    const path = p.path ? `\`${p.path}\`` : '—';
    const stack = truncate(p.stack, 60);
    const status = truncate(p.status, 80);
    out += `| ${p.id} | ${p.name} | ${path} | ${stack} | ${status} |\n`;
  }

  // Planned
  if (planned.length > 0) {
    out += `\n## Планируемые\n\n`;
    out += `| # | Проект | Статус | Блокеры |\n`;
    out += `|---|--------|--------|--------|\n`;
    for (const p of planned) {
      out += `| ${p.id} | ${p.name} | ${truncate(p.status, 60)} | ${truncate(p.depends, 60)} |\n`;
    }
  }

  // Frozen
  if (frozen.length > 0) {
    out += `\n## Замороженные\n\n`;
    out += `| Проект | Почему |\n`;
    out += `|--------|--------|\n`;
    for (const f of frozen) {
      out += `| ${f.name} | ${f.reason} |\n`;
    }
  }

  // Priority
  if (priority || focus) {
    out += `\n## Приоритет\n\n`;
    if (priority) out += `**${priority}**\n\n`;
    if (focus) out += focus + '\n';
  }

  // Brigade (one-liner)
  if (brigade) {
    out += `\n## AI Brigade\n\n`;
    out += `${brigade}\n`;
  }

  return out;
}

function truncate(s: string, max: number): string {
  if (!s) return '—';
  // Remove markdown bold
  s = s.replace(/\*\*/g, '');
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

main().catch((err) => {
  emitHookError('ProjectsSync', err);
  process.stderr.write(`[ProjectsSync] error: ${err}\n`);
}).finally(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
