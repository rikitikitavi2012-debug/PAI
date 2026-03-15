import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Hooks Compatibility Check', () => {
  const hooksDir = join(process.cwd(), 'hooks');
  const settingsPath = join(process.cwd(), 'settings.json');
  const latestPath = join(process.cwd(), 'PAI', 'Algorithm', 'LATEST');

  test('No hook hardcodes v3.6.0.md or v3.5.0.md', async () => {
    // We will check ModeClassifier.hook.ts directly
    const modeClassifierPath = join(hooksDir, 'ModeClassifier.hook.ts');
    const content = readFileSync(modeClassifierPath, 'utf8');

    expect(content).not.toContain('v3.6.0.md');
    expect(content).not.toContain('v3.5.0.md');

    // Check it reads from LATEST
    expect(content).toContain('readFileSync(latestPath, \'utf8\')');
  });

  test('LATEST file contains v4.0-alpha', () => {
    expect(existsSync(latestPath)).toBe(true);
    const latestVersion = readFileSync(latestPath, 'utf8').trim();
    expect(latestVersion).toBe('v4.0-alpha');
  });

  test('settings.json has no direct version ref (algorithmVersion)', () => {
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

    // Check the specific property does not exist
    if (settings.pai) {
      expect(settings.pai.algorithmVersion).toBeUndefined();
    }

    const settingsContent = readFileSync(settingsPath, 'utf8');
    expect(settingsContent).not.toContain('"algorithmVersion"');
  });

  test('AlgorithmTracker works with CYCLE SELECTOR phase', () => {
    // Check algorithm-state.ts for CYCLE SELECTOR
    const statePath = join(hooksDir, 'lib', 'algorithm-state.ts');
    const stateContent = readFileSync(statePath, 'utf8');
    expect(stateContent).toContain("'CYCLE SELECTOR'");

    // Check tab-constants.ts for CYCLE SELECTOR
    const tabPath = join(hooksDir, 'lib', 'tab-constants.ts');
    const tabContent = readFileSync(tabPath, 'utf8');
    expect(tabContent).toContain("'CYCLE SELECTOR':");

    // Check AlgorithmTracker.hook.ts detection
    const trackerPath = join(hooksDir, 'AlgorithmTracker.hook.ts');
    const trackerContent = readFileSync(trackerPath, 'utf8');
    expect(trackerContent).toContain("command.includes('CYCLE SELECTOR')");
    expect(trackerContent).toContain("phase: 'CYCLE SELECTOR'");
  });
});
