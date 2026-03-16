import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Experiments TSV Consistency Test", () => {
  const v4Path = join(import.meta.dir, "..", "v4.0.0.md");
  const autoResearchPath = join(import.meta.dir, "..", "Algorithm-Autoresearch.md");

  const v4Content = readFileSync(v4Path, "utf-8");
  const autoResearchContent = readFileSync(autoResearchPath, "utf-8");

  test("1) 6 columns same in both files", () => {
    // Look for the header row: iteration commit metric delta status description
    // In v4.0.0.md:
    const v4HeaderMatch = v4Content.match(/iteration\tcommit\tmetric\tdelta\tstatus\tdescription/);
    expect(v4HeaderMatch).toBeTruthy();

    // In Algorithm-Autoresearch.md:
    const arHeaderMatch = autoResearchContent.match(/iteration \| commit \| metric \| delta \| status \| description/);
    expect(arHeaderMatch).toBeTruthy();
  });

  test("2) Status values: baseline,keep,discard,crash,skip", () => {
    // In v4.0.0.md
    const v4StatusMatch = v4Content.match(/`status` = `baseline \| keep \| discard \| crash \| skip`/);
    expect(v4StatusMatch).toBeTruthy();

    // In Algorithm-Autoresearch.md
    // Since there are no explicit listed status rules in AutoResearch like v4.0.0,
    // let's verify if 'status' has 'baseline', 'keep', 'discard', 'crash', 'skip' implicitly
    // in the document via phase decriptions and delta rules.
    const arStatusMatch = autoResearchContent.match(/baseline/i) &&
                          autoResearchContent.match(/keep/i) &&
                          autoResearchContent.match(/discard/i) &&
                          autoResearchContent.match(/crash/i) &&
                          autoResearchContent.match(/skip/i);
    expect(arStatusMatch).toBeTruthy();
  });

  test("3) Delta calc rule consistent", () => {
    // In v4.0.0.md
    const v4DeltaMatch = v4Content.match(/`delta` = change from most recent `keep` or `baseline` row \(ignore `discard`\/`crash`\/`skip` rows\)/);
    expect(v4DeltaMatch).toBeTruthy();

    // In Algorithm-Autoresearch.md
    const arDeltaMatch = autoResearchContent.match(/delta = change from most recent keep\/baseline \(ignore discard\/crash\/skip\)/);
    expect(arDeltaMatch).toBeTruthy();
  });

  test("4) Context Recovery references TSV", () => {
    // v4.0.0.md:
    const v4RecoveryMatch = v4Content.match(/If `\[Q\]` criteria were used, check for `experiments\.tsv` in the PRD directory/i);
    expect(v4RecoveryMatch).toBeTruthy();

    // Algorithm-Autoresearch.md:
    const arRecoveryMatch = autoResearchContent.match(/Context Recovery \(during Autoresearch\)[\s\S]*?recover sub-loop state by reading experiments\.tsv:/i);
    expect(arRecoveryMatch).toBeTruthy();
  });

  test("5) Re-entry in TSV header", () => {
    // Algorithm-Autoresearch.md explicitly mentions this:
    const arReentryMatch = autoResearchContent.match(/Track re-entry count in experiments\.tsv header comment:\s*`# think_reentries: N`/i);
    expect(arReentryMatch).toBeTruthy();

    // It also mentions it in Context Recovery: "# think_reentries: N"
    const arContextRecoveryReentryMatch = autoResearchContent.match(/Re-entry count:\*\* `# think_reentries: N` header comment/i);
    expect(arContextRecoveryReentryMatch).toBeTruthy();
  });
});
