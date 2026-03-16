import { expect, test, describe } from "bun:test";

interface PRDFrontmatter {
  effort?: string;
  execute_mode?: 'standard' | 'autoresearch' | 'hybrid';
}

interface Criterion {
  text: string;
  type?: 'B' | 'Q';
}

export function routeCycle(frontmatter: PRDFrontmatter, criteria: Criterion[]): 'standard' | 'autoresearch' | 'hybrid' {
  // 6) Human override
  if (frontmatter.execute_mode) {
    return frontmatter.execute_mode;
  }

  // 1) Standard tier -> Standard
  if (frontmatter.effort === 'Standard') {
    return 'standard';
  }

  let countB = 0;
  let countQ = 0;

  for (const c of criteria) {
    // 7) No tagging -> treated as [B]
    if (c.type === 'Q') {
      countQ++;
    } else {
      countB++;
    }
  }

  // 2) Extended all-[B] -> Standard (and No tagging since they count as B)
  if (countQ === 0) {
    return 'standard';
  }

  // 5) Mixed -> Hybrid
  if (countB > 0 && countQ > 0) {
    return 'hybrid';
  }

  // 3) [Q] < 3 approaches -> Standard
  // 4) [Q] >= 3 approaches -> Autoresearch
  if (countQ < 3) {
    return 'standard';
  } else {
    return 'autoresearch';
  }
}

describe("Cycle Selector Routing Logic", () => {
  test("1) Standard tier -> Standard", () => {
    const result = routeCycle(
      { effort: 'Standard' },
      [
        { text: 'c1', type: 'Q' },
        { text: 'c2', type: 'Q' },
        { text: 'c3', type: 'Q' },
      ]
    );
    expect(result).toBe('standard');
  });

  test("2) Extended all-[B] -> Standard", () => {
    const result = routeCycle(
      { effort: 'Extended' },
      [
        { text: 'c1', type: 'B' },
        { text: 'c2', type: 'B' },
      ]
    );
    expect(result).toBe('standard');
  });

  test("3) [Q] < 3 approaches -> Standard", () => {
    const result = routeCycle(
      { effort: 'Extended' },
      [
        { text: 'c1', type: 'Q' },
        { text: 'c2', type: 'Q' },
      ]
    );
    expect(result).toBe('standard');
  });

  test("4) [Q] >= 3 approaches -> Autoresearch", () => {
    const result = routeCycle(
      { effort: 'Extended' },
      [
        { text: 'c1', type: 'Q' },
        { text: 'c2', type: 'Q' },
        { text: 'c3', type: 'Q' },
      ]
    );
    expect(result).toBe('autoresearch');
  });

  test("5) Mixed -> Hybrid", () => {
    const result = routeCycle(
      { effort: 'Advanced' },
      [
        { text: 'c1', type: 'B' },
        { text: 'c2', type: 'Q' },
      ]
    );
    expect(result).toBe('hybrid');
  });

  test("6) Human override", () => {
    const result1 = routeCycle(
      { effort: 'Standard', execute_mode: 'autoresearch' },
      [{ text: 'c1', type: 'B' }]
    );
    expect(result1).toBe('autoresearch');

    const result2 = routeCycle(
      { effort: 'Extended', execute_mode: 'hybrid' },
      [
        { text: 'c1', type: 'Q' },
        { text: 'c2', type: 'Q' },
        { text: 'c3', type: 'Q' },
      ]
    );
    expect(result2).toBe('hybrid');
  });

  test("7) No tagging -> Standard", () => {
    const result = routeCycle(
      { effort: 'Extended' },
      [
        { text: 'c1' },
        { text: 'c2' },
      ]
    );
    expect(result).toBe('standard');
  });
});
