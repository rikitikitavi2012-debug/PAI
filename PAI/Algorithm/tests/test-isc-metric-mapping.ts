import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ISC-Metric Mapping Consistency Test', () => {
  let v4AlphaContent = '';
  let autoResearchContent = '';

  beforeAll(() => {
    const basePath = process.env.PAI_DIR || process.cwd();
    v4AlphaContent = readFileSync(join(basePath, 'PAI/Algorithm/v4.0-alpha.md'), 'utf-8');
    autoResearchContent = readFileSync(join(basePath, 'PAI/Algorithm/Algorithm-Autoresearch.md'), 'utf-8');
  });

  it('1) [B]=binary default', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\*\*`\[B\]`\*\* \(binary\).*?\bDefault\b/i);
  });

  it('2) [Q]=scalar with causal link', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\*\*`\[Q\]`\*\* \(quantitative\).*?scalar metric with direct causal link/i);
  });

  it('3) || separator in metric def', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\(\`\|\|\` separates metric fields to avoid collision with shell pipes in \`cmd\`\)/i);
  });

  it('4) [B] as regression gates in both files', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\`\[B\]\` criteria serve as \*\*regression gates\*\*/i);
    // Check Algorithm-Autoresearch.md
    expect(autoResearchContent).toMatch(/\`\[B\]\` criteria from the PRD serve as regression gates during the sub-loop/i);
  });

  it('5) ISC-A as hard stops in both files', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\`ISC-A\` \(anti-criteria\) serve as \*\*hard stops\*\*/i);
    // Check Algorithm-Autoresearch.md
    expect(autoResearchContent).toMatch(/\`ISC-A\` anti-criteria serve as hard stops/i);
  });

  it('6) Gated to Extended+ effort only', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/- ISC-METRIC MAPPING \(Extended\+ effort only — skip entirely for Standard tier\):/i);
  });

  it('7) Quick check instruction exists', () => {
    // Check v4.0-alpha.md
    expect(v4AlphaContent).toMatch(/\*\*Quick check:\*\* If all criteria are binary pass\/fail, skip this section entirely/i);
  });
});
