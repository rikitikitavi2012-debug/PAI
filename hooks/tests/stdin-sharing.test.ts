import { test, expect, describe } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('settings.json stdin sharing rules', () => {
  const settingsPath = path.join(import.meta.dir, '../../settings.json');
  const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
  const settings = JSON.parse(settingsContent);

  test('should have more than 40 hooks configured', () => {
    let totalHooks = 0;

    for (const eventType in settings.hooks) {
      const entries = settings.hooks[eventType];
      for (const entry of entries) {
        if (entry.hooks && Array.isArray(entry.hooks)) {
          totalHooks += entry.hooks.length;
        }
      }
    }

    expect(totalHooks).toBeGreaterThan(40);
  });

  test('should not have more than 1 hook per entry to prevent stdin sharing', () => {
    for (const eventType in settings.hooks) {
      const entries = settings.hooks[eventType];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.hooks && Array.isArray(entry.hooks)) {
          // Assert that the entry has MAXIMUM 1 hook in its 'hooks' array
          // This applies to EVERY event type (UserPromptSubmit, SessionEnd, Stop, SubagentStart, etc.)
          // including PreToolUse and PostToolUse
          if (entry.hooks.length > 1) {
            throw new Error(`Event '${eventType}' entry at index ${i} has ${entry.hooks.length} hooks. Maximum allowed is 1 to prevent stdin sharing.`);
          }
          expect(entry.hooks.length).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
