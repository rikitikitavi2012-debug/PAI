import { expect, test, describe } from "bun:test";
import * as fs from "fs";
import * as path from "path";

describe("Algorithm Voice Language Tests", () => {
  const mdPath = path.join(process.cwd(), "PAI", "Algorithm", "v4.0.0.md");
  const mdContent = fs.readFileSync(mdPath, "utf-8");

  const yamlPath = path.join(process.cwd(), "PAI", "config", "algorithm-phases.yaml");
  const yamlContent = fs.readFileSync(yamlPath, "utf-8");

  // Helper to extract all voice announce messages
  // Example matches: Voice announce `"Вхожу в фазу наблюдения."`
  // Also: `"Вхожу в Алгоритм"`
  const getVoicePhrases = () => {
    const phrases: string[] = [];

    // Match direct curl payload message: '{"message": "Вхожу в Алгоритм"'
    const curlMessageRegex = /"message":\s*"([^"]+)"/g;
    let match;
    while ((match = curlMessageRegex.exec(mdContent)) !== null) {
      phrases.push(match[1]);
    }

    // Match inline Voice announce instructions
    // Voice announce `"Вхожу в фазу наблюдения."`
    const voiceAnnounceRegex = /Voice announce\s+`"([^"]+)"`/g;
    while ((match = voiceAnnounceRegex.exec(mdContent)) !== null) {
      phrases.push(match[1]);
    }

    // Phase transitions format definition: `"Вхожу в фазу PHASE_NAME."`
    // And Algorithm entry format definition: `"Вхожу в Алгоритм"`
    const entryDefRegex = /\*\*Algorithm entry:\*\*\s+`"([^"]+)"`/g;
    while ((match = entryDefRegex.exec(mdContent)) !== null) {
      phrases.push(match[1]);
    }

    const phaseTransDefRegex = /\*\*Phase transitions:\*\*\s+`"([^"]+)"`/g;
    while ((match = phaseTransDefRegex.exec(mdContent)) !== null) {
      phrases.push(match[1]);
    }

    return Array.from(new Set(phrases));
  };

  test("1. No 'Entering the' phrases remain (English)", () => {
    const phrases = getVoicePhrases();
    for (const phrase of phrases) {
      expect(phrase.toLowerCase()).not.toContain("entering the");
    }
  });

  test("2. All voice phrases contain Cyrillic characters (Russian)", () => {
    const phrases = getVoicePhrases();
    // Exclude the placeholders "PHASE_NAME" and "MESSAGE" from the definition regex match if present
    const actualPhrases = phrases.filter(p => !p.includes("PHASE_NAME") && p !== "MESSAGE");

    expect(actualPhrases.length).toBeGreaterThan(0);

    const cyrillicRegex = /[\u0400-\u04FF]/;
    for (const phrase of actualPhrases) {
      expect(phrase).toMatch(cyrillicRegex);
    }
  });

  test("3. Algorithm entry message is 'Вхожу в Алгоритм'", () => {
    const curlMessageRegex = /"message":\s*"([^"]+)"/g;
    let match;
    let foundEntry = false;
    while ((match = curlMessageRegex.exec(mdContent)) !== null) {
      if (match[1] === "Вхожу в Алгоритм") {
        foundEntry = true;
      }
    }

    const entryDefRegex = /\*\*Algorithm entry:\*\*\s+`"([^"]+)"`/g;
    while ((match = entryDefRegex.exec(mdContent)) !== null) {
      if (match[1] === "Вхожу в Алгоритм") {
        foundEntry = true;
      }
    }

    expect(foundEntry).toBe(true);
  });

  test("4. Each of 7 phases has a Russian voice phrase", () => {
    const phasesToTest = ["OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY", "LEARN"];

    // Regex to match the phase headers and their FIRST ACTION line
    const phaseRegex = /━━━\s*(.*?)\s*━━━\s*[0-9.]+\/7[\s\S]*?\*\*FIRST ACTION:\*\*\s*(.*?)(?=\n|$)/g;
    const matches = [...mdContent.matchAll(phaseRegex)];

    let testedPhases = 0;

    for (const match of matches) {
      const phaseHeader = match[1].trim();
      const firstAction = match[2];

      const isOneOf7Phases = phasesToTest.some(p => phaseHeader.includes(p));

      if (isOneOf7Phases) {
        testedPhases++;
        expect(firstAction).toContain("Voice announce");

        const voiceAnnounceMatch = /Voice announce\s+`"([^"]+)"`/.exec(firstAction);
        expect(voiceAnnounceMatch).not.toBeNull();

        const phrase = voiceAnnounceMatch![1];
        const cyrillicRegex = /[\u0400-\u04FF]/;
        expect(phrase).toMatch(cyrillicRegex);
      }
    }

    expect(testedPhases).toBe(7);
  });

  test("5. Cross-reference with PAI/config/algorithm-phases.yaml russian values", () => {
    // Custom simple yaml parser to extract russian values
    const getYamlValue = (phaseKey: string): string | null => {
      // Look for the phase key, then find its russian: "..." value
      // This is a naive regex approach but works for the known format

      // Since "CYCLE SELECTOR" has quotes in YAML, we need to handle that.
      const escapedKey = phaseKey === "CYCLE SELECTOR" ? '"CYCLE SELECTOR"' : phaseKey;

      const phaseSectionRegex = new RegExp(`${escapedKey}:[\\s\\S]*?(?=\\n\\s*[A-Z]|$)`, 'g');
      const sectionMatch = phaseSectionRegex.exec(yamlContent);

      if (!sectionMatch) return null;

      const russianMatch = /russian:\s*"([^"]+)"/.exec(sectionMatch[0]);
      return russianMatch ? russianMatch[1] : null;
    };

    const phasesToTest = [
      { key: "OBSERVE", name: "OBSERVE" },
      { key: "THINK", name: "THINK" },
      { key: "PLAN", name: "PLAN" },
      { key: "BUILD", name: "BUILD" },
      { key: "EXECUTE", name: "EXECUTE" },
      { key: "VERIFY", name: "VERIFY" },
      { key: "LEARN", name: "LEARN" }
    ];

    // Regex to match the phase headers and their FIRST ACTION line in MD
    const phaseRegex = /━━━\s*(.*?)\s*━━━\s*[0-9.]+\/7[\s\S]*?\*\*FIRST ACTION:\*\*\s*(.*?)(?=\n|$)/g;
    const matches = [...mdContent.matchAll(phaseRegex)];

    for (const phaseObj of phasesToTest) {
      // Find the md content match
      const mdMatch = matches.find(m => m[1].includes(phaseObj.name));
      expect(mdMatch).not.toBeUndefined();

      const firstAction = mdMatch![2];
      const voiceAnnounceMatch = /Voice announce\s+`"([^"]+)"`/.exec(firstAction);
      expect(voiceAnnounceMatch).not.toBeNull();

      const mdPhrase = voiceAnnounceMatch![1].toLowerCase().replace(/\.$/, ''); // Remove trailing period from MD phrase if present

      // Get the expected value from YAML
      const yamlPhrase = getYamlValue(phaseObj.key)?.toLowerCase();
      expect(yamlPhrase).not.toBeNull();

      // E.g. MD: "Вхожу в фазу наблюдения." vs YAML: "вхожу в фазу наблюдения"
      expect(mdPhrase).toBe(yamlPhrase!);
    }
  });
});
