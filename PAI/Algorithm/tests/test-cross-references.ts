import { expect, test, describe } from "bun:test";
import { file } from "bun";

describe("Cross-Reference Integrity Test", () => {
  test("v4.0-alpha mentions Algorithm-Autoresearch.md", async () => {
    const text = await file("PAI/Algorithm/v4.0-alpha.md").text();
    expect(text).toContain("Algorithm-Autoresearch.md");
  });

  test("All file paths in v4.0-alpha point to existing files", async () => {
    const text = await file("PAI/Algorithm/v4.0-alpha.md").text();
    const regex = /(?:~\/\.claude\/|PAI\/)[a-zA-Z0-9_\/-]+\.(?:jsonl|json|md|ts)/g;
    const matches = text.match(regex) || [];

    expect(matches.length).toBeGreaterThan(0);

    for (const match of matches) {
      const cleanPath = match.replace(/^~\/\.claude\//, "");
      const exists = await file(cleanPath).exists();
      expect(exists).toBeTrue();
    }
  });

  test("Algorithm-Autoresearch.md references v4.0-alpha.md", async () => {
    const text = await file("PAI/Algorithm/Algorithm-Autoresearch.md").text();
    expect(text).toContain("v4.0-alpha.md");
  });

  test("CLAUDE.md references v4.0-alpha.md", async () => {
    const text = await file("CLAUDE.md").text();
    expect(text).toContain("v4.0-alpha.md");
  });

  test("LATEST contains v4.0-alpha", async () => {
    const text = await file("PAI/Algorithm/LATEST").text();
    expect(text).toContain("v4.0-alpha");
  });
});
