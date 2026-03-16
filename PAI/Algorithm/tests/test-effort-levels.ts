import { describe, expect, test, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Effort Level Consistency Test', () => {
  let content: string;
  let effortLevelsTable: any[] = [];
  let iterationBudgetTable: any[] = [];
  let iscCountGateTable: any[] = [];

  beforeAll(() => {
    content = readFileSync(join(import.meta.dir, '../v4.0.0.md'), 'utf8');

    const lines = content.split('\n');
    let currentTable = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('### Effort Levels')) {
        currentTable = 'EffortLevels';
      } else if (line.startsWith('### Iteration Budget')) {
        currentTable = 'IterationBudget';
      } else if (line.includes('ISC COUNT GATE')) {
        currentTable = 'ISCCountGate';
      } else if (line.startsWith('**If ISC count < floor:')) {
        if (currentTable === 'ISCCountGate') currentTable = '';
      } else if (line.startsWith('### ') || line.startsWith('**Decomposition by domain:**') || line.startsWith('- ISC-METRIC MAPPING')) {
        currentTable = '';
      }

      if (currentTable && line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|');
        if (parts.length > 2) {
          const columns = parts.slice(1, parts.length - 1).map(col => col.trim());
          if (columns[0] !== 'Tier') {
            const cleanTier = columns[0].replace(/\*/g, '');

            if (currentTable === 'EffortLevels') {
              effortLevelsTable.push({
                tier: cleanTier,
                budget: columns[1],
                iscRange: columns[2],
                minCapabilities: columns[3],
                when: columns[4]
              });
            } else if (currentTable === 'IterationBudget') {
              iterationBudgetTable.push({
                tier: cleanTier,
                defaultCap: columns[1],
                configurableRange: columns[2]
              });
            } else if (currentTable === 'ISCCountGate') {
              iscCountGateTable.push({
                tier: cleanTier,
                floor: parseInt(columns[1], 10),
                ifBelow: columns[2]
              });
            }
          }
        }
      }
    }
  });

  test('Effort Levels table has exactly 5 tiers', () => {
    expect(effortLevelsTable.length).toBe(5);
    const tiers = effortLevelsTable.map(r => r.tier);
    expect(tiers).toEqual(['Standard', 'Extended', 'Advanced', 'Deep', 'Comprehensive']);
  });

  test('Iteration Budget table has exactly 5 tiers', () => {
    expect(iterationBudgetTable.length).toBe(5);
    const tiers = iterationBudgetTable.map(r => r.tier);
    expect(tiers).toEqual(['Standard', 'Extended', 'Advanced', 'Deep', 'Comprehensive']);
  });

  test('Standard tier in Iteration Budget has N/A configurable range', () => {
    const standardRow = iterationBudgetTable.find(r => r.tier === 'Standard');
    expect(standardRow).toBeDefined();
    expect(standardRow!.configurableRange).toContain('N/A');
  });

  test('ISC Count Gate floors are exactly 8, 16, 24, 40, 64', () => {
    expect(iscCountGateTable.length).toBe(5);
    const floors = iscCountGateTable.map(r => r.floor);
    expect(floors).toEqual([8, 16, 24, 40, 64]);

    const tiers = iscCountGateTable.map(r => r.tier);
    expect(tiers).toEqual(['Standard', 'Extended', 'Advanced', 'Deep', 'Comprehensive']);
  });

  test('ISC Range values are consistent with the floors', () => {
    expect(effortLevelsTable[0].iscRange).toBe('8-16');
    expect(effortLevelsTable[1].iscRange).toBe('16-32');
    expect(effortLevelsTable[2].iscRange).toBe('24-48');
    expect(effortLevelsTable[3].iscRange).toBe('40-80');
    expect(effortLevelsTable[4].iscRange).toBe('64-150');

    for (let i = 0; i < effortLevelsTable.length; i++) {
        const floorStr = effortLevelsTable[i].iscRange.split('-')[0];
        expect(parseInt(floorStr, 10)).toBe(iscCountGateTable[i].floor);
    }
  });

  test('No missing tiers in any table', () => {
    const expectedTiers = ['Standard', 'Extended', 'Advanced', 'Deep', 'Comprehensive'];

    const effortTiers = effortLevelsTable.map(r => r.tier);
    const iterationTiers = iterationBudgetTable.map(r => r.tier);
    const iscGateTiers = iscCountGateTable.map(r => r.tier);

    expectedTiers.forEach(tier => {
        expect(effortTiers).toContain(tier);
        expect(iterationTiers).toContain(tier);
        expect(iscGateTiers).toContain(tier);
    });
  });
});
