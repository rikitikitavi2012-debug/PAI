import { test, expect, describe } from 'bun:test';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('LearnGate Retrospective Audit', () => {
  test('audit LEARN.md adoption across completed PRDs', () => {
    const memoryWorkDir = join(process.env.PAI_DIR || process.cwd(), 'MEMORY', 'WORK');

    if (!existsSync(memoryWorkDir)) {
      console.warn(`Directory not found: ${memoryWorkDir}`);
      expect(true).toBe(true);
      return;
    }

    const prdDirs = readdirSync(memoryWorkDir).filter(d =>
      statSync(join(memoryWorkDir, d)).isDirectory()
    );

    const prdsWithoutLearn: string[] = [];
    const prdsWithLearn: string[] = [];
    let totalCompleted = 0;

    for (const dir of prdDirs) {
      const prdPath = join(memoryWorkDir, dir, 'PRD.md');
      const learnPath = join(memoryWorkDir, dir, 'LEARN.md');

      if (existsSync(prdPath)) {
        const prdContent = readFileSync(prdPath, 'utf-8');

        // Check if phase is complete (case-insensitive to be safe)
        if (prdContent.match(/^phase:\s*complete\s*$/im)) {
          totalCompleted++;

          if (existsSync(learnPath)) {
            prdsWithLearn.push(dir);
          } else {
            prdsWithoutLearn.push(dir);
          }
        }
      }
    }

    console.log('\n--- LearnGate Retrospective Audit Results ---');
    console.log(`\nTotal completed PRDs found: ${totalCompleted}`);

    console.log(`\nPRDs WITH LEARN.md (${prdsWithLearn.length}):`);
    prdsWithLearn.forEach(dir => console.log(`  - ${dir}`));

    console.log(`\nPRDs WITHOUT LEARN.md (${prdsWithoutLearn.length}):`);
    // Outputting a sample or all depending on size, but we'll output all as requested by "Выведи список"
    prdsWithoutLearn.forEach(dir => console.log(`  - ${dir}`));

    const coverage = totalCompleted > 0
      ? ((prdsWithLearn.length / totalCompleted) * 100).toFixed(2)
      : '0.00';

    console.log(`\nAdoption Coverage: ${coverage}%\n`);

    // The test MUST NOT fail even if old PRDs lack LEARN.md, as this is an audit
    expect(true).toBe(true);
  });
});
