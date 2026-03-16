import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("PAI/Algorithm/v4.0-alpha.md completeness", () => {
  const filePath = join(import.meta.dir, "../v4.0-alpha.md");
  const content = readFileSync(filePath, "utf-8");

  test("1. Contains all 7 phases plus CYCLE SELECTOR", () => {
    const phases = [
      "━━━ 👁️ OBSERVE ━━━ 1/7",
      "━━━ 🧠 THINK ━━━ 2/7",
      "━━━ 📋 PLAN ━━━ 3/7",
      "━━━ 🔀 CYCLE SELECTOR ━━━ 3.5/7",
      "━━━ 🔨 BUILD ━━━ 4/7",
      "━━━ ⚡ EXECUTE ━━━ 5/7",
      "━━━ ✅ VERIFY ━━━ 6/7",
      "━━━ 📚 LEARN ━━━ 7/7",
    ];
    for (const phase of phases) {
      expect(content).toContain(phase);
    }
  });

  test("2. Each phase has a FIRST ACTION instruction", () => {
    // There are 8 occurrences because Cycle Selector also has one conceptually
    const matches = content.match(/\*\*FIRST ACTION:\*\*/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(8);
  });

  test("3. Contains Effort Levels table with 5 tiers", () => {
    const tiers = [
      "| **Standard** |",
      "| **Extended** |",
      "| **Advanced** |",
      "| **Deep** |",
      "| **Comprehensive** |",
    ];
    for (const tier of tiers) {
      expect(content).toContain(tier);
    }
  });

  test("4. Contains ISC Decomposition Methodology section", () => {
    expect(content).toContain("### ISC Decomposition Methodology");
  });

  test("5. Contains Splitting Test (4 tests)", () => {
    expect(content).toContain("**The Splitting Test — apply to EVERY criterion before finalizing:**");
    expect(content).toContain("1. **\"And\" / \"With\" test**:");
    expect(content).toContain("2. **Independent failure test**:");
    expect(content).toContain("3. **Scope word test**:");
    expect(content).toContain("4. **Domain boundary test**:");
  });

  test("6. Contains Critical Rules section", () => {
    expect(content).toContain("### Critical Rules (Zero Exceptions)");
  });

  test("7. Contains Context Recovery section", () => {
    expect(content).toContain("### Context Recovery");
  });

  test("8. Contains PRD.md Format section", () => {
    expect(content).toContain("### PRD.md Format");
  });

  test("9. Contains PERSIST LEARNINGS (MANDATORY) in LEARN phase", () => {
    expect(content).toContain("**PERSIST LEARNINGS (MANDATORY");
  });

  test("10. Contains Iteration Budget table", () => {
    expect(content).toContain("### Iteration Budget (Autoresearch)");
  });
});
