import { describe, test, expect } from 'bun:test';
import { readFileSync, readdirSync, statSync, lstatSync, existsSync } from 'fs';
import { join } from 'path';

const skillsToCheck = [
  'Research',
  'Thinking',
  'ContentAnalysis',
  'TFContent',
  'YandexDirect',
  'Media',
  'Telos',
  'Utilities',
  'Investigation',
  'Agents'
];

describe('SKILL.md triggers test', () => {
  const findSkillFiles = (baseDir: string): string[] => {
    const files: string[] = [];

    if (!existsSync(baseDir)) return files;

    // Check top-level SKILL.md
    const topLevelSkill = join(baseDir, 'SKILL.md');
    if (existsSync(topLevelSkill)) {
      files.push(topLevelSkill);
    }

    // Check one-level nested SKILL.md
    const entries = readdirSync(baseDir);
    for (const entry of entries) {
      const fullPath = join(baseDir, entry);
      try {
        if (lstatSync(fullPath).isDirectory() && !lstatSync(fullPath).isSymbolicLink()) {
          const nestedSkill = join(fullPath, 'SKILL.md');
          if (existsSync(nestedSkill)) {
            files.push(nestedSkill);
          }
        }
      } catch (e) {
        // Ignore dead symlinks or unreadable entries
      }
    }

    return files;
  };

  const parseFrontmatter = (content: string): Record<string, string> => {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result: Record<string, string> = {};

    for (const line of yaml.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        result[key] = value;
      }
    }
    return result;
  };

  test('All user-invocable PAI skills have Russian triggers in USE WHEN', () => {
    for (const skillName of skillsToCheck) {
      const skillDir = join('skills', skillName);
      const skillFiles = findSkillFiles(skillDir);

      for (const file of skillFiles) {
        const content = readFileSync(file, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        expect(frontmatter).toHaveProperty('description');
        const description = frontmatter.description || '';

        try {
          expect(description).toContain('USE WHEN');
        } catch (e) {
          throw new Error(`Skill ${file} description does not contain 'USE WHEN'. Description: ${description}`);
        }

        const disabledInvocation = frontmatter['disable-model-invocation'] === 'true' || frontmatter['disable-model-invocation'] === "'true'" || frontmatter['disable-model-invocation'] === '"true"';

        if (!disabledInvocation) {
          const hasRussian = /[А-Яа-яЁё]/.test(description);
          try {
            expect(hasRussian).toBe(true);
          } catch (e) {
            throw new Error(`Skill ${file} description does not contain Russian triggers. Description: ${description}`);
          }
        }
      }
    }
  });
});
