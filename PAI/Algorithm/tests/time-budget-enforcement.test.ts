import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";

describe("Time Budget Enforcement (v4.0.0)", () => {
    const markdownPath = "PAI/Algorithm/v4.0.0.md";
    let content = "";
    try {
        content = readFileSync(markdownPath, "utf-8");
    } catch (e) {
        console.error(`Could not read ${markdownPath}`, e);
    }

    test("1) Section title is 'Time Budget Enforcement'", () => {
        expect(content).toContain("### Time Budget Enforcement");
    });

    test("2) Phase header format includes elapsed time", () => {
        expect(content).toMatch(/\[elapsed: \d+m\d*s* \/ budget: \d+m\]/);
    });

    test("3) Three enforcement rules exist (>75%, >100%, >150%)", () => {
        // >75% (compress)
        expect(content).toMatch(/>75% budget consumed.*Compress remaining phases/i);
        // >100% (no new capabilities)
        expect(content).toMatch(/>100% budget consumed.*no new capability invocations/i);
        // >150% (skip to VERIFY + TIMEOUT)
        expect(content).toMatch(/>150% budget consumed.*skip to VERIFY.*TIMEOUT/i);
    });

    test("4) Voice warning message is in Russian", () => {
        expect(content).toMatch(/Voice warning `"Бюджет времени превышен\."`/);
    });

    test("5) Reference to Effort Levels table for budget values", () => {
        expect(content).toMatch(/The budget is in the Effort Levels table/);
    });
});
