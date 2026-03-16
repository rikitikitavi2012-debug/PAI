import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("PAI/Algorithm/v4.0-alpha.md Mid-session downshift mechanism", () => {
  const filePath = join(import.meta.dir, "../v4.0-alpha.md");
  const content = readFileSync(filePath, "utf-8");

  test("1. The downshift table exists with 4 rows", () => {
    expect(content).toContain("| < 8 | NATIVE | Skip remaining phases, output NATIVE format |");
    expect(content).toContain("| 8–15 | Standard | Continue Algorithm but at Standard budget |");
    expect(content).toContain("| 16–23 | Extended | Continue Algorithm but at Extended budget |");
    expect(content).toContain("| Meets current floor | No downshift | Proceed normally |");
  });

  test("2. The mechanism section describes voice announcement, PRD preservation, effort frontmatter update", () => {
    // Voice announcement
    expect(content).toMatch(/Voice:\s+`"Задача проще чем казалось\. Downshift в \[TIER\]\."`/);
    // PRD preservation
    expect(content).toContain("PRD stays (context preserved)");
    // Effort frontmatter update
    expect(content).toContain("update frontmatter `effort:` to new tier");
  });

  test("3. Anti-gaming clause exists", () => {
    const antiGamingSectionMatch = content.match(/\*\*Anti-gaming:\*\*\s+Same as escape hatch — LEARN Track 1 logs every downshift with justification\. If downshift rate exceeds 30% across 20\+ sessions/);
    expect(antiGamingSectionMatch).not.toBeNull();
  });

  test("4. Condition clause exists", () => {
    const conditionSectionMatch = content.match(/\*\*Condition:\*\*.*The Splitting Test must have been applied\./);
    expect(conditionSectionMatch).not.toBeNull();
  });

  test("5. Downshift to NATIVE includes skip THINK/PLAN/BUILD, go direct to EXECUTE", () => {
    const nativeMatch = content.match(/If downshifting to NATIVE: complete PRD with existing ISC, skip THINK\/PLAN\/BUILD, go direct to EXECUTE/);
    expect(nativeMatch).not.toBeNull();
  });
});
