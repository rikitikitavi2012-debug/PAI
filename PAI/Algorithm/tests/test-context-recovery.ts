import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Algorithm Context Recovery Tests', () => {
    let alphaContent: string;
    let autoResearchContent: string;

    beforeAll(() => {
        alphaContent = readFileSync(join(import.meta.dir, '../v4.0-alpha.md'), 'utf8');
        autoResearchContent = readFileSync(join(import.meta.dir, '../Algorithm-Autoresearch.md'), 'utf8');
    });

    it('Main has 5 recovery steps', () => {
        const contextRecoverySection = alphaContent.split('### Context Recovery')[1].split('###')[0];

        expect(contextRecoverySection).toContain('1. Read the most recent PRD');
        expect(contextRecoverySection).toContain('2. PRD frontmatter has');
        expect(contextRecoverySection).toContain('3. PRD body has');
        expect(contextRecoverySection).toContain('4. `~/.claude/MEMORY/STATE/work.json`');
        expect(contextRecoverySection).toContain('5. If `[Q]` criteria were used');

        const lines = contextRecoverySection.split('\n').filter(line => line.trim().match(/^\d+\./));
        expect(lines.length).toBe(5);
    });

    it('Autoresearch has 4 items from TSV', () => {
        const contextRecoverySection = autoResearchContent.split('### Context Recovery (during Autoresearch)')[1].split('###')[0];

        const bulletPoints = contextRecoverySection.split('\n').filter(line => line.trim().startsWith('- **'));
        expect(bulletPoints.length).toBe(4);
    });

    it('Items: iteration count, metric, re-entry count, consecutive discards', () => {
        const contextRecoverySection = autoResearchContent.split('### Context Recovery (during Autoresearch)')[1].split('###')[0];

        expect(contextRecoverySection).toMatch(/- \*\*Iteration count:\*\*/);
        expect(contextRecoverySection).toMatch(/- \*\*Current metric:\*\*/);
        expect(contextRecoverySection).toMatch(/- \*\*Re-entry count:\*\*/);
        expect(contextRecoverySection).toMatch(/- \*\*Consecutive discards:\*\*/);
    });

    it('PRD as primary source and no state only in LLM memory', () => {
        const contextRecoverySection = alphaContent.split('### Context Recovery')[1].split('###')[0];

        // "PRD as primary source" equivalent phrase
        expect(contextRecoverySection).toContain('Read the most recent PRD from `MEMORY/WORK/` (by mtime) — it has all state');

        // Checking for statement about "all state" which enforces no state only in LLM memory
        expect(contextRecoverySection).toContain('it has all state');
    });

    it('think_reentries header format', () => {
        expect(autoResearchContent).toContain('`# think_reentries: N` header comment');
    });
});
