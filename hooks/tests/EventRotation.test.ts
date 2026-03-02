import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { createTempDir, cleanupTempDir } from './harness';

/**
 * EventRotation tests — validates the rotateEvents() function
 *
 * Tests use a temp directory to avoid touching real events.jsonl.
 * The rotation function is imported directly for unit testing.
 */

// We'll import from the rotation module once it exists
let rotateEvents: (eventsPath: string) => { archived: number; kept: number; archiveFile: string | null };

// Dynamic import to get the function
beforeEach(async () => {
  const mod = await import('../lib/event-rotation');
  rotateEvents = mod.rotateEvents;
});

describe('EventRotation', () => {
  let tempDir: string;
  let eventsPath: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-rotation-test-');
    eventsPath = join(tempDir, 'events.jsonl');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  // Helper to create an event line with a specific timestamp
  function makeEvent(timestamp: string, type: string = 'voice.sent'): string {
    return JSON.stringify({
      type,
      source: 'TestHarness',
      timestamp,
      session_id: 'test-session',
    });
  }

  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  test('no events file → returns zero counts, no crash', () => {
    const result = rotateEvents(join(tempDir, 'nonexistent.jsonl'));
    expect(result.archived).toBe(0);
    expect(result.kept).toBe(0);
    expect(result.archiveFile).toBeNull();
  });

  test('empty events file → returns zero counts', () => {
    writeFileSync(eventsPath, '');
    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(0);
    expect(result.kept).toBe(0);
    expect(result.archiveFile).toBeNull();
  });

  test('all events within 7 days → nothing archived', () => {
    const lines = [
      makeEvent(daysAgo(0), 'voice.sent'),
      makeEvent(daysAgo(1), 'prd.synced'),
      makeEvent(daysAgo(3), 'rating.captured'),
      makeEvent(daysAgo(6), 'agent.start'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(0);
    expect(result.kept).toBe(4);
    expect(result.archiveFile).toBeNull();

    // Events file should be unchanged
    const remaining = readFileSync(eventsPath, 'utf-8').trim().split('\n');
    expect(remaining.length).toBe(4);
  });

  test('all events older than 7 days → all archived, events.jsonl empty', () => {
    // Use dates all within the same month to test single-archive case
    const lines = [
      makeEvent(daysAgo(10), 'voice.sent'),
      makeEvent(daysAgo(12), 'prd.synced'),
      makeEvent(daysAgo(14), 'rating.captured'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(3);
    expect(result.kept).toBe(0);
    expect(result.archiveFile).not.toBeNull();

    // events.jsonl should be empty (or contain no events)
    const remaining = readFileSync(eventsPath, 'utf-8').trim();
    expect(remaining).toBe('');

    // Archive file should exist and contain the archived events
    const archiveContent = readFileSync(result.archiveFile!, 'utf-8').trim().split('\n');
    expect(archiveContent.length).toBeGreaterThanOrEqual(3);
  });

  test('mixed events → splits correctly', () => {
    const lines = [
      makeEvent(daysAgo(14), 'voice.sent'),        // archive
      makeEvent(daysAgo(10), 'prd.synced'),         // archive
      makeEvent(daysAgo(8), 'rating.captured'),     // archive
      makeEvent(daysAgo(5), 'agent.start'),         // keep
      makeEvent(daysAgo(1), 'agent.stop'),          // keep
      makeEvent(daysAgo(0), 'task.completed'),      // keep
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(3);
    expect(result.kept).toBe(3);

    // Verify events.jsonl contains only fresh events
    const remaining = readFileSync(eventsPath, 'utf-8').trim().split('\n');
    expect(remaining.length).toBe(3);
    for (const line of remaining) {
      const evt = JSON.parse(line);
      const age = Date.now() - new Date(evt.timestamp).getTime();
      expect(age).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 60000); // 7 days + 1 min tolerance
    }

    // Verify total archived events across all archive files
    expect(result.archived).toBe(3);
  });

  test('archive file uses YYYY-MM format from event timestamps', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    const expectedMonth = oldDate.toISOString().slice(0, 7); // YYYY-MM

    const lines = [
      makeEvent(oldDate.toISOString(), 'voice.sent'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archiveFile).toContain(`events-archive-${expectedMonth}.jsonl`);
  });

  test('idempotent — running twice produces same result', () => {
    const lines = [
      makeEvent(daysAgo(10), 'voice.sent'),
      makeEvent(daysAgo(1), 'agent.start'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result1 = rotateEvents(eventsPath);
    expect(result1.archived).toBe(1);
    expect(result1.kept).toBe(1);

    // Run again — no old events left to archive
    const result2 = rotateEvents(eventsPath);
    expect(result2.archived).toBe(0);
    expect(result2.kept).toBe(1);

    // Events file should still have only the fresh event
    const remaining = readFileSync(eventsPath, 'utf-8').trim().split('\n');
    expect(remaining.length).toBe(1);
  });

  test('appends to existing archive file (does not overwrite)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    const monthStr = oldDate.toISOString().slice(0, 7);
    const archivePath = join(tempDir, `events-archive-${monthStr}.jsonl`);

    // Pre-populate archive with 2 existing events
    const existingArchive = [
      makeEvent(daysAgo(40), 'existing.event1'),
      makeEvent(daysAgo(35), 'existing.event2'),
    ];
    writeFileSync(archivePath, existingArchive.join('\n') + '\n');

    // Write events file with one old event from the same month
    const lines = [
      makeEvent(oldDate.toISOString(), 'voice.sent'),
      makeEvent(daysAgo(1), 'agent.start'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(1);

    // Archive should now have 3 events (2 existing + 1 new)
    const archiveLines = readFileSync(archivePath, 'utf-8').trim().split('\n');
    expect(archiveLines.length).toBe(3);
  });

  test('handles malformed lines gracefully', () => {
    const lines = [
      makeEvent(daysAgo(10), 'voice.sent'),
      'this is not json',
      makeEvent(daysAgo(1), 'agent.start'),
      '{invalid json too',
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    // Should archive the old event and keep the fresh one
    // Malformed lines are dropped
    expect(result.archived).toBe(1);
    expect(result.kept).toBe(1);
  });

  test('events from different months go to different archive files', () => {
    // Create events from two different months
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const month1 = twoMonthsAgo.toISOString().slice(0, 7);
    const month2 = oneMonthAgo.toISOString().slice(0, 7);

    const lines = [
      makeEvent(twoMonthsAgo.toISOString(), 'voice.sent'),
      makeEvent(oneMonthAgo.toISOString(), 'prd.synced'),
      makeEvent(daysAgo(1), 'agent.start'),
    ];
    writeFileSync(eventsPath, lines.join('\n') + '\n');

    const result = rotateEvents(eventsPath);
    expect(result.archived).toBe(2);
    expect(result.kept).toBe(1);

    // Both archive files should exist
    const archive1 = join(tempDir, `events-archive-${month1}.jsonl`);
    const archive2 = join(tempDir, `events-archive-${month2}.jsonl`);
    expect(existsSync(archive1)).toBe(true);
    expect(existsSync(archive2)).toBe(true);

    // Each should have 1 event
    expect(readFileSync(archive1, 'utf-8').trim().split('\n').length).toBe(1);
    expect(readFileSync(archive2, 'utf-8').trim().split('\n').length).toBe(1);
  });
});
