import { test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

test("LEARN Phase Persistence requirements", () => {
  const v4Path = path.join(process.cwd(), "PAI/Algorithm/v4.0-alpha.md");
  const content = fs.readFileSync(v4Path, "utf-8");

  // Extract the LEARN section
  const learnMatch = content.match(/━━━ 📚 LEARN ━━━.*?(?=\#\#\# Critical Rules)/s);
  expect(learnMatch).not.toBeNull();

  if (learnMatch) {
    const learnSection = learnMatch[0];

    // 1. Contains 'PERSIST LEARNINGS (MANDATORY'
    expect(learnSection).toContain("PERSIST LEARNINGS (MANDATORY");

    // 2. Contains 'enforced by LearnGate hook'
    expect(learnSection).toContain("enforced by LearnGate hook");

    // 3. LEARN.md template has 3 sections: Reflections, Patterns, Actions
    expect(learnSection).toContain("## Reflections");
    expect(learnSection).toContain("## Patterns");
    expect(learnSection).toContain("## Actions");

    // 4. Contains 'before setting phase: complete'
    expect(learnSection).toMatch(/before\*\*\s*setting\s*`phase:\s*complete`/);

    // 5. Standard tier guidance exists ('5-10 lines')
    expect(learnSection).toContain("5-10 lines");

    // 6. Extended+ tier guidance exists ('specific evidence')
    expect(learnSection).toContain("specific evidence");

    // 7. 'phase: complete' instruction comes AFTER LEARN.md instruction
    const learnMdIndex = learnSection.indexOf("Write `LEARN.md`");
    const phaseCompleteIndex = learnSection.indexOf("Set frontmatter `phase: complete`");

    expect(learnMdIndex).toBeGreaterThan(-1);
    expect(phaseCompleteIndex).toBeGreaterThan(-1);
    expect(phaseCompleteIndex).toBeGreaterThan(learnMdIndex);
  }
});
