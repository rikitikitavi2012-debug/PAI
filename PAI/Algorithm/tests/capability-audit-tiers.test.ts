import { test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

test("Tier-based Capability Audit depth in v4.0-alpha.md", () => {
  const v4Path = path.join(process.cwd(), "PAI/Algorithm/v4.0-alpha.md");
  const v4Content = fs.readFileSync(v4Path, "utf-8");

  const lines = v4Content.split("\n");

  let inTable = false;
  let tableRows: string[] = [];
  let standardRow = "";
  let extendedRow = "";
  let advancedRow = "";
  let rationale = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we reached the TIER-BASED AUDIT DEPTH table
    if (line === "**TIER-BASED AUDIT DEPTH:**") {
      // Find the start of the table
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith("| Tier |")) {
        j++;
      }

      if (j < lines.length) {
        inTable = true;
        // Skip header and separator
        j += 2;

        while (j < lines.length && lines[j].trim().startsWith("|")) {
          const rowLine = lines[j].trim();
          tableRows.push(rowLine);

          if (rowLine.includes("**Standard**")) {
            standardRow = rowLine;
          } else if (rowLine.includes("**Extended**")) {
            extendedRow = rowLine;
          } else if (rowLine.includes("**Advanced+**")) {
            advancedRow = rowLine;
          }
          j++;
        }

        // Grab rationale just after the table
        // Keep reading non-empty lines right after the table to find the rationale
        while (j < lines.length && lines[j].trim() === "") {
            j++;
        }
        if (j < lines.length && !lines[j].trim().startsWith("SELECTION METHODOLOGY:")) {
            rationale = lines[j].trim();
        }
      }
      break;
    }
  }

  // Verify: 1. TIER-BASED AUDIT DEPTH table exists with 3 rows (Standard, Extended, Advanced+)
  expect(tableRows.length).toBe(3);
  expect(standardRow).toBeTruthy();
  expect(extendedRow).toBeTruthy();
  expect(advancedRow).toBeTruthy();

  // Verify: 2. Standard tier: 'Fast-path' — list only USE capabilities, no DECLINE/N/A
  expect(standardRow).toContain("**Fast-path:**");
  expect(standardRow).toContain("List only capabilities you WILL USE");
  expect(standardRow).toContain("No DECLINE/N/A enumeration");

  // Verify: 3. Extended tier: USE + DECLINE for relevant, N/A can batch
  expect(extendedRow).toContain("List USE with reasons + DECLINE for potentially relevant capabilities only");
  expect(extendedRow).toContain("N/A can batch");

  // Verify: 4. Advanced+ tier: Full audit with all 25 capabilities
  expect(advancedRow).toContain("Full audit: walk all 25 capabilities");
  expect(advancedRow).toContain("USE/DECLINE/N/A with reasons");

  // Verify: 5. Rationale explains why Standard skips full enumeration
  expect(rationale).toContain("The fast-path exists because Standard tasks (rename, fix, simple edit) rarely benefit from enumerating why you're NOT using");
  expect(rationale).toContain("The value of the audit scales with task complexity, not with formality.");
});
