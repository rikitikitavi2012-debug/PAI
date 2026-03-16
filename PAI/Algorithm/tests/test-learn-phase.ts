import { test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

test("LEARN Phase Dual-Track tests", () => {
  const v4Path = path.join(process.cwd(), "PAI/Algorithm/v4.0.0.md");
  const autoresearchPath = path.join(process.cwd(), "PAI/Algorithm/Algorithm-Autoresearch.md");

  const v4Content = fs.readFileSync(v4Path, "utf-8");
  const autoresearchContent = fs.readFileSync(autoresearchPath, "utf-8");

  // Track 1
  const track1Match = v4Content.match(/\*\*Track 1 — Reflective\*\*.*?(?=\*\*Track 2 — Empirical\*\*)/s);
  expect(track1Match).not.toBeNull();
  if (track1Match) {
    const track1Content = track1Match[0];
    const questions = track1Content.match(/\[🧠/g);
    expect(questions?.length).toBe(4);
  }

  // Track 2
  const track2Match = v4Content.match(/\*\*Track 2 — Empirical\*\*.*?(?=\*\*Track 3 — Synthesis\*\*)/s);
  expect(track2Match).not.toBeNull();
  if (track2Match) {
    const track2Content = track2Match[0];
    const dataPoints = track2Content.match(/\[🧠/g);
    expect(dataPoints?.length).toBe(3);
    expect(track2Content).toContain("only when experiments.tsv exists");
  }

  // Track 3
  const track3Match = v4Content.match(/\*\*Track 3 — Synthesis\*\*.*?(?=```)/s);
  expect(track3Match).not.toBeNull();
  if (track3Match) {
    const track3Content = track3Match[0];
    const analysisPoints = track3Content.match(/\[🧠/g);
    expect(analysisPoints?.length).toBe(3);
    expect(track3Content).toContain("only when Track 2 has 5+ experiments");
    expect(track3Content).toContain("Write to Wisdom Frames only if pattern is cross-domain applicable");
  }

  // Integration section in Algorithm-Autoresearch.md
  expect(autoresearchContent).toContain("The experiments.tsv data feeds into LEARN Track 2 (Empirical) and Track 3 (Synthesis).");
});