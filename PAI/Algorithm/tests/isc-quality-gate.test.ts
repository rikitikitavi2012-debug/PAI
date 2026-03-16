import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("PAI/Algorithm/v4.0-alpha.md ISC Quality Gate completeness", () => {
  const filePath = join(import.meta.dir, "../v4.0-alpha.md");
  const content = readFileSync(filePath, "utf-8");

  // Extract the "Critical Rules" section to scope our assertions
  const criticalRulesMatch = content.match(/### Critical Rules \(Zero Exceptions\)[\s\S]*?(?=###|$)/);
  const criticalRulesContent = criticalRulesMatch ? criticalRulesMatch[0] : "";

  test("1. Quality Gate section exists in Critical Rules", () => {
    expect(criticalRulesContent).toContain("**ISC Quality Gate");
  });

  test("2. Triviality test definition is present", () => {
    expect(criticalRulesContent).toContain("A criterion is **trivial** if it checks ONLY that something exists/doesn't error/has no typos — without verifying behavior, content, or correctness.");
  });

  test("3. Enforcement threshold: >30% trivial → STOP", () => {
    expect(criticalRulesContent).toContain("**Enforcement:** If >30% of criteria are trivial → STOP.");
  });

  test("4. Quick self-test question exists", () => {
    expect(criticalRulesContent).toContain("**Quick self-test (apply to each criterion):** \"If this criterion passes, does the user notice something working?\"");
  });

  test("5. Quality Gate is described as running AFTER Count Gate", () => {
    // Both mentions in the text
    expect(criticalRulesContent).toContain("**ISC Quality Gate (mechanical — runs after Count Gate):**");
    expect(criticalRulesContent).toContain("Count Gate checks quantity, Quality Gate checks substance. Both must pass.");
  });
});
