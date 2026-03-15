import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Algorithm-Autoresearch.md Structure", () => {
  const filePath = join(__dirname, "../Algorithm-Autoresearch.md");
  const content = readFileSync(filePath, "utf-8");

  it("should contain all 8 phases", () => {
    expect(content).toContain("Phase 1: REVIEW");
    expect(content).toContain("Phase 2: IDEATE");
    expect(content).toContain("Phase 3: MODIFY");
    expect(content).toContain("Phase 4: COMMIT");
    expect(content).toContain("Phase 5: VERIFY");
    expect(content).toContain("Phase 6: DECIDE");
    expect(content).toContain("Phase 7: LOG");
    expect(content).toContain("Phase 8: REPEAT");
  });

  it("should define 5 specific outcomes in DECIDE phase", () => {
    // Extract Phase 6 section
    const decideMatch = content.match(/Phase 6: DECIDE([\s\S]*?)Phase 7: LOG/);
    expect(decideMatch).not.toBeNull();
    const decideSection = decideMatch![1];

    expect(decideSection).toContain("→ KEEP");
    expect(decideSection).toContain("→ REVERT (git revert)");
    expect(decideSection).toContain("→ REVERT (gate > metric)");
    expect(decideSection).toContain("→ REVERT + ALERT");
    expect(decideSection).toContain("→ fix attempt (max 3) → if still broken, SKIP");

    // Check that there are exactly 5 bullet points in Phase 6
    const bulletPoints = decideSection.split("\n").filter(line => line.trim().startsWith("-"));
    expect(bulletPoints.length).toBe(5);
  });

  it("should contain 5 numbered questions in Self-Interrogation Checkpoint", () => {
    const checkpointMatch = content.match(/### Self-Interrogation Checkpoint([\s\S]*?)If answers suggest/);
    expect(checkpointMatch).not.toBeNull();
    const checkpointSection = checkpointMatch![1];

    expect(checkpointSection).toMatch(/^1\.\s/m);
    expect(checkpointSection).toMatch(/^2\.\s/m);
    expect(checkpointSection).toMatch(/^3\.\s/m);
    expect(checkpointSection).toMatch(/^4\.\s/m);
    expect(checkpointSection).toMatch(/^5\.\s/m);

    // Ensure there isn't a 6th question
    expect(checkpointSection).not.toMatch(/^6\.\s/m);
  });

  it("should state the Re-entry limit as exactly 2", () => {
    expect(content).toContain("Maximum **2** re-entries");
  });

  it("should contain 4 specific bullet items in Context Recovery", () => {
    const recoveryMatch = content.match(/### Context Recovery \(during Autoresearch\)([\s\S]*?)### Stagnation Detection/);
    expect(recoveryMatch).not.toBeNull();
    const recoverySection = recoveryMatch![1];

    expect(recoverySection).toContain("- **Iteration count:**");
    expect(recoverySection).toContain("- **Current metric:**");
    expect(recoverySection).toContain("- **Re-entry count:**");
    expect(recoverySection).toContain("- **Consecutive discards:**");

    // Check there are exactly 4 bullet points in this section
    const bulletPoints = recoverySection.split("\n").filter(line => line.trim().startsWith("-"));
    expect(bulletPoints.length).toBe(4);
  });
});
