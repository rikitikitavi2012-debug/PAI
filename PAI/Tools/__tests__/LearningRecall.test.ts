import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawnSync } from "bun";

const TOOL_PATH = join(import.meta.dir, "../LearningRecall.ts");

function run(query: string, baseDir: string) {
  const result = spawnSync(["bun", TOOL_PATH, query], {
    env: { ...process.env, PAI_BASE_DIR: baseDir },
  });
  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();
  if (!stdout) return [];
  return JSON.parse(stdout);
}

describe("LearningRecall", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "learning-recall-"));

    // Create 3 work directories with LEARN.md + PRD.md
    const dirs = [
      {
        slug: "20260316-070000_skill-audit-ru-localization",
        task: "Audit 10 skills add Russian triggers and voice",
        learn: `## Reflections
- Parallel agents reduced execution from 5min to 1.5min
- Skill audit methodology works well for batch edits

## Patterns
- RU localization pattern: append Russian triggers to USE WHEN
- Skill audit methodology: read all SKILL.md, build matrix, parallel agents`,
      },
      {
        slug: "20260316-040000_algorithm-hardening-gaps",
        task: "Find and fix gaps in algorithm v4 hardening specs",
        learn: `## Reflections
- Find real problems prompt produces better gap analysis
- Inline spec additions avoid cognitive overload
- 17 fixes in one pass is efficient for spec work

## Patterns
- Gap analysis hardening cycle: stress-test first, catalog gaps, batch-fix specs
- Noise calibration and discrete tolerance are complementary
- Domain-aware stagnation prevents dangerous amplification`,
      },
      {
        slug: "20260316-030000_hooks-dual-q-optimization",
        task: "Optimize hooks queue with dual-queue architecture for testing",
        learn: `## Reflections
- Dual queue architecture separates fast hooks from slow hooks
- Testing hooks in isolation requires mock event bus

## Patterns
- Hook testing pattern: inject mock events, assert side effects
- Queue optimization: fast path for critical hooks, slow path for analytics`,
      },
    ];

    for (const d of dirs) {
      const dir = join(tmpDir, "MEMORY/WORK", d.slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "PRD.md"),
        `---\ntask: "${d.task}"\nslug: ${d.slug}\n---\n\n## Context\nSome context here.`
      );
      writeFileSync(join(dir, "LEARN.md"), d.learn);
    }

    // Create a work dir with PRD but NO LEARN.md (should be skipped gracefully)
    const noLearnDir = join(tmpDir, "MEMORY/WORK/20260316-090000_no-learn");
    mkdirSync(noLearnDir, { recursive: true });
    writeFileSync(
      join(noLearnDir, "PRD.md"),
      `---\ntask: "Task with no learn file"\nslug: 20260316-090000_no-learn\n---\n`
    );
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns JSON array to stdout", () => {
    const result = run("skill audit localization", tmpDir);
    expect(Array.isArray(result)).toBe(true);
  });

  test("returns top matches scored by keyword overlap", () => {
    const result = run("skill audit localization", tmpDir);
    expect(result.length).toBeGreaterThan(0);
    // First result should be the skill-audit one (most keyword overlap)
    expect(result[0].slug).toContain("skill-audit");
    expect(result[0].score).toBeGreaterThan(0);
  });

  test("each result has required fields", () => {
    const result = run("algorithm hooks testing", tmpDir);
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r).toHaveProperty("slug");
      expect(r).toHaveProperty("task");
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("reflections");
      expect(r).toHaveProperty("patterns");
    }
  });

  test("returns max 3 results", () => {
    const result = run("skill audit algorithm hooks testing optimization localization", tmpDir);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  test("filters out zero-score results", () => {
    const result = run("zzzzunmatchablezzzzz", tmpDir);
    expect(result).toEqual([]);
  });

  test("handles missing LEARN.md gracefully", () => {
    // Should not crash even though one dir has no LEARN.md
    const result = run("task with no learn file", tmpDir);
    expect(Array.isArray(result)).toBe(true);
  });

  test("stop words are excluded from scoring", () => {
    // "the a an" are stop words — should match nothing
    const result = run("the a an", tmpDir);
    expect(result).toEqual([]);
  });

  test("extracts reflections and patterns sections", () => {
    const result = run("algorithm hardening gaps", tmpDir);
    const match = result.find((r: any) => r.slug.includes("algorithm-hardening"));
    expect(match).toBeDefined();
    expect(match.reflections).toContain("gap analysis");
    expect(match.patterns).toContain("Gap analysis");
  });
});
