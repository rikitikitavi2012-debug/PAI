import { expect, test, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";

describe("ISC Count Gate Tests", () => {
  const filePath = path.join(process.cwd(), "PAI", "Algorithm", "v4.0.0.md");
  const content = fs.readFileSync(filePath, "utf-8");

  test("Gate exists between OBSERVE output and THINK phase", () => {
    const observeIdx = content.indexOf("━━━ 👁️ OBSERVE ━━━");
    const thinkIdx = content.indexOf("━━━ 🧠 THINK ━━━");
    const gateIdx = content.indexOf("**ISC COUNT GATE");

    expect(observeIdx).toBeGreaterThan(-1);
    expect(thinkIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(observeIdx);
    expect(gateIdx).toBeLessThan(thinkIdx);
  });

  test("Gate marked as MANDATORY", () => {
    expect(content).toContain("**ISC COUNT GATE (MANDATORY");
  });

  test("Instruction 'DO NOT proceed' if below floor", () => {
    expect(content).toContain("If ISC count < floor: DO NOT proceed.");
  });

  test("Splitting Test referenced as decomposition method", () => {
    expect(content).toContain("Decompose further using Splitting Test");
    expect(content).toContain("apply the Splitting Test, decompose");
  });

  test("Parse the table and verify all 5 effort tiers and floor values", () => {
    // Extract table content
    const tableRegex = /\| Tier \| Floor \| If below floor\.\.\. \|\n\|-+\|-+\|-+\|\n([\s\S]*?)(?=\n\n|\n\*\*If)/;
    const match = content.match(tableRegex);
    expect(match).not.toBeNull();

    const tableRows = match![1].trim().split('\n');
    expect(tableRows.length).toBe(5);

    const parsedData: Record<string, number> = {};
    for (const row of tableRows) {
      const parts = row.split('|').map(s => s.trim()).filter(s => s !== "");
      if (parts.length >= 2) {
        parsedData[parts[0]] = parseInt(parts[1], 10);
      }
    }

    expect(parsedData["Standard"]).toBe(8);
    expect(parsedData["Extended"]).toBe(16);
    expect(parsedData["Advanced"]).toBe(24);
    expect(parsedData["Deep"]).toBe(40);
    expect(parsedData["Comprehensive"]).toBe(64);
  });
});
