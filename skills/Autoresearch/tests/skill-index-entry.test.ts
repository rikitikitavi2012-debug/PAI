import { test, expect, describe, beforeEach } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Autoresearch skill index entry', () => {
  const indexFile = join(process.cwd(), 'skills', 'skill-index.json');

  test('skill-index.json parses as valid JSON', () => {
    expect(() => {
      const content = readFileSync(indexFile, 'utf-8');
      JSON.parse(content);
    }).not.toThrow();
  });

  test('totalSkills >= 12', () => {
    const content = readFileSync(indexFile, 'utf-8');
    const data = JSON.parse(content);
    expect(data.totalSkills).toBeGreaterThanOrEqual(12);
  });

  test('skills.autoresearch entry exists', () => {
    const content = readFileSync(indexFile, 'utf-8');
    const data = JSON.parse(content);
    expect(data.skills).toBeDefined();
    expect(data.skills.autoresearch).toBeDefined();
  });

  describe('Autoresearch specific properties', () => {
    let autoresearch: any;

    // We parse once for the specific properties tests
    beforeEach(() => {
      const content = readFileSync(indexFile, 'utf-8');
      const data = JSON.parse(content);
      autoresearch = data.skills?.autoresearch || {};
    });

    test("autoresearch.name === 'Autoresearch'", () => {
      expect(autoresearch.name).toBe('Autoresearch');
    });

    test("autoresearch.path === 'Autoresearch/SKILL.md'", () => {
      expect(autoresearch.path).toBe('Autoresearch/SKILL.md');
    });

    test("autoresearch.triggers contains 'autoresearch'", () => {
      expect(autoresearch.triggers).toBeDefined();
      expect(Array.isArray(autoresearch.triggers)).toBe(true);
      expect(autoresearch.triggers).toContain('autoresearch');
    });

    test("autoresearch.triggers contains russian trigger 'автоисследование' or 'оптимизация'", () => {
      expect(autoresearch.triggers).toBeDefined();
      expect(Array.isArray(autoresearch.triggers)).toBe(true);

      const hasRussianTrigger = autoresearch.triggers.includes('автоисследование') ||
                               autoresearch.triggers.includes('оптимизация');
      expect(hasRussianTrigger).toBe(true);
    });

    test("autoresearch.tier === 'deferred'", () => {
      expect(autoresearch.tier).toBe('deferred');
    });

    test("File at autoresearch.path actually exists", () => {
      const skillPath = join(process.cwd(), 'skills', autoresearch.path);
      expect(existsSync(skillPath)).toBe(true);
    });
  });
});
