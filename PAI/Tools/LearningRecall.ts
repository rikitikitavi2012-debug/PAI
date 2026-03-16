#!/usr/bin/env bun
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const STOP_WORDS = new Set([
  "the", "a", "an", "и", "в", "на", "с", "к", "по", "для", "из",
  "что", "как", "это", "не", "от", "is", "of", "to", "for", "with",
]);

const baseDir = process.env.PAI_BASE_DIR || join(process.env.HOME!, ".claude");
const workDir = join(baseDir, "MEMORY/WORK");
const query = process.argv[2] || "";

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-zа-яё0-9\s-]/g, "").split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w)));
}

function extractSection(content: string, heading: string): string {
  const m = content.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, "m"));
  return m ? m[1].trim() : "";
}

function extractTask(prd: string): string {
  const m = prd.match(/^task:\s*"?([^"\n]+)"?/m);
  return m ? m[1].trim() : "";
}

const queryTokens = tokenize(query);
if (queryTokens.size === 0) { console.log("[]"); process.exit(0); }

let dirs: string[] = [];
try { dirs = readdirSync(workDir); } catch { console.log("[]"); process.exit(0); }

type Result = { slug: string; task: string; score: number; reflections: string; patterns: string };
const results: Result[] = [];

for (const slug of dirs) {
  const learnPath = join(workDir, slug, "LEARN.md");
  if (!existsSync(learnPath)) continue;
  let learnContent: string;
  try { learnContent = readFileSync(learnPath, "utf-8"); } catch { continue; }

  let task = "";
  const prdPath = join(workDir, slug, "PRD.md");
  if (existsSync(prdPath)) {
    try { task = extractTask(readFileSync(prdPath, "utf-8")); } catch {}
  }

  const docTokens = tokenize(learnContent + " " + task + " " + slug);
  let score = 0;
  for (const t of queryTokens) if (docTokens.has(t)) score++;

  if (score > 0) {
    results.push({ slug, task, score,
      reflections: extractSection(learnContent, "Reflections"),
      patterns: extractSection(learnContent, "Patterns"),
    });
  }
}

results.sort((a, b) => b.score - a.score);
console.log(JSON.stringify(results.slice(0, 3), null, 2));
