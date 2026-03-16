import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { spawnSync } from "bun";

describe(".gitignore coverage", () => {
  const gitignoreContent = readFileSync(".gitignore", "utf-8");
  const gitignoreLines = gitignoreContent.split("\n").map(l => l.trim());

  const patternsToTest = [
    "tasks/",
    "sessions/",
    "ide/",
    "*.cache.json",
    "MEMORY/LEARNING/**/tool-calls.json",
    "MEMORY/LEARNING/**/sentiment.json",
    "tmp*/",
    "MEMORY/WORK/*/tasks/"
  ];

  describe("patterns are present in .gitignore", () => {
    for (const pattern of patternsToTest) {
      it(`should contain pattern: ${pattern}`, () => {
        expect(gitignoreLines).toContain(pattern);
      });
    }
  });

  describe("git ls-files does not contain matching files", () => {
    const { stdout } = spawnSync(["git", "ls-files"]);
    const trackedFiles = stdout.toString().split("\n").filter(Boolean);

    // Map each gitignore pattern to a regex that matches paths
    const patternRegexes: Record<string, RegExp> = {
      "tasks/": /^tasks\//,
      "sessions/": /^sessions\//,
      "ide/": /^ide\//,
      "*.cache.json": /\.cache\.json$/,
      "MEMORY/LEARNING/**/tool-calls.json": /^MEMORY\/LEARNING\/.*\/tool-calls\.json$/,
      "MEMORY/LEARNING/**/sentiment.json": /^MEMORY\/LEARNING\/.*\/sentiment\.json$/,
      "tmp*/": /^tmp[^\/]*\//,
      "MEMORY/WORK/*/tasks/": /^MEMORY\/WORK\/[^\/]+\/tasks\//
    };

    for (const pattern of patternsToTest) {
      it(`should not have tracked files matching ${pattern}`, () => {
        const regex = patternRegexes[pattern];
        const matchingFiles = trackedFiles.filter(file => regex.test(file));
        expect(matchingFiles).toEqual([]); // Should be empty
      });
    }
  });
});
