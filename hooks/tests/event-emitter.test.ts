import { test, expect, mock, beforeEach, afterEach, describe, beforeAll } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';

// Set PAI_DIR before importing event-emitter so it uses a temp dir.
// Important: This needs to happen early, and the tempDir needs to be valid.
const tempDir = mkdtempSync(join(tmpdir(), 'pai-test-events-'));
process.env.PAI_DIR = tempDir;

// We need to import event-emitter after setting the environment variable
// so the BASE_DIR logic expands correctly into the temp directory.
import { appendEvent, getEventsPath } from '../lib/event-emitter';

describe('event-emitter', () => {
  let eventsPath: string;

  beforeAll(() => {
    eventsPath = getEventsPath();
  });

  afterEach(() => {
    // Clean up the events file/directory after each test to ensure isolation
    if (existsSync(eventsPath)) {
      if (statSync(eventsPath).isDirectory()) {
         rmSync(eventsPath, { recursive: true, force: true });
      } else {
         rmSync(eventsPath, { force: true });
      }
    }
  });

  // 1. appendEvent() adds JSON string to events.jsonl
  test('appends JSON string to events.jsonl', () => {
    // Ensure clean slate just in case
    if (existsSync(eventsPath)) {
      rmSync(eventsPath, { recursive: true, force: true });
    }

    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'THINK' });

    expect(existsSync(eventsPath)).toBe(true);
    const content = readFileSync(eventsPath, 'utf-8');
    const event = JSON.parse(content.trim());

    expect(event.type).toBe('algorithm.phase');
    expect(event.source).toBe('test');
    expect(event.phase).toBe('THINK');
  });

  // 2. Event contains timestamp in ISO format
  test('event contains ISO timestamp', () => {
    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'THINK' });

    const content = readFileSync(eventsPath, 'utf-8');
    const event = JSON.parse(content.trim());

    expect(event.timestamp).toBeDefined();
    // Verify ISO format by parsing and re-stringifying
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  // 3. Event contains session_id
  test('event contains session_id', () => {
    const originalSessionId = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = 'test-session-123';

    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'THINK' });

    const content = readFileSync(eventsPath, 'utf-8');
    const event = JSON.parse(content.trim());

    expect(event.session_id).toBe('test-session-123');

    // Restore original session ID
    if (originalSessionId) {
      process.env.CLAUDE_SESSION_ID = originalSessionId;
    } else {
      delete process.env.CLAUDE_SESSION_ID;
    }
  });

  // 4. Event contains type and source fields
  test('event contains type and source fields', () => {
    appendEvent({ type: 'work.created', source: 'test-hook', slug: 'test-slug' });

    const content = readFileSync(eventsPath, 'utf-8');
    const event = JSON.parse(content.trim());

    expect(event.type).toBe('work.created');
    expect(event.source).toBe('test-hook');
    expect(event.slug).toBe('test-slug');
  });

  // 5. Multiple calls write to separate lines (JSONL format)
  test('multiple calls write to separate lines (JSONL format)', () => {
    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'OBSERVE' });
    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'THINK' });

    const content = readFileSync(eventsPath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);

    const event1 = JSON.parse(lines[0]);
    const event2 = JSON.parse(lines[1]);

    expect(event1.phase).toBe('OBSERVE');
    expect(event2.phase).toBe('THINK');
  });

  // 6. Non-existent file and directories are created automatically
  test('creates file and directories automatically if they do not exist', () => {
    // File shouldn't exist initially due to afterEach cleanup
    expect(existsSync(eventsPath)).toBe(false);

    appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'OBSERVE' });

    expect(existsSync(eventsPath)).toBe(true);
  });

  // 7. Write errors do not throw an exception (fail-open)
  test('gracefully fails and does not throw if write fails', () => {
    // Make the target path a directory to simulate a write error (EISDIR)
    mkdirSync(eventsPath, { recursive: true });

    // This should not throw an exception (fail-open)
    expect(() => {
      appendEvent({ type: 'algorithm.phase', source: 'test', phase: 'OBSERVE' });
    }).not.toThrow();
  });
});
