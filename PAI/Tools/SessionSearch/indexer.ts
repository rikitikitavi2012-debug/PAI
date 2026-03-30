#!/usr/bin/env bun
/**
 * PAI Session Indexer
 * Indexes Claude Code conversation history into SQLite FTS5 for fast search
 *
 * Usage:
 *   bun run indexer.ts              # Index all history
 *   bun run indexer.ts --incremental # Only index new entries
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_DIR = join(process.env.HOME!, '.claude');
const HISTORY_FILE = join(CLAUDE_DIR, 'history.jsonl');
const DB_FILE = join(__dirname, 'sessions.db');

interface HistoryEntry {
  sessionId: string;
  timestamp: number;
  display: string;
  pastedContents?: string;
  project?: string;
}

function initDatabase(): Database {
  const db = new Database(DB_FILE);

  // Enable WAL mode for better performance
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');

  // Load schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  return db;
}

function parseHistoryLine(line: string): HistoryEntry | null {
  try {
    const entry = JSON.parse(line);

    // Determine role based on display content
    // Claude Code format: user messages start with prompt, assistant has code blocks
    let role = 'user';
    if (entry.display?.includes('```') || entry.display?.includes('═')) {
      role = 'assistant';
    }

    // Combine display and pasted contents
    let content = entry.display || '';
    if (entry.pastedContents) {
      content += '\n\n[PASTED CONTENT]:\n' + entry.pastedContents;
    }

    return {
      sessionId: entry.sessionId,
      timestamp: entry.timestamp,
      display: content,
      project: entry.project || 'unknown',
    } as HistoryEntry;
  } catch {
    return null;
  }
}

function getLastIndexedTimestamp(db: Database): number {
  const result = db.query<{ max_timestamp: number }, []>(
    'SELECT MAX(timestamp) as max_timestamp FROM conversations'
  ).get();

  return result?.max_timestamp || 0;
}

function indexHistory(incremental: boolean = false): void {
  console.log('🔍 PAI Session Indexer\n');

  if (!existsSync(HISTORY_FILE)) {
    console.log('❌ No history file found at:', HISTORY_FILE);
    return;
  }

  const db = initDatabase();
  const lastTimestamp = incremental ? getLastIndexedTimestamp(db) : 0;

  console.log(`📁 History file: ${HISTORY_FILE}`);
  console.log(`📊 Database: ${DB_FILE}`);
  console.log(`⏱️  Last indexed: ${lastTimestamp ? new Date(lastTimestamp).toISOString() : 'Never'}`);
  console.log(`🔄 Mode: ${incremental ? 'Incremental' : 'Full'}\n`);

  // Read and parse history
  const historyContent = readFileSync(HISTORY_FILE, 'utf-8');
  const lines = historyContent.trim().split('\n');

  console.log(`📖 Found ${lines.length} entries in history\n`);

  // Prepare insert statement
  const insert = db.prepare(`
    INSERT INTO conversations (session_id, timestamp, project, role, content)
    VALUES ($sessionId, $timestamp, $project, $role, $content)
  `);

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  const transaction = db.transaction(() => {
    for (const line of lines) {
      const entry = parseHistoryLine(line);

      if (!entry) {
        errors++;
        continue;
      }

      // Skip if already indexed (incremental mode)
      if (entry.timestamp <= lastTimestamp) {
        skipped++;
        continue;
      }

      try {
        insert.run({
          $sessionId: entry.sessionId,
          $timestamp: entry.timestamp,
          $project: entry.project,
          $role: entry.display?.includes('═') ? 'assistant' : 'user',
          $content: entry.display,
        });
        indexed++;
      } catch (err) {
        errors++;
      }
    }
  });

  transaction();

  db.close();

  console.log('✅ Indexing complete!\n');
  console.log(`📊 Statistics:`);
  console.log(`   Indexed: ${indexed}`);
  console.log(`   Skipped: ${skipped} (already indexed)`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n💡 Try searching: bun run search.ts "your query"`);
}

// CLI
const args = process.argv.slice(2);
const incremental = args.includes('--incremental');

indexHistory(incremental);
