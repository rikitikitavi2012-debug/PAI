import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "yaml";

const CONFIG_PATH = join(process.cwd(), "PAI/config/algorithm-phases.yaml");
const ALGORITHM_DOC_PATH = join(process.cwd(), "PAI/Algorithm/v4.0.0.md");

describe("PAI/config/algorithm-phases.yaml consistency", () => {
  const configContent = readFileSync(CONFIG_PATH, "utf-8");
  const parsedConfig = yaml.parse(configContent);
  const algoDocContent = readFileSync(ALGORITHM_DOC_PATH, "utf-8");

  const requiredPhases = [
    "OBSERVE",
    "THINK",
    "PLAN",
    "CYCLE SELECTOR",
    "BUILD",
    "EXECUTE",
    "VERIFY",
    "LEARN"
  ];

  test("1. Every phase in yaml has both english and russian fields", () => {
    const phases = parsedConfig.phases;
    for (const phaseKey in phases) {
      const phase = phases[phaseKey];
      expect(phase).toHaveProperty("english");
      expect(typeof phase.english).toBe("string");
      expect(phase.english.length).toBeGreaterThan(0);

      expect(phase).toHaveProperty("russian");
      expect(typeof phase.russian).toBe("string");
      expect(phase.russian.length).toBeGreaterThan(0);
    }
  });

  test("2. Every phase in yaml has an emoji", () => {
    const phases = parsedConfig.phases;
    for (const phaseKey in phases) {
      const phase = phases[phaseKey];
      expect(phase).toHaveProperty("emoji");
      expect(typeof phase.emoji).toBe("string");
      expect(phase.emoji.length).toBeGreaterThan(0);
    }
  });

  test("3. All phases from v4.0.0.md are present in yaml", () => {
    const phases = parsedConfig.phases;
    const existingPhases = Object.keys(phases);
    for (const required of requiredPhases) {
      expect(existingPhases).toContain(required);
    }
  });

  test("4. algorithm_entry field exists and is non-empty", () => {
    expect(parsedConfig).toHaveProperty("algorithm_entry");
    expect(typeof parsedConfig.algorithm_entry).toBe("string");
    expect(parsedConfig.algorithm_entry.length).toBeGreaterThan(0);
  });

  test("5. Russian phrases in yaml match the voice phrases in v4.0.0.md", () => {
    const phases = parsedConfig.phases;
    const docLines = algoDocContent.split("\n");

    const voicePhraseRegex = /Voice announce\s+`"([^"]+)"`/;

    for (const phaseKey of requiredPhases) {
      if (phaseKey === "CYCLE SELECTOR") {
        continue;
      }

      const phaseDocHeaderMatch = new RegExp(`━━━ (.*?) ${phaseKey} ━━━`);
      let voicePhrase = null;

      // Find the voice phrase
      for (let i = 0; i < docLines.length; i++) {
        if (phaseDocHeaderMatch.test(docLines[i])) {
          // Look ahead for the voice announce in the following lines
          for (let j = i; j < Math.min(i + 10, docLines.length); j++) {
            const match = docLines[j].match(voicePhraseRegex);
            if (match) {
              voicePhrase = match[1];
              break;
            }
          }
          break;
        }
      }

      expect(voicePhrase).not.toBeNull();

      // Normalize string: lowercase and remove trailing punctuation like dots
      const normalizedVoicePhrase = voicePhrase!
        .toLowerCase()
        .replace(/[.,!?]$/, "")
        .trim();

      const yamlRussianPhrase = phases[phaseKey].russian
        .toLowerCase()
        .replace(/[.,!?]$/, "")
        .trim();

      expect(yamlRussianPhrase).toBe(normalizedVoicePhrase);
    }
  });

  test("6. No duplicate phases", () => {
    // Read raw lines to find duplicate keys manually under 'phases:'
    const lines = configContent.split('\n');
    let inPhases = false;
    const phaseKeysFound = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('phases:')) {
        inPhases = true;
        continue;
      }

      if (inPhases) {
        // Stop if we hit another top-level key
        if (line.match(/^[a-zA-Z]/)) {
          inPhases = false;
          break;
        }

        // Check for phase keys: must be 2 spaces indented
        const match = line.match(/^  "?([A-Z ]+)"?:/);
        if (match) {
          const key = match[1];
          expect(phaseKeysFound.has(key)).toBe(false); // If it fails, we found a duplicate
          phaseKeysFound.add(key);
        }
      }
    }

    // Ensure we found at least some keys
    expect(phaseKeysFound.size).toBeGreaterThan(0);
  });
});
