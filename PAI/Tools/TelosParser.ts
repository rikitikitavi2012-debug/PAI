#!/usr/bin/env bun
/**
 * TelosParser — Parse TELOS markdown files into structured JSON
 *
 * Usage:
 *   bun PAI/Tools/TelosParser.ts          # Write to MEMORY/STATE/telos-state.json
 *   bun PAI/Tools/TelosParser.ts --stdout  # Output to stdout
 *
 * Data flow: 23 TELOS .md files + system data → telos-state.json
 * Consumers: command-center.sh, telos-dashboard.sh
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve } from "path";

// ── Paths ──
const PAI_DIR = resolve(import.meta.dir, "../..");
const TELOS_DIR = join(PAI_DIR, "PAI/USER/TELOS");
const STATE_DIR = join(PAI_DIR, "MEMORY/STATE");
const HOOKS_DIR = join(PAI_DIR, "hooks");
const OUTPUT_PATH = join(STATE_DIR, "telos-state.json");

// ── Types ──
interface Mission {
  id: string;
  name: string;
  description: string;
  status: string;
  linkedGoals: string[];
  progress: number;
}

interface Goal {
  id: string;
  name: string;
  status: string;
  missions: string[];
  checked: number;
  total: number;
  progress: number;
  blockers: string[];
}

interface Challenge {
  id: string;
  name: string;
  status: string;
  severity: "high" | "medium" | "low";
  linkedStrategies: string[];
}

interface Strategy {
  id: string;
  name: string;
  addresses: string[];
  effectiveness: "working" | "partial" | "unknown";
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  checked: number;
  total: number;
  progress: number;
}

interface CapitalAllocation {
  name: string;
  amount: number;
  percent: number;
  priority: string;
  goal: string;
}

interface Season {
  current: "offseason" | "season";
  seasonLabel: string;
  transitionDate: string;
  daysRemaining: number;
  totalDays: number;
  elapsedPercent: number;
}

interface Sphere {
  name: string;
  color: "green" | "yellow" | "red";
}

interface Blocker {
  blocker: string;
  urgency: string;
  next: string;
  linked: string;
}

interface Win {
  win: string;
  date: string;
  linked: string;
}

interface WisdomQuote {
  id: string;
  text: string;
  source: string;
}

interface LearningMeta {
  wisdomQuotes: WisdomQuote[];
  beliefsCount: number;
  ideasCount: number;
  lessonsCount: number;
  sessionsWeek: number;
  performanceRating: { current: number; weekAvg: number; trend: "up" | "down" | "flat" };
  wisdomFramesCount: number;
}

interface SystemHealth {
  hookCount: number;
  testCount: number;
  eventCount24h: number;
  eventCount7d: number;
  automerge: { merged: number; failed: number; skipped: number };
}

interface TelosState {
  generated: string;
  missions: Mission[];
  goals: Goal[];
  challenges: Challenge[];
  strategies: Strategy[];
  projects: Project[];
  capital: { total: number; allocations: CapitalAllocation[] };
  season: Season;
  status: {
    spheres: Sphere[];
    weeklyFocus: string[];
    blockers: Blocker[];
    recentWins: Win[];
  };
  system: SystemHealth;
  learning: LearningMeta;
}

// ── Safe file reader ──
function readFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

// ── Parse missions from MISSION.md ──
function parseMissions(content: string): Mission[] {
  if (!content) return [];
  const missions: Mission[] = [];

  // Parse Mission → Goal Mapping table
  const goalMap: Record<string, string[]> = {};
  const mapSection = content.match(/## Mission → Goal Mapping[\s\S]*?(?=\n---|\n## |$)/);
  if (mapSection) {
    const rows = mapSection[0].split("\n").filter(l => l.includes("|") && /M\d/.test(l));
    for (const row of rows) {
      const cells = row.split("|").map(s => s.trim()).filter(Boolean);
      const mMatch = cells[0]?.match(/M(\d+)/);
      if (mMatch && cells[1]) {
        const goals = cells[1].match(/G\d+/g) || [];
        goalMap[`M${mMatch[1]}`] = goals;
      }
    }
  }

  // Parse each mission block
  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(M\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const name = headerMatch[2].trim();
    const lines = block.split("\n");
    const description = lines.slice(1).find(l => l.trim() && !l.startsWith("**"))?.trim() || "";

    // Status from mapping table
    let status = "Активна";
    if (mapSection) {
      const statusMatch = mapSection[0].match(new RegExp(`${id}[^|]*\\|[^|]*\\|\\s*([^|]+)\\|`));
      if (statusMatch) status = statusMatch[1].trim();
    }

    missions.push({
      id,
      name,
      description,
      status,
      linkedGoals: goalMap[id] || [],
      progress: 0, // Computed after goals are parsed
    });
  }
  return missions;
}

// ── Parse goals from GOALS.md ──
function parseGoals(content: string): Goal[] {
  if (!content) return [];
  const goals: Goal[] = [];

  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(G\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const name = headerMatch[2].trim();

    // Status
    const statusMatch = block.match(/\*\*Статус:\*\*\s*(.+)/);
    let status = statusMatch ? statusMatch[1].trim() : "Неизвестно";

    // Missions
    const missionsMatch = block.match(/\*\*Поддерживает:\*\*\s*(.+)/);
    const missions: string[] = [];
    if (missionsMatch) {
      const ms = missionsMatch[1].match(/M\d+/g);
      if (ms) missions.push(...ms);
    }

    // Checkboxes
    const checked = (block.match(/- \[x\]/gi) || []).length;
    const unchecked = (block.match(/- \[ \]/g) || []).length;
    const total = checked + unchecked;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    // Blockers (rough extraction from block text)
    const blockers: string[] = [];
    const blockerPatterns = [
      /блокер[^.:\n]*[:.]?\s*([^\n]+)/gi,
      /⚠\s*([^\n]+)/g,
    ];
    for (const pattern of blockerPatterns) {
      let m;
      while ((m = pattern.exec(block)) !== null) {
        blockers.push(m[1].trim());
      }
    }

    goals.push({ id, name, status, missions, checked, total, progress, blockers });
  }
  return goals;
}

// ── Parse challenges from CHALLENGES.md ──
function parseChallenges(content: string): Challenge[] {
  if (!content) return [];
  const challenges: Challenge[] = [];

  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(C\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const name = headerMatch[2].trim();

    const statusMatch = block.match(/\*\*Статус:\*\*\s*(.+)/);
    const status = statusMatch ? statusMatch[1].trim() : "Неизвестно";

    // Linked strategies
    const stratMatch = block.match(/\*\*Связанные стратегии:\*\*\s*(.+)/);
    const linkedStrategies: string[] = [];
    if (stratMatch) {
      const ss = stratMatch[1].match(/S\d+/g);
      if (ss) linkedStrategies.push(...ss);
    }

    // Severity from status keywords
    let severity: "high" | "medium" | "low" = "medium";
    const statusLower = status.toLowerCase();
    if (statusLower.includes("активно") && !statusLower.includes("решено")) severity = "high";
    if (statusLower.includes("решено") || statusLower.includes("в основном")) severity = "low";
    if (statusLower.includes("управляем") || statusLower.includes("осознаю") || statusLower.includes("постоянный")) severity = "medium";

    challenges.push({ id, name, status, severity, linkedStrategies });
  }
  return challenges;
}

// ── Parse strategies from STRATEGIES.md ──
function parseStrategies(content: string): Strategy[] {
  if (!content) return [];
  const strategies: Strategy[] = [];

  // Parse effectiveness log
  const effectivenessMap: Record<string, "working" | "partial" | "unknown"> = {};
  const effSection = content.match(/## Strategy Effectiveness Log[\s\S]*?(?=\n---|\n## |$)/);
  if (effSection) {
    const rows = effSection[0].split("\n").filter(l => l.includes("|") && /S\d/.test(l));
    for (const row of rows) {
      const cells = row.split("|").map(s => s.trim()).filter(Boolean);
      const sMatch = cells[0]?.match(/S(\d+)/);
      if (sMatch) {
        const result = (cells[2] || "").toLowerCase();
        const correction = (cells[3] || "").toLowerCase();
        // "Нет" in correction column + positive results = working
        if (correction.includes("нет") || correction.includes("продолж")) {
          effectivenessMap[`S${sMatch[1]}`] = "working";
        } else if (result.includes("добавить") || correction.includes("добавить")) {
          effectivenessMap[`S${sMatch[1]}`] = "partial";
        } else {
          effectivenessMap[`S${sMatch[1]}`] = "unknown";
        }
      }
    }
  }
  // Fallback: strategies not in log — derive from goal/challenge context
  // Will be applied after goals are parsed, in a separate pass

  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(S\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const name = headerMatch[2].trim();

    const addrMatch = block.match(/\*\*Адресует:\*\*\s*(.+)/);
    const addresses: string[] = [];
    if (addrMatch) {
      const refs = addrMatch[1].match(/[CGMS]\d+/g);
      if (refs) addresses.push(...refs);
    }

    const status = "Активна"; // All strategies in Active Strategies section are active
    const effectiveness = effectivenessMap[id] || "unknown";

    strategies.push({ id, name, addresses, effectiveness, status });
  }
  return strategies;
}

// ── Parse capital allocation from STRATEGIES.md ──
function parseCapital(content: string): { total: number; allocations: CapitalAllocation[] } {
  const allocations: CapitalAllocation[] = [];
  let total = 3_500_000;

  const section = content.match(/## Распределение капитала[\s\S]*?(?=\n---|\n## |$)/);
  if (!section) return { total, allocations };

  // Parse the table
  const tableRows = section[0].split("\n").filter(l => l.includes("|") && l.includes("₽"));
  for (const row of tableRows) {
    const cells = row.split("|").map(s => s.trim()).filter(Boolean);
    if (cells.length < 5) continue;
    const name = cells[0].replace(/\*\*/g, "").trim();
    const amountStr = cells[1].replace(/[^\d]/g, "");
    const amount = parseInt(amountStr) || 0;
    const percentStr = cells[2].replace(/[^\d]/g, "");
    const percent = parseInt(percentStr) || 0;
    const priority = cells[3].trim();
    const goal = cells[4].trim();

    allocations.push({ name, amount, percent, priority, goal });
  }

  return { total, allocations };
}

// ── Parse projects from PROJECTS.md ──
function parseProjects(content: string): Project[] {
  if (!content) return [];
  const projects: Project[] = [];

  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(P\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const name = headerMatch[2].trim();

    const statusMatch = block.match(/\*\*Статус:\*\*\s*(.+)/);
    const status = statusMatch ? statusMatch[1].trim() : "Неизвестно";

    // Count checkboxes in "Следующие шаги" section
    const stepsSection = block.match(/\*\*Следующие шаги:\*\*[\s\S]*?(?=\n\*\*|$)/);
    const checkContent = stepsSection ? stepsSection[0] : block;
    const checked = (checkContent.match(/- \[x\]/gi) || []).length;
    const unchecked = (checkContent.match(/- \[ \]/g) || []).length;
    const total = checked + unchecked;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    projects.push({ id, name, status, checked, total, progress });
  }
  return projects;
}

// ── Parse status data from STATUS.md ──
function parseStatus(content: string): {
  spheres: Sphere[];
  weeklyFocus: string[];
  blockers: Blocker[];
  recentWins: Win[];
} {
  if (!content) return { spheres: [], weeklyFocus: [], blockers: [], recentWins: [] };

  // Spheres
  const spheres: Sphere[] = [];
  const sphereBlocks = content.split(/^### /m).slice(1);
  for (const block of sphereBlocks) {
    const nameMatch = block.match(/^([^\n]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (name.startsWith("Работа") || name.startsWith("Здоровье") || name.startsWith("Отношения") || name.startsWith("Финансы") || name.startsWith("Личностный") || name.startsWith("Проекты")) {
      const statusMatch = block.match(/\*\*Статус:\*\*\s*(.*)/);
      let color: "green" | "yellow" | "red" = "green";
      if (statusMatch) {
        const s = statusMatch[1].toLowerCase();
        if (s.includes("жёлт") || s.includes("yellow")) color = "yellow";
        if (s.includes("красн") || s.includes("red")) color = "red";
      }
      spheres.push({ name, color });
    }
  }

  // Weekly focus
  const weeklyFocus: string[] = [];
  const focusSection = content.match(/## Фокус этой недели[\s\S]*?(?=\n---|\n## |$)/);
  if (focusSection) {
    const items = focusSection[0].match(/^\d+\.\s*\*\*(.+?)\*\*/gm) || [];
    for (const item of items) {
      const m = item.match(/\d+\.\s*\*\*(.+?)\*\*/);
      if (m) weeklyFocus.push(m[1].trim());
    }
    // Fallback: numbered lines without bold
    if (weeklyFocus.length === 0) {
      const lines = focusSection[0].match(/^\d+\.\s*(.+)/gm) || [];
      for (const line of lines) {
        const m = line.match(/^\d+\.\s*(.+)/);
        if (m) weeklyFocus.push(m[1].replace(/\*\*/g, "").trim());
      }
    }
  }

  // Blockers
  const blockers: Blocker[] = [];
  const blockerSection = content.match(/## Блокеры[\s\S]*?(?=\n---|\n## |$)/);
  if (blockerSection) {
    const rows = blockerSection[0].split("\n").filter(l => l.includes("|") && !l.includes("---") && !l.includes("Блокер"));
    for (const row of rows) {
      const cells = row.split("|").map(s => s.trim()).filter(Boolean);
      if (cells.length >= 4) {
        blockers.push({
          blocker: cells[0],
          linked: cells[1],
          urgency: cells[2],
          next: cells[3],
        });
      }
    }
  }

  // Recent wins (last 15)
  const recentWins: Win[] = [];
  const winsSection = content.match(/## Недавние победы[\s\S]*?(?=\n---|\n## |$)/);
  if (winsSection) {
    const rows = winsSection[0].split("\n").filter(l => l.includes("|") && !l.includes("---") && !l.includes("Победа"));
    for (const row of rows.slice(0, 15)) {
      const cells = row.split("|").map(s => s.trim()).filter(Boolean);
      if (cells.length >= 3) {
        recentWins.push({
          win: cells[0],
          date: cells[1],
          linked: cells[2],
        });
      }
    }
  }

  return { spheres, weeklyFocus, blockers, recentWins };
}

// ── Calculate season ──
function calculateSeason(): Season {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const isOffseason = month === 12 || month <= 3;

  if (isOffseason) {
    // Offseason: Dec 1 → Mar 31
    const year = month === 12 ? now.getFullYear() + 1 : now.getFullYear();
    const offseasonEnd = new Date(year, 3, 1); // April 1
    const offseasonStart = new Date(month === 12 ? now.getFullYear() : now.getFullYear() - 1, 11, 1); // Dec 1
    const totalDays = Math.ceil((offseasonEnd.getTime() - offseasonStart.getTime()) / 86400000);
    const daysRemaining = Math.max(0, Math.ceil((offseasonEnd.getTime() - now.getTime()) / 86400000));
    const elapsed = totalDays - daysRemaining;
    const elapsedPercent = Math.round((elapsed / totalDays) * 100);

    return {
      current: "offseason",
      seasonLabel: "Межсезонье",
      transitionDate: offseasonEnd.toISOString().split("T")[0],
      daysRemaining,
      totalDays,
      elapsedPercent,
    };
  } else {
    // Season: Apr 1 → Nov 30
    const seasonEnd = new Date(now.getFullYear(), 11, 1); // Dec 1
    const seasonStart = new Date(now.getFullYear(), 3, 1); // Apr 1
    const totalDays = Math.ceil((seasonEnd.getTime() - seasonStart.getTime()) / 86400000);
    const daysRemaining = Math.max(0, Math.ceil((seasonEnd.getTime() - now.getTime()) / 86400000));
    const elapsed = totalDays - daysRemaining;
    const elapsedPercent = Math.round((elapsed / totalDays) * 100);

    return {
      current: "season",
      seasonLabel: "Сезон",
      transitionDate: seasonEnd.toISOString().split("T")[0],
      daysRemaining,
      totalDays,
      elapsedPercent,
    };
  }
}

// ── Collect system health data ──
function collectSystemHealth(): SystemHealth {
  // Hook count
  let hookCount = 0;
  try {
    const files = readdirSync(HOOKS_DIR);
    hookCount = files.filter(f => f.endsWith(".hook.ts")).length;
  } catch { /* fail-open */ }

  // Test count
  let testCount = 0;
  try {
    const testDir = join(HOOKS_DIR, "tests");
    const files = readdirSync(testDir);
    testCount = files.filter(f => f.endsWith(".test.ts")).length;
  } catch { /* fail-open */ }

  // Event counts from events.jsonl
  let eventCount24h = 0;
  let eventCount7d = 0;
  try {
    const eventsPath = join(STATE_DIR, "events.jsonl");
    const content = readFileSync(eventsPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const now = Date.now();
    const day = 86400000;
    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        const ts = new Date(evt.timestamp || evt.ts || 0).getTime();
        if (now - ts < day) eventCount24h++;
        if (now - ts < 7 * day) eventCount7d++;
      } catch { /* skip malformed */ }
    }
  } catch { /* fail-open */ }

  // AutoMerge stats
  let automerge = { merged: 0, failed: 0, skipped: 0 };
  try {
    const jamPath = join(STATE_DIR, "jules-automerge.json");
    const jam = JSON.parse(readFileSync(jamPath, "utf-8"));
    automerge = {
      merged: jam.stats?.totalMerged || 0,
      failed: jam.stats?.totalFailed || 0,
      skipped: jam.stats?.totalSkipped || 0,
    };
  } catch { /* fail-open */ }

  return { hookCount, testCount, eventCount24h, eventCount7d, automerge };
}

// ── Parse wisdom quotes from WISDOM.md ──
function parseWisdomQuotes(content: string): WisdomQuote[] {
  if (!content) return [];
  const quotes: WisdomQuote[] = [];
  const blocks = content.split(/^### /m).slice(1);
  for (const block of blocks) {
    const headerMatch = block.match(/^(W\d+):\s*(.+)/);
    if (!headerMatch) continue;
    const id = headerMatch[1];
    const text = headerMatch[2].trim();
    const sourceMatch = block.match(/\*\*Источник:\*\*\s*(.+)/);
    const source = sourceMatch ? sourceMatch[1].trim() : "";
    quotes.push({ id, text, source });
  }
  // Also extract borrowed wisdom quotes (blockquotes)
  const quoteBlocks = content.match(/^>\s*"(.+?)"/gm) || [];
  for (let i = 0; i < quoteBlocks.length; i++) {
    const m = quoteBlocks[i].match(/^>\s*"(.+?)"/);
    if (m) quotes.push({ id: `Q${i}`, text: m[1], source: "borrowed" });
  }
  return quotes;
}

// ── Count items by header pattern ──
function countByPattern(content: string, pattern: RegExp): number {
  if (!content) return 0;
  return (content.match(pattern) || []).length;
}

// ── Collect learning meta from MEMORY ──
function collectLearningMeta(): LearningMeta {
  const wisdomContent = readFile(join(TELOS_DIR, "WISDOM.md"));
  const wisdomQuotes = parseWisdomQuotes(wisdomContent);

  const beliefsContent = readFile(join(TELOS_DIR, "BELIEFS.md"));
  const beliefsCount = countByPattern(beliefsContent, /^### B\d+:/gm);

  const ideasContent = readFile(join(TELOS_DIR, "IDEAS.md"));
  const ideasCount = countByPattern(ideasContent, /^### I\d+:/gm);

  const learnedContent = readFile(join(TELOS_DIR, "LEARNED.md"));
  // Count bullet points (lessons are bullet items, not headers)
  const lessonsCount = countByPattern(learnedContent, /^- \*\*/gm);

  // Sessions this week from MEMORY/WORK
  let sessionsWeek = 0;
  try {
    const workDir = join(PAI_DIR, "MEMORY/WORK");
    const dirs = readdirSync(workDir);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const weekStr = weekAgo.toISOString().slice(0, 10).replace(/-/g, "").slice(0, 8);
    sessionsWeek = dirs.filter(d => d.slice(0, 8) >= weekStr).length;
  } catch { /* fail-open */ }

  // Performance rating from ratings.jsonl
  let performanceRating = { current: 0, weekAvg: 0, trend: "flat" as "up" | "down" | "flat" };
  try {
    const ratingsPath = join(PAI_DIR, "MEMORY/LEARNING/SIGNALS/ratings.jsonl");
    const lines = readFileSync(ratingsPath, "utf-8").trim().split("\n").filter(Boolean);
    const now = Date.now();
    const day = 86400000;
    const ratings7d: number[] = [];
    const ratings3d: number[] = [];
    let lastRating = 0;

    for (const line of lines) {
      try {
        const evt = JSON.parse(line);
        const ts = new Date(evt.timestamp).getTime();
        const rating = evt.rating || 0;
        lastRating = rating;
        if (now - ts < 7 * day) ratings7d.push(rating);
        if (now - ts < 3 * day) ratings3d.push(rating);
      } catch { /* skip */ }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
    const weekAvg = avg(ratings7d);
    const recentAvg = avg(ratings3d);

    performanceRating = {
      current: lastRating,
      weekAvg,
      trend: recentAvg > weekAvg + 0.5 ? "up" : recentAvg < weekAvg - 0.5 ? "down" : "flat",
    };
  } catch { /* fail-open */ }

  // Wisdom frames count
  let wisdomFramesCount = 0;
  try {
    const framesDir = join(PAI_DIR, "MEMORY/WISDOM/FRAMES");
    wisdomFramesCount = readdirSync(framesDir).filter(f => f.endsWith(".md")).length;
  } catch { /* fail-open */ }

  return {
    wisdomQuotes,
    beliefsCount,
    ideasCount,
    lessonsCount,
    sessionsWeek,
    performanceRating,
    wisdomFramesCount,
  };
}

// ── Fix strategy effectiveness using goal data ──
function fixStrategyEffectiveness(strategies: Strategy[], goals: Goal[]): void {
  for (const s of strategies) {
    if (s.effectiveness !== "unknown") continue;
    // Check if any addressed goals have progress > 0
    const goalRefs = s.addresses.filter(a => a.startsWith("G"));
    const linkedGoals = goals.filter(g => goalRefs.includes(g.id));
    const hasProgress = linkedGoals.some(g => g.progress > 0);
    const hasActive = linkedGoals.some(g => g.status.toLowerCase().includes("активна"));
    if (hasProgress) {
      s.effectiveness = "working";
    } else if (hasActive) {
      s.effectiveness = "partial";
    }
  }
}

// ── Compute mission progress from goals ──
function computeMissionProgress(missions: Mission[], goals: Goal[]): void {
  for (const mission of missions) {
    const linkedGoals = goals.filter(g => mission.linkedGoals.includes(g.id));
    if (linkedGoals.length === 0) {
      mission.progress = 0;
      continue;
    }
    // Weighted average: active/high-priority goals weight 2, others weight 1
    let totalWeight = 0;
    let weightedSum = 0;
    for (const g of linkedGoals) {
      const isActive = g.status.toLowerCase().includes("активна") || g.status.toLowerCase().includes("высокий");
      const weight = isActive ? 2 : 1;
      weightedSum += g.progress * weight;
      totalWeight += weight;
    }
    mission.progress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }
}

// ── Main ──
function main(): void {
  const toStdout = process.argv.includes("--stdout");

  // Read all TELOS files
  const missionContent = readFile(join(TELOS_DIR, "MISSION.md"));
  const goalsContent = readFile(join(TELOS_DIR, "GOALS.md"));
  const challengesContent = readFile(join(TELOS_DIR, "CHALLENGES.md"));
  const strategiesContent = readFile(join(TELOS_DIR, "STRATEGIES.md"));
  const projectsContent = readFile(join(TELOS_DIR, "PROJECTS.md"));
  const statusContent = readFile(join(TELOS_DIR, "STATUS.md"));

  // Parse
  const missions = parseMissions(missionContent);
  const goals = parseGoals(goalsContent);
  const challenges = parseChallenges(challengesContent);
  const strategies = parseStrategies(strategiesContent);
  const projects = parseProjects(projectsContent);
  const capital = parseCapital(strategiesContent);
  const season = calculateSeason();
  const status = parseStatus(statusContent);
  const system = collectSystemHealth();
  const learning = collectLearningMeta();

  // Compute derived data
  computeMissionProgress(missions, goals);
  fixStrategyEffectiveness(strategies, goals);

  const state: TelosState = {
    generated: new Date().toISOString(),
    missions,
    goals,
    challenges,
    strategies,
    projects,
    capital,
    season,
    status,
    system,
    learning,
  };

  const json = JSON.stringify(state, null, 2);

  if (toStdout) {
    console.log(json);
  } else {
    // Atomic write: temp file + rename
    const tmpPath = `${OUTPUT_PATH}.tmp`;
    writeFileSync(tmpPath, json);
    const { renameSync } = require("fs");
    renameSync(tmpPath, OUTPUT_PATH);
    console.error(`TelosParser: wrote ${OUTPUT_PATH} (${json.length} bytes)`);
  }
}

main();
