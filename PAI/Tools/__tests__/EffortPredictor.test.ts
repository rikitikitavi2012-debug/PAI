import { describe, it, expect } from "bun:test";
import { join } from "path";

const toolPath = join(__dirname, "..", "EffortPredictor.ts");
const cwd = "/home/ser/.claude";
const VALID_EFFORTS = ["standard", "extended", "advanced", "deep", "comprehensive"];
const VALID_CONFIDENCE = ["high", "medium", "low"];

function run(query: string) {
  const r = Bun.spawnSync(["bun", "run", toolPath, query], { cwd });
  return { stdout: r.stdout.toString(), stderr: r.stderr.toString(), code: r.exitCode };
}

function runJSON(query: string) {
  const { stdout } = run(query);
  return JSON.parse(stdout);
}

describe("EffortPredictor", () => {
  it("outputs valid JSON to stdout", () => {
    const out = runJSON("implement authentication system");
    expect(out).toBeDefined();
    expect(typeof out).toBe("object");
  });

  it("suggested_effort is a valid effort level", () => {
    const out = runJSON("build API endpoint");
    expect(VALID_EFFORTS).toContain(out.suggested_effort);
  });

  it("confidence is high, medium, or low", () => {
    const out = runJSON("refactor database layer");
    expect(VALID_CONFIDENCE).toContain(out.confidence);
  });

  it("similar_tasks is a number >= 0", () => {
    const out = runJSON("deploy new service");
    expect(typeof out.similar_tasks).toBe("number");
    expect(out.similar_tasks).toBeGreaterThanOrEqual(0);
  });

  it("handles unknown/unusual query without crashing", () => {
    const out = runJSON("xyzzy foobarbaz qqq");
    expect(VALID_EFFORTS).toContain(out.suggested_effort);
    expect(out.similar_tasks).toBe(0);
  });

  it("handles Russian query text", () => {
    const out = runJSON("интеграция Яндекс Директ рекламы");
    expect(VALID_EFFORTS).toContain(out.suggested_effort);
    expect(VALID_CONFIDENCE).toContain(out.confidence);
    expect(typeof out.similar_tasks).toBe("number");
  });

  it("exits with error when no query provided", () => {
    const r = Bun.spawnSync(["bun", "run", toolPath], { cwd });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("Usage");
  });
});
