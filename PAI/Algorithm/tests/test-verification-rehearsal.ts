import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";

describe("Verification Rehearsal (v4.0-alpha)", () => {
    const markdownPath = "PAI/Algorithm/v4.0-alpha.md";
    let content = "";
    try {
        content = readFileSync(markdownPath, "utf-8");
    } catch (e) {
        console.error(`Could not read ${markdownPath}`, e);
    }

    test("1) 3 steps: baseline, good change, revert", () => {
        expect(content).toContain("1. Run the verify command on current state");
        expect(content).toContain("2. Make a known-good change");
        expect(content).toContain("3. Revert the change");
    });

    test("2) Condition: when [Q] exist", () => {
        expect(content).toMatch(/Verification Rehearsal \(when `\[Q\]` criteria exist/);
    });

    test("3) Step 1 produces number", () => {
        expect(content).toContain("record as baseline (must produce a number)");
    });

    test("4) Step 2 shows improvement", () => {
        expect(content).toContain("verify should show improvement (confirms signal detection)");
    });

    test("5) Step 3 returns to baseline", () => {
        expect(content).toContain("verify should return to baseline (confirms reversibility)");
    });

    test("6) Failure=fix measurement", () => {
        expect(content).toContain("If any step fails, the metric is unreliable — fix the measurement before iterating.");
    });

    test("7) Located in EXECUTE", () => {
        const lines = content.split('\n');
        let inExecutePhase = false;
        let foundVerificationRehearsal = false;

        for (const line of lines) {
            if (line.includes("━━━ ⚡ EXECUTE ━━━")) {
                inExecutePhase = true;
            }
            if (line.includes("━━━ ✅ VERIFY ━━━")) {
                inExecutePhase = false;
            }

            if (inExecutePhase && line.includes("Verification Rehearsal")) {
                foundVerificationRehearsal = true;
                break;
            }
        }

        expect(foundVerificationRehearsal).toBe(true);
    });

    test("8) Prerequisite for autoresearch loop", () => {
        expect(content).toMatch(/Verification Rehearsal.*before iterative optimization/);
        expect(content).toContain("This prevents wasting N experiments against a broken yardstick.");
    });
});
