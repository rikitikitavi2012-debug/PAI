import { describe, expect, test, beforeAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('THEHOOKSYSTEM.md Accuracy Verification', () => {
  let settings: any;
  let mdContent: string;
  let settingsEventTypes: string[];

  beforeAll(() => {
    // Determine the base path (use PAI_DIR if set, otherwise process.cwd())
    const basePath = process.env.PAI_DIR || process.cwd();

    // Read settings.json
    const settingsPath = path.join(basePath, 'settings.json');
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsContent);
    settingsEventTypes = Object.keys(settings.hooks || {});

    // Read PAI/THEHOOKSYSTEM.md
    const mdPath = path.join(basePath, 'PAI', 'THEHOOKSYSTEM.md');
    mdContent = fs.readFileSync(mdPath, 'utf8');
  });

  test('Count event types in settings.json — must be >= 15', () => {
    expect(settingsEventTypes.length).toBeGreaterThanOrEqual(15);
  });

  test('Verify THEHOOKSYSTEM.md mentions all event types from settings.json', () => {
    for (const eventType of settingsEventTypes) {
      // Check that the markdown contains the event type
      const regex = new RegExp(eventType, 'i');
      expect(mdContent).toMatch(regex);
    }
  });

  test('Verify the documented hook count mentions 34 or more hook files', () => {
    // Look for pattern like "34 hook files"
    const regex = /(\d+)\s+hook files/i;
    const match = mdContent.match(regex);
    expect(match).not.toBeNull();
    if (match) {
      const count = parseInt(match[1], 10);
      expect(count).toBeGreaterThanOrEqual(34);
    }
  });

  test('Verify specific event types are documented', () => {
    const specificEvents = [
      'ConfigChange',
      'SubagentStart',
      'SubagentStop',
      'WorktreeCreate',
      'WorktreeRemove',
      'InstructionsLoaded',
      'TeammateIdle',
      'TaskCompleted'
    ];

    for (const event of specificEvents) {
      const regex = new RegExp(event, 'i');
      expect(mdContent).toMatch(regex);
    }
  });
});
