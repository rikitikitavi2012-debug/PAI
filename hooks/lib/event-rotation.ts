/**
 * event-rotation.ts — Events log rotation for the Unified Event System
 *
 * Rotates events.jsonl by archiving events older than 7 days into
 * monthly archive files (events-archive-YYYY-MM.jsonl) in the same directory.
 *
 * Design:
 * - Fresh events (<=7 days) stay in events.jsonl
 * - Old events (>7 days) are appended to events-archive-YYYY-MM.jsonl
 * - Archive files are grouped by the event's timestamp month
 * - Malformed lines are silently dropped (not preserved)
 * - Idempotent: running multiple times is safe
 * - Atomic-ish: writes archive first, then overwrites main file
 *
 * Usage:
 *   import { rotateEvents } from './lib/event-rotation';
 *   const result = rotateEvents('/path/to/events.jsonl');
 *   // result = { archived: 5, kept: 10, archiveFile: '...' | null }
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';

const RETENTION_DAYS = 7;

/**
 * Rotate events.jsonl — archive events older than 7 days.
 *
 * @param eventsPath - Absolute path to events.jsonl
 * @returns Counts of archived and kept events
 */
export function rotateEvents(eventsPath: string): { archived: number; kept: number; archiveFile: string | null } {
  if (!existsSync(eventsPath)) {
    return { archived: 0, kept: 0, archiveFile: null };
  }

  const content = readFileSync(eventsPath, 'utf-8').trim();
  if (!content) {
    return { archived: 0, kept: 0, archiveFile: null };
  }

  const lines = content.split('\n');
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const dir = dirname(eventsPath);

  const fresh: string[] = [];
  // Group old events by month for archive files
  const archiveByMonth = new Map<string, string[]>();

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const evt = JSON.parse(line);
      const ts = new Date(evt.timestamp);

      if (isNaN(ts.getTime())) {
        // Invalid timestamp — drop the line
        continue;
      }

      if (ts.getTime() <= cutoff) {
        // Old event — route to archive by month
        const month = evt.timestamp.slice(0, 7); // YYYY-MM
        if (!archiveByMonth.has(month)) {
          archiveByMonth.set(month, []);
        }
        archiveByMonth.get(month)!.push(line);
      } else {
        // Fresh event — keep in main file
        fresh.push(line);
      }
    } catch {
      // Malformed JSON — drop silently
      continue;
    }
  }

  let totalArchived = 0;
  let lastArchiveFile: string | null = null;

  // Write archive files (append, not overwrite)
  for (const [month, events] of archiveByMonth) {
    const archivePath = join(dir, `events-archive-${month}.jsonl`);
    appendFileSync(archivePath, events.join('\n') + '\n', 'utf-8');
    totalArchived += events.length;
    lastArchiveFile = archivePath;
  }

  // Overwrite events.jsonl with only fresh events (also drops malformed lines)
  if (totalArchived > 0 || fresh.length !== lines.filter((l) => l.trim()).length) {
    const freshContent = fresh.length > 0 ? fresh.join('\n') + '\n' : '';
    writeFileSync(eventsPath, freshContent, 'utf-8');
  }

  return {
    archived: totalArchived,
    kept: fresh.length,
    archiveFile: lastArchiveFile,
  };
}

/**
 * Rotate events.jsonl if it exceeds maxLines.
 * Keeps the last 3000 lines and archives the rest to events-archive-YYYY-MM.jsonl.
 *
 * @param eventsPath - Absolute path to events.jsonl
 * @param maxLines - Threshold for rotation (default 5000)
 */
export function rotateIfNeeded(eventsPath: string, maxLines: number = 5000): void {
  if (!existsSync(eventsPath)) return;

  const content = readFileSync(eventsPath, 'utf-8').trim();
  if (!content) return;

  const lines = content.split('\n');
  if (lines.length <= maxLines) return;

  const KEEP_LINES = 3000;
  const keepStartIndex = Math.max(0, lines.length - KEEP_LINES);

  const toArchive = lines.slice(0, keepStartIndex);
  const toKeep = lines.slice(keepStartIndex);

  const dir = dirname(eventsPath);
  const archiveByMonth = new Map<string, string[]>();

  for (const line of toArchive) {
    if (!line.trim()) continue;

    let month = 'unknown';
    try {
      const evt = JSON.parse(line);
      const ts = new Date(evt.timestamp);
      if (!isNaN(ts.getTime())) {
        month = evt.timestamp.slice(0, 7); // YYYY-MM
      }
    } catch {
      // If parsing fails, just use the current month for the archive file
      const d = new Date();
      month = d.toISOString().slice(0, 7);
    }

    if (!archiveByMonth.has(month)) {
      archiveByMonth.set(month, []);
    }
    archiveByMonth.get(month)!.push(line);
  }

  // Write archive files (append, not overwrite)
  for (const [month, events] of archiveByMonth) {
    const archivePath = join(dir, `events-archive-${month}.jsonl`);
    appendFileSync(archivePath, events.join('\n') + '\n', 'utf-8');
  }

  // Overwrite events.jsonl with only kept events atomically
  const tempPath = join(dir, 'events.jsonl.tmp');
  const keptContent = toKeep.length > 0 ? toKeep.join('\n') + '\n' : '';
  writeFileSync(tempPath, keptContent, 'utf-8');
  renameSync(tempPath, eventsPath);
}
