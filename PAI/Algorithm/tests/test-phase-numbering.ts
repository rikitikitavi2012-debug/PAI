import { expect, test, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";

describe("Algorithm Phase Numbering Tests", () => {
  const filePath = path.join(process.cwd(), "PAI", "Algorithm", "v4.0.0.md");
  const content = fs.readFileSync(filePath, "utf-8");

  // Regex to match the phase headers
  // e.g. ━━━ 👁️ OBSERVE ━━━ 1/7
  const phaseRegex = /━━━\s*(.*?)\s*━━━\s*([0-9.]+)\/7/g;

  const matches = [...content.matchAll(phaseRegex)];

  test("Phase headers are correctly extracted", () => {
    expect(matches.length).toBeGreaterThan(0);
  });

  const expectedPhases = [
    { name: "OBSERVE", num: "1" },
    { name: "THINK", num: "2" },
    { name: "PLAN", num: "3" },
    { name: "CYCLE SELECTOR", num: "3.5" },
    { name: "BUILD", num: "4" },
    { name: "EXECUTE", num: "5" },
    { name: "VERIFY", num: "6" },
    { name: "LEARN", num: "7" }
  ];

  test("Phase headers are exactly in order", () => {
    expect(matches.length).toBe(expectedPhases.length);
    for (let i = 0; i < matches.length; i++) {
      expect(matches[i][1]).toContain(expectedPhases[i].name);
      expect(matches[i][2]).toBe(expectedPhases[i].num);
    }
  });

  test("No duplicate numbers in phase numbering", () => {
    const numbers = matches.map(m => m[2]);
    const uniqueNumbers = new Set(numbers);
    expect(numbers.length).toBe(uniqueNumbers.size);
  });

  test("Verify FIRST ACTION and voice announcements for each phase", () => {
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const startIdx = currentMatch.index!;
      const nextMatchIdx = i < matches.length - 1 ? matches[i + 1].index! : content.length;

      const phaseSection = content.slice(startIdx, nextMatchIdx);
      const phaseName = expectedPhases[i].name;

      // Each phase has FIRST ACTION
      expect(phaseSection).toContain("FIRST ACTION:");

      if (phaseName === "CYCLE SELECTOR") {
        // Cycle selector doesn't have a Voice announcement
        expect(phaseSection).not.toContain("Voice announce");
      } else {
        expect(phaseSection).toContain("Voice announce");
      }
    }
  });
});
