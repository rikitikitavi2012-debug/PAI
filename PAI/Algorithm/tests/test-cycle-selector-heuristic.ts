import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cycle Selector Routing Rules Test', () => {
  let v4AlphaContent = '';

  beforeAll(() => {
    const basePath = process.env.PAI_DIR || process.cwd();
    v4AlphaContent = readFileSync(join(basePath, 'PAI/Algorithm/v4.0.0.md'), 'utf-8');
  });

  it('1) Standard tier → always Standard EXECUTE', () => {
    expect(v4AlphaContent).toMatch(/1\.\s+Standard tier\s+→\s+\*\*always\*\*\s+Standard EXECUTE.*?\(ISC-Metric Mapping is skipped, no `\[Q\]` possible\)/i);
  });

  it('2) Extended+ with all [B] → Standard EXECUTE', () => {
    expect(v4AlphaContent).toMatch(/2\.\s+Extended\+\s+with\s+all\s+`\[B\]`\s+→\s+Standard EXECUTE/i);
  });

  it('3) Extended+ with [Q] criteria (no [B]) → search space heuristic', () => {
    expect(v4AlphaContent).toMatch(/3\.\s+Extended\+\s+with\s+`\[Q\]`\s+criteria\s+\(no\s+`\[B\]`\)\s+→\s+search space heuristic:\s+if\s+<3\s+distinct approaches\s+→\s+Standard,\s+if\s+3\+\s+→\s+Autoresearch/i);
  });

  it('4) Extended+ with mixed [B] + [Q] → Hybrid', () => {
    expect(v4AlphaContent).toMatch(/4\.\s+Extended\+\s+with\s+mixed\s+`\[B\]`\s+\+\s+`\[Q\]`\s+→\s+\*\*Hybrid\*\*:\s+Standard EXECUTE for `\[B\]` first,\s+then for each `\[Q\]`:\s+apply search space heuristic\s+\(<3 approaches → direct,\s+3\+ → Autoresearch sub-loop\)/i);
  });

  it('5) Rules are evaluated in order (first match wins)', () => {
    expect(v4AlphaContent).toMatch(/\*\*Routing rules \(evaluated in order, first match wins\):\*\*/i);
  });

  it('6) Human override syntax \'execute_mode:\' documented', () => {
    expect(v4AlphaContent).toMatch(/\*\*Human override:\*\*\s+Add\s+`execute_mode:\s+standard\s+\|\s+autoresearch\s+\|\s+hybrid`\s+to\s+PRD\s+frontmatter\s+to\s+force\s+a\s+specific\s+route\s+regardless\s+of\s+ISC\s+composition\./i);
  });
  it('7) Markdown table for ISC Composition exists and matches expected values', () => {
    expect(v4AlphaContent).toMatch(/\|\s+All `\[B\]` \(or no tagging\)\s+\|\s+\*\*Standard EXECUTE\*\*/i);
    expect(v4AlphaContent).toMatch(/\|\s+Any `\[Q\]` with large search space\s+\|\s+\*\*Autoresearch EXECUTE\*\*/i);
    expect(v4AlphaContent).toMatch(/\|\s+Mixed `\[B\]` \+ `\[Q\]`\s+\|\s+\*\*Hybrid EXECUTE\*\*/i);
  });
});
