#!/usr/bin/env bun
/**
 * ============================================================================
 * BRIGADE PIPELINE — Automated content orchestrator for timber-frame-site
 * ============================================================================
 *
 * Runs 6 sequential waves (parallel inside) to produce a blog article:
 *   Wave 1: Research (Gemini + OpenCode in parallel)
 *   Wave 2: Content (A0 writes article)
 *   Wave 3: Images (v1: placeholder extraction only)
 *   Wave 4: Build + Deploy (npm build, git push)
 *   Wave 5: Review (OpenCode SEO audit)
 *   Wave 6: Verify (print URL for manual check)
 *
 * USAGE:
 *   bun BrigadePipeline.ts \
 *     --topic "7 ошибок строительства террас в СПб" \
 *     --slug "oshibki-stroitelstva-terrasy-spb" \
 *     --keywords "ошибки строительства террасы спб,фундамент террасы спб" \
 *     --skip-images
 *
 * ============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { spawnSync } from "child_process";

// ─── Config ────────────────────────────────────────────────────────

const HOME = process.env.HOME || "/home/ser";
const PAI_TOOLS = join(HOME, ".claude", "PAI", "Tools");
const SITE_DIR = join(HOME, "projects", "timber-frame-site");
const BLOG_DIR = join(SITE_DIR, "docs", "content", "blog");
const EVENTS_PATH = join(HOME, ".claude", "MEMORY", "STATE", "events.jsonl");

const A0_BASE_URL = process.env.A0_BASE_URL || "http://72.56.86.51:50002";
const A0_POLL_INTERVAL = 15_000; // 15 sec
const A0_TIMEOUT = 300_000; // 5 min

interface PipelineArgs {
  topic: string;
  slug: string;
  keywords: string[];
  skipImages: boolean;
}

interface KeywordBrief {
  keywords: { word: string; freq: string }[];
  competitors: string[];
  gaps: string[];
  seoFindings: string[];
}

interface ReviewResult {
  score: number;
  findings: { severity: string; message: string; fix: string }[];
}

interface PipelineLog {
  topic: string;
  slug: string;
  startedAt: string;
  waves: Record<string, { status: string; durationMs: number; error?: string }>;
  completedAt?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function loadA0Token(): string {
  let token = process.env.A0_API_TOKEN || "";
  if (!token) {
    try {
      const env = readFileSync(join(HOME, ".config", "PAI", ".env"), "utf-8");
      const m = env.match(/^A0_API_TOKEN=(.+)$/m);
      if (m) token = m[1].trim();
    } catch {}
  }
  if (!token) throw new Error("No A0_API_TOKEN found");
  return token;
}

function emitEvent(type: string, data: Record<string, unknown>): void {
  try {
    const dir = dirname(EVENTS_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const event = {
      type: `brigade.${type}`,
      source: "BrigadePipeline",
      data,
      timestamp: new Date().toISOString(),
    };
    appendFileSync(EVENTS_PATH, JSON.stringify(event) + "\n", "utf-8");
  } catch {}
}

function log(emoji: string, msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${emoji} ${msg}`);
}

function runCmd(cmd: string, args: string[], opts?: { cwd?: string; timeout?: number }): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync(cmd, args, {
    cwd: opts?.cwd || SITE_DIR,
    encoding: "utf-8",
    timeout: opts?.timeout || 120_000,
    env: { ...process.env, PATH: process.env.PATH },
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

async function a0Message(message: string, timeout = A0_TIMEOUT): Promise<string> {
  const token = loadA0Token();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${A0_BASE_URL}/api_message`, {
      method: "POST",
      headers: { "X-API-KEY": token, "Content-Type": "application/json" },
      body: JSON.stringify({ message, lifetime_hours: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`A0 HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    // Parse §§include references
    let response = data.response || "";
    response = response.replace(/§§include\([^)]+\)/g, "[A0: large output saved on container]");
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") throw new Error(`A0 timeout after ${timeout}ms`);
    throw err;
  }
}

function runInference(level: string, systemPrompt: string, userPrompt: string, expectJson = false): string {
  const args = ["run", join(PAI_TOOLS, "Inference.ts"), "--level", level];
  if (expectJson) args.push("--json");
  args.push(systemPrompt, userPrompt);

  const result = spawnSync("bun", args, {
    encoding: "utf-8",
    timeout: 60_000,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Inference ${level} failed: ${result.stderr || result.stdout}`);
  }
  return (result.stdout || "").trim();
}

function runOpenCode(task: string, timeout = 120_000): string {
  const result = spawnSync("opencode", ["run", "--dir", SITE_DIR, task], {
    encoding: "utf-8",
    timeout,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`OpenCode failed: ${(result.stderr || result.stdout).slice(0, 500)}`);
  }
  return (result.stdout || "").trim();
}

/** Validate internal links: no mixed cyrillic/latin in URL paths */
function validateLinks(content: string): string[] {
  const issues: string[] = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    if (!url.startsWith("/")) continue;
    // Check for mixed scripts in path
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(url);
    const hasLatin = /[a-zA-Z]/.test(url);
    if (hasCyrillic && hasLatin) {
      issues.push(`Mixed cyrillic/latin in link: ${url}`);
    }
  }
  return issues;
}

// ─── Waves ─────────────────────────────────────────────────────────

async function wave1Research(args: PipelineArgs): Promise<KeywordBrief> {
  log("🔍", "Wave 1: Research (Gemini + OpenCode parallel)");

  const [geminiResult, openCodeResult] = await Promise.allSettled([
    // Gemini: competitor analysis
    (async () => {
      log("🔍", "  Gemini → конкурентный анализ...");
      const systemPrompt = `Ты SEO-аналитик для строительства деревянных террас в СПб. Отвечай на русском. Верни JSON.`;
      const userPrompt = `Проанализируй конкурентов по теме "${args.topic}".
Ключевые слова: ${args.keywords.join(", ")}

Верни JSON:
{
  "keywords": [{"word": "ключевое слово", "freq": "high/medium/low"}],
  "competitors": ["url1", "url2"],
  "gaps": ["тема которую конкуренты не раскрыли"]
}

Фокус на СПб рынок, деревянные террасы из клеёного бруса. Минимум 10 keywords, 3 competitors, 5 gaps.`;

      return runInference("gemini", systemPrompt, userPrompt, true);
    })(),

    // OpenCode: SEO audit of existing blog
    (async () => {
      log("🔍", "  OpenCode → SEO-аудит блога...");
      return runOpenCode(
        `Проведи краткий SEO-аудит блога в docs/content/blog/. Проверь: frontmatter (title, description, keywords), внутренние ссылки, мета-теги. Верни краткий список находок в формате JSON массива строк. Только факты, без рекомендаций. Результат выведи в stdout как JSON.`
      );
    })(),
  ]);

  const brief: KeywordBrief = {
    keywords: args.keywords.map((w) => ({ word: w, freq: "high" })),
    competitors: [],
    gaps: [],
    seoFindings: [],
  };

  // Merge Gemini results
  if (geminiResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(geminiResult.value);
      if (parsed.keywords) brief.keywords = parsed.keywords;
      if (parsed.competitors) brief.competitors = parsed.competitors;
      if (parsed.gaps) brief.gaps = parsed.gaps;
      log("🔍", `  Gemini: ${brief.keywords.length} keywords, ${brief.gaps.length} gaps`);
    } catch {
      log("🔍", "  Gemini: результат не JSON, используем ключевые слова из CLI");
    }
  } else {
    log("🔍", `  Gemini ошибка: ${(geminiResult as PromiseRejectedResult).reason?.message || "unknown"}`);
  }

  // Merge OpenCode results
  if (openCodeResult.status === "fulfilled") {
    try {
      const jsonMatch = openCodeResult.value.match(/\[[\s\S]*?\]/);
      if (jsonMatch) brief.seoFindings = JSON.parse(jsonMatch[0]);
      log("🔍", `  OpenCode: ${brief.seoFindings.length} SEO findings`);
    } catch {
      log("🔍", "  OpenCode: результат не JSON");
    }
  } else {
    log("🔍", `  OpenCode ошибка: ${(openCodeResult as PromiseRejectedResult).reason?.message || "unknown"}`);
  }

  return brief;
}

async function wave2Content(args: PipelineArgs, brief: KeywordBrief): Promise<string> {
  log("✍️", "Wave 2: Content (A0 async)");

  const keywordList = brief.keywords.map((k) => `- ${k.word} (${k.freq})`).join("\n");
  const gapList = brief.gaps.length > 0 ? brief.gaps.map((g) => `- ${g}`).join("\n") : "- нет данных";

  const prompt = `Напиши SEO-статью для блога timber-frame-spb.ru.

ТЕМА: ${args.topic}
SLUG: ${args.slug}

КЛЮЧЕВЫЕ СЛОВА (обязательно использовать в тексте):
${keywordList}

ПРОБЕЛЫ КОНКУРЕНТОВ (раскрой эти темы):
${gapList}

ТРЕБОВАНИЯ К ФОРМАТУ:
1. Начни с frontmatter в формате YAML:
---
title: "Заголовок статьи"
description: "Мета-описание 150-160 символов"
slug: "${args.slug}"
persona: "homeowner"
keywords: [${args.keywords.map((k) => `"${k}"`).join(", ")}]
cta: "Рассчитать стоимость террасы"
word_count: ЧИСЛО
date: "${new Date().toISOString().split("T")[0]}"
---

2. Структура: H2 заголовки, списки, 1500-2500 слов
3. Язык: русский, профессиональный но доступный
4. Упоминай Timber Frame СПб как экспертов
5. Внутренние ссылки (обязательно): /kalkulyator, /blog, /tekhnologiya, /kontakty
6. Где уместно, добавь <!-- IMAGE: описание картинки --> плейсхолдеры
7. CTA в конце: призыв к расчёту стоимости

ВАЖНО: Все URL-пути только латиницей. Никакой смешанной кириллицы/латиницы в ссылках.

Верни ТОЛЬКО markdown статьи с frontmatter. Без пояснений.`;

  log("✍️", "  Отправляю задачу A0...");
  const response = await a0Message(prompt, A0_TIMEOUT);

  if (!response || response.length < 200) {
    throw new Error(`A0 вернул слишком короткий ответ (${response.length} символов)`);
  }

  // Extract markdown (strip any wrapper text A0 might add)
  let article = response;
  const fmMatch = response.indexOf("---");
  if (fmMatch > 0 && fmMatch < 200) {
    article = response.slice(fmMatch);
  }

  // Validate links
  const linkIssues = validateLinks(article);
  if (linkIssues.length > 0) {
    log("✍️", `  ⚠️ Найдены проблемы со ссылками:`);
    linkIssues.forEach((i) => log("✍️", `    - ${i}`));
  }

  // Save article
  if (!existsSync(BLOG_DIR)) mkdirSync(BLOG_DIR, { recursive: true });
  const filePath = join(BLOG_DIR, `${args.slug}.md`);
  writeFileSync(filePath, article, "utf-8");
  log("✍️", `  Статья сохранена: docs/content/blog/${args.slug}.md (${article.length} символов)`);

  return filePath;
}

function wave3Images(articlePath: string): string[] {
  log("🎨", "Wave 3: Images (v1 — извлечение плейсхолдеров)");

  const content = readFileSync(articlePath, "utf-8");
  const placeholders: string[] = [];
  const regex = /<!--\s*IMAGE:\s*(.+?)\s*-->/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    placeholders.push(match[1].trim());
  }

  if (placeholders.length === 0) {
    log("🎨", "  Плейсхолдеров не найдено");
  } else {
    log("🎨", `  Найдено ${placeholders.length} плейсхолдеров:`);
    placeholders.forEach((p, i) => log("🎨", `    ${i + 1}. ${p}`));
  }

  return placeholders;
}

async function wave4Deploy(args: PipelineArgs, articlePath: string): Promise<boolean> {
  log("🚀", "Wave 4: Build + Deploy");

  // npm run build
  log("🚀", "  npm run build...");
  const build = runCmd("npm", ["run", "build"], { timeout: 180_000 });
  if (!build.ok) {
    log("🚀", `  ❌ Build failed: ${build.stderr.slice(0, 300)}`);
    throw new Error(`Build failed: ${build.stderr.slice(0, 300)}`);
  }
  log("🚀", "  ✅ Build успешен");

  // git add + commit + push
  log("🚀", "  git push...");
  const relPath = `docs/content/blog/${args.slug}.md`;
  runCmd("git", ["add", relPath]);
  const commit = runCmd("git", ["commit", "-m", `feat(blog): add ${args.slug}`]);
  if (!commit.ok && !commit.stderr.includes("nothing to commit")) {
    log("🚀", `  ⚠️ Commit: ${commit.stderr}`);
  }

  const push = runCmd("git", ["push", "origin", "main"], { timeout: 30_000 });
  if (!push.ok) {
    log("🚀", `  ❌ Push failed: ${push.stderr.slice(0, 200)}`);
    throw new Error(`Push failed: ${push.stderr}`);
  }
  log("🚀", "  ✅ Pushed to origin/main");

  // Wait for Vercel
  log("🚀", "  Ждём Vercel deploy (45 сек)...");
  await new Promise((r) => setTimeout(r, 45_000));
  log("🚀", "  ✅ Deploy (предположительно) завершён");

  return true;
}

async function wave5Review(args: PipelineArgs): Promise<ReviewResult> {
  log("📋", "Wave 5: Review (OpenCode SEO audit)");

  const result: ReviewResult = { score: 0, findings: [] };

  try {
    const output = runOpenCode(
      `Проведи SEO-аудит статьи docs/content/blog/${args.slug}.md. Проверь:
1. Frontmatter: title (<60 символов), description (150-160), keywords, date, slug
2. Внутренние ссылки на /kalkulyator, /blog, /tekhnologiya, /kontakty
3. Структура: H2 заголовки, длина 1500-2500 слов
4. Мета: alt у изображений, JSON-LD schema
5. Ключевые слова в первом абзаце и H2

Верни JSON:
{"score": 0-100, "findings": [{"severity": "high|medium|low", "message": "что не так", "fix": "как исправить"}]}`,
      120_000
    );

    const jsonMatch = output.match(/\{[\s\S]*"findings"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      result.score = parsed.score || 0;
      result.findings = parsed.findings || [];
    }
    log("📋", `  Score: ${result.score}/100, findings: ${result.findings.length}`);
    result.findings
      .filter((f) => f.severity === "high")
      .forEach((f) => log("📋", `  ❗ ${f.message}`));
  } catch (err: any) {
    log("📋", `  ⚠️ Review failed: ${err.message}`);
    result.findings.push({ severity: "low", message: "Review failed", fix: "Run manually" });
  }

  return result;
}

function wave6Verify(args: PipelineArgs): void {
  log("✅", "Wave 6: Verify");
  log("✅", `  URL: https://timber-frame-spb.ru/blog/${args.slug}`);
  log("✅", "  Проверь вручную или через Browser agent в следующей сессии");
}

// ─── Pipeline orchestrator ─────────────────────────────────────────

async function runWave<T>(
  name: string,
  pipelineLog: PipelineLog,
  fn: () => Promise<T> | T
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    pipelineLog.waves[name] = { status: "ok", durationMs: Date.now() - start };
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    pipelineLog.waves[name] = { status: "failed", durationMs, error: err.message };
    log("❌", `${name} failed: ${err.message}`);
    log("❌", `  Продолжаю следующие волны (skip/retry вручную)`);
    return null;
  }
}

async function main() {
  // Parse CLI args
  const argv = process.argv.slice(2);
  const args: PipelineArgs = {
    topic: "",
    slug: "",
    keywords: [],
    skipImages: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--topic":
        args.topic = argv[++i];
        break;
      case "--slug":
        args.slug = argv[++i];
        break;
      case "--keywords":
        args.keywords = argv[++i].split(",").map((k) => k.trim());
        break;
      case "--skip-images":
        args.skipImages = true;
        break;
      default:
        console.error(`Unknown arg: ${argv[i]}`);
        process.exit(1);
    }
  }

  if (!args.topic || !args.slug) {
    console.error(`Usage: bun BrigadePipeline.ts \\
  --topic "Тема статьи" \\
  --slug "url-slug" \\
  --keywords "kw1,kw2,kw3" \\
  --skip-images`);
    process.exit(1);
  }

  if (args.keywords.length === 0) {
    args.keywords = [args.topic];
  }

  // Init pipeline log
  const pipelineLog: PipelineLog = {
    topic: args.topic,
    slug: args.slug,
    startedAt: new Date().toISOString(),
    waves: {},
  };

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  BRIGADE PIPELINE — Content Orchestrator`);
  console.log(`  Topic: ${args.topic}`);
  console.log(`  Slug:  ${args.slug}`);
  console.log(`${"═".repeat(60)}\n`);

  emitEvent("pipeline_start", { topic: args.topic, slug: args.slug });

  // Wave 1: Research
  const brief = await runWave("wave1_research", pipelineLog, () => wave1Research(args));

  // Wave 2: Content
  const articlePath = await runWave("wave2_content", pipelineLog, () =>
    wave2Content(args, brief || { keywords: args.keywords.map((w) => ({ word: w, freq: "high" })), competitors: [], gaps: [], seoFindings: [] })
  );

  // Wave 3: Images
  if (articlePath) {
    await runWave("wave3_images", pipelineLog, () => wave3Images(articlePath));
  }

  // Wave 4: Build + Deploy
  if (articlePath) {
    await runWave("wave4_deploy", pipelineLog, () => wave4Deploy(args, articlePath));
  } else {
    log("🚀", "Wave 4: SKIP (нет статьи для деплоя)");
    pipelineLog.waves["wave4_deploy"] = { status: "skipped", durationMs: 0 };
  }

  // Wave 5: Review
  if (articlePath) {
    const review = await runWave("wave5_review", pipelineLog, () => wave5Review(args));
    if (review) {
      // Save review
      const reviewPath = join(SITE_DIR, "docs", `review-${args.slug}.json`);
      writeFileSync(reviewPath, JSON.stringify(review, null, 2), "utf-8");
      log("📋", `  Review сохранён: docs/review-${args.slug}.json`);
    }
  }

  // Wave 6: Verify
  wave6Verify(args);

  // Save pipeline log
  pipelineLog.completedAt = new Date().toISOString();
  const logPath = join(SITE_DIR, "docs", "pipeline-log.json");
  writeFileSync(logPath, JSON.stringify(pipelineLog, null, 2), "utf-8");
  log("📄", `Pipeline log: docs/pipeline-log.json`);

  emitEvent("pipeline_complete", {
    topic: args.topic,
    slug: args.slug,
    waves: Object.fromEntries(
      Object.entries(pipelineLog.waves).map(([k, v]) => [k, v.status])
    ),
  });

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("  РЕЗУЛЬТАТ:");
  for (const [wave, info] of Object.entries(pipelineLog.waves)) {
    const icon = info.status === "ok" ? "✅" : info.status === "skipped" ? "⏭️" : "❌";
    const dur = info.durationMs > 0 ? ` (${(info.durationMs / 1000).toFixed(1)}s)` : "";
    console.log(`  ${icon} ${wave}: ${info.status}${dur}`);
  }
  console.log(`${"═".repeat(60)}\n`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`❌ Pipeline fatal: ${err.message}`);
    process.exit(1);
  });
}
