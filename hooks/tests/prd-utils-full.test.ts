import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// 1. Setup the temporary directory
const tempDir = join(tmpdir(), `pai-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
mkdirSync(tempDir, { recursive: true });

// 2. Set environment variable immediately so ANY subsequent static evaluation gets it
process.env.PAI_DIR = tempDir;

// We cannot rely purely on mock.module and hoisted imports when the environment
// wasn't set *before* bun test invoked the file if paths is already resolved or cached by other files.
// However, since paths relies on `process.env.PAI_DIR` AT EVALUATION TIME,
// if we import it dynamically after setting process.env, it should work.

describe("prd-utils", () => {
  let findLatestPRD: any, parseFrontmatter: any, writeFrontmatterField: any, countCriteria: any, parseCriteriaList: any, readRegistry: any, writeRegistry: any, syncToWorkJson: any, updateSessionNameInWorkJson: any, upsertSession: any, WORK_DIR: any, WORK_JSON: any;

  beforeAll(async () => {
    // Dynamic import to ensure process.env.PAI_DIR is used during evaluation
    const prdUtils = await import("../lib/prd-utils");

    findLatestPRD = prdUtils.findLatestPRD;
    parseFrontmatter = prdUtils.parseFrontmatter;
    writeFrontmatterField = prdUtils.writeFrontmatterField;
    countCriteria = prdUtils.countCriteria;
    parseCriteriaList = prdUtils.parseCriteriaList;
    readRegistry = prdUtils.readRegistry;
    writeRegistry = prdUtils.writeRegistry;
    syncToWorkJson = prdUtils.syncToWorkJson;
    updateSessionNameInWorkJson = prdUtils.updateSessionNameInWorkJson;
    upsertSession = prdUtils.upsertSession;
    WORK_DIR = prdUtils.WORK_DIR;
    WORK_JSON = prdUtils.WORK_JSON;

    // Ensure WORK_DIR and WORK_JSON point to tempDir. If they don't, throw an error to prevent running.
    if (!WORK_DIR.includes(tempDir) || !WORK_JSON.includes(tempDir)) {
      throw new Error(`CRITICAL: Static paths did not resolve to tempDir!
        tempDir: ${tempDir}
        WORK_DIR: ${WORK_DIR}
        WORK_JSON: ${WORK_JSON}
      `);
    }

    mkdirSync(join(tempDir, "MEMORY", "WORK"), { recursive: true });
    mkdirSync(join(tempDir, "MEMORY", "STATE"), { recursive: true });
  });

  afterAll(() => {
    // Safely cleanup only the temporary directory
    if (tempDir.includes('pai-test')) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Scenario 1: findLatestPRD()
  test("findLatestPRD() returns the PRD with the latest mtime", () => {
    mkdirSync(join(WORK_DIR, "session1"), { recursive: true });
    mkdirSync(join(WORK_DIR, "session2"), { recursive: true });

    const prd1 = join(WORK_DIR, "session1", "PRD.md");
    const prd2 = join(WORK_DIR, "session2", "PRD.md");

    writeFileSync(prd1, "content1");
    writeFileSync(prd2, "content2");

    const now = Date.now() / 1000;
    utimesSync(prd1, now - 10, now - 10);
    utimesSync(prd2, now, now);

    const latest = findLatestPRD();
    expect(latest).toBe(prd2);
  });

  test("findLatestPRD() returns null if MEMORY/WORK does not exist", () => {
    rmSync(WORK_DIR, { recursive: true, force: true });
    expect(findLatestPRD()).toBeNull();
    mkdirSync(WORK_DIR, { recursive: true });
  });

  // Scenario 2: parseFrontmatter()
  test("parseFrontmatter() extracts 8 required fields", () => {
    const content = `---
task: Build a new feature
slug: feature-123
effort: standard
phase: observe
progress: 1/5
mode: autoresearch
started: 2023-10-01T12:00:00Z
updated: 2023-10-01T12:05:00Z
---
# PRD Document`;
    const fm = parseFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm?.task).toBe("Build a new feature");
    expect(fm?.slug).toBe("feature-123");
    expect(fm?.effort).toBe("standard");
    expect(fm?.phase).toBe("observe");
    expect(fm?.progress).toBe("1/5");
    expect(fm?.mode).toBe("autoresearch");
    expect(fm?.started).toBe("2023-10-01T12:00:00Z");
    expect(fm?.updated).toBe("2023-10-01T12:05:00Z");
  });

  // Scenario 3: writeFrontmatterField() updates existing field
  test("writeFrontmatterField() updates an existing field", () => {
    const content = `---
task: Old Task
phase: observe
---
# Content`;
    const updated = writeFrontmatterField(content, "phase", "think");
    expect(updated).toContain("phase: think");
    expect(updated).not.toContain("phase: observe");
    expect(updated).toContain("task: Old Task");
  });

  // Scenario 4: writeFrontmatterField() adds a new field
  test("writeFrontmatterField() adds a new field if it does not exist", () => {
    const content = `---
task: Some Task
---
# Content`;
    const updated = writeFrontmatterField(content, "phase", "observe");
    expect(updated).toContain("phase: observe");
    expect(updated).toContain("task: Some Task");
  });

  // Scenario 5: countCriteria()
  test("countCriteria() correctly counts checked and unchecked checkboxes", () => {
    const content = `
## Context
Some context here.

## Criteria
- [x] Task 1
- [ ] Task 2
- [x] Task 3
- [ ] Task 4

## Other Section
- [x] Should not count this`;
    const counts = countCriteria(content);
    expect(counts.checked).toBe(2);
    expect(counts.total).toBe(4);
  });

  // Scenario 6: syncToWorkJson()
  test("syncToWorkJson() creates or updates a record in work.json", () => {
    const fm = {
      slug: "test-slug",
      task: "Test Task",
      phase: "think",
      progress: "1/2"
    };
    const prdPath = join(WORK_DIR, "test-slug", "PRD.md");

    if (existsSync(WORK_JSON)) rmSync(WORK_JSON);

    syncToWorkJson(fm, prdPath);

    const registry = readRegistry();
    expect(registry.sessions["test-slug"]).toBeDefined();
    expect(registry.sessions["test-slug"].task).toBe("Test Task");
    expect(registry.sessions["test-slug"].phase).toBe("think");
    expect(registry.sessions["test-slug"].progress).toBe("1/2");
  });

  // Scenario 7: readRegistry() handles missing work.json
  test("readRegistry() returns an empty sessions object if work.json does not exist", () => {
    if (existsSync(WORK_JSON)) rmSync(WORK_JSON);
    const registry = readRegistry();
    expect(registry).toEqual({ sessions: {} });
  });

  // parseCriteriaList()
  test("parseCriteriaList() extracts criteria correctly", () => {
    const content = `
## Criteria
- [x] ISC-1: Completed item
- [ ] ISC-A-2: Anti-criterion
---`;
    const criteria = parseCriteriaList(content);
    expect(criteria.length).toBe(2);

    expect(criteria[0].id).toBe("ISC-1");
    expect(criteria[0].description).toBe("Completed item");
    expect(criteria[0].type).toBe("criterion");
    expect(criteria[0].status).toBe("completed");

    expect(criteria[1].id).toBe("ISC-A-2");
    expect(criteria[1].description).toBe("Anti-criterion");
    expect(criteria[1].type).toBe("anti-criterion");
    expect(criteria[1].status).toBe("pending");
  });

  test("upsertSession() adds a native session", () => {
    if (existsSync(WORK_JSON)) rmSync(WORK_JSON);

    upsertSession("uuid-1", "Test Session", "Do something", "native");
    const registry = readRegistry();
    const slugs = Object.keys(registry.sessions);
    expect(slugs.length).toBe(1);

    const session = registry.sessions[slugs[0]];
    expect(session.sessionUUID).toBe("uuid-1");
    expect(session.task).toBe("Do something");
    expect(session.mode).toBe("native");
  });

  test("updateSessionNameInWorkJson() updates the most recent non-complete session", async () => {
    if (existsSync(WORK_JSON)) rmSync(WORK_JSON);

    // First session
    upsertSession("uuid-2", "Old Name", "Task 1", "native");
    const registry = readRegistry();
    const firstSlug = Object.keys(registry.sessions)[0];

    const reg2 = readRegistry();
    reg2.sessions[firstSlug].updatedAt = new Date(Date.now() - 5000).toISOString();
    // Move it to "autoresearch" mode so upsertSession doesn't just bump it, but creates a new one
    reg2.sessions[firstSlug].mode = "autoresearch";
    writeRegistry(reg2);

    await new Promise(r => setTimeout(r, 100));

    // Second session
    upsertSession("uuid-2", "Old Name", "Task 2", "native");

    const reg3 = readRegistry();
    const slugs = Object.keys(reg3.sessions);
    expect(slugs.length).toBe(2);

    const secondSlug = slugs.find(s => s !== firstSlug)!;

    // Complete first one to ensure we only update the active one
    reg3.sessions[firstSlug].phase = "complete";
    reg3.sessions[secondSlug].updatedAt = new Date(Date.now() + 1000).toISOString();
    writeRegistry(reg3);

    updateSessionNameInWorkJson("uuid-2", "New Name");

    const finalReg = readRegistry();
    expect(finalReg.sessions[firstSlug].sessionName).toBe("Old Name");
    expect(finalReg.sessions[secondSlug].sessionName).toBe("New Name");
  });
});
