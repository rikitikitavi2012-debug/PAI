import { test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";

function parseSimpleYaml(content: string): Record<string, any> {
  // A simple fallback YAML parser for frontmatter since 'yaml' package isn't installed locally
  const lines = content.split('\n');
  const metadata: Record<string, any> = {};
  let currentKey = '';
  let currentArray: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;

    if (line.startsWith('  - ') || line.startsWith('- ')) {
      currentArray.push(line.replace(/^- |^  - /, '').trim());
      metadata[currentKey] = currentArray;
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      currentKey = line.substring(0, colonIdx).trim();
      const valStr = line.substring(colonIdx + 1).trim();

      if (valStr === '') {
        currentArray = [];
        metadata[currentKey] = currentArray;
      } else {
        metadata[currentKey] = valStr;
      }
    }
  }
  return metadata;
}

test("SKILL.md exists and has required frontmatter fields (name, version, description, triggers)", async () => {
  const filePath = path.join(__dirname, "../SKILL.md");
  expect(fs.existsSync(filePath)).toBe(true);

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  expect(match).not.toBeNull();

  const frontmatterText = match![1];

  // Try to use the project's real YAML parser if available, fallback to simple parsing
  let metadata: Record<string, any>;
  try {
    const yamlModule = await import('yaml');
    metadata = yamlModule.parse(frontmatterText);
  } catch {
    metadata = parseSimpleYaml(frontmatterText);
  }

  // Test for explicitly requested fields.
  // Note: If the source files currently lack these fields, this test will fail.
  // This correctly enforces the schema as requested by the prompt.
  expect(metadata).toHaveProperty('name');
  expect(metadata).toHaveProperty('version');
  expect(metadata).toHaveProperty('description');
  expect(metadata).toHaveProperty('triggers');

  // Verify triggers is an array
  expect(Array.isArray(metadata.triggers)).toBe(true);
});
