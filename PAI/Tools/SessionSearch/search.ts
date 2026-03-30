#!/usr/bin/env bun
/**
 * PAI Session Search
 * Full-text search across Claude Code conversation history using FTS5
 *
 * Usage:
 *   bun run search.ts "терраса бюджет"
 *   bun run search.ts "A0 backup" --limit 20
 */

import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(__dirname, 'sessions.db');

interface SearchResult {
  session_id: string;
  project: string;
  snippet: string;
  rank: number;
}

function highlightSnippet(snippet: string): string {
  // FTS5 returns snippets with <b> tags by default
  return snippet
    .replace(/<b>/g, '\x1b[1;33m')  // Bold yellow
    .replace(/<\/b>/g, '\x1b[0m');   // Reset
}

function search(query: string, limit: number = 10): void {
  const db = new Database(DB_FILE);

  // Simple FTS5 query - escape special characters
  const escapedQuery = query.replace(/['"]/g, '');

  const ftsSql = `
    SELECT
      session_id,
      project,
      snippet(conversations_fts, 0, '<b>', '</b>', '...', 30) as snippet,
      rank
    FROM conversations_fts
    WHERE conversations_fts MATCH '${escapedQuery}'
    ORDER BY rank
    LIMIT ${limit}
  `;

  // Fallback LIKE query for Russian/Unicode text
  const likeSql = `
    SELECT
      c.session_id,
      c.project,
      SUBSTR(c.content, 1, 200) as snippet,
      0 as rank
    FROM conversations c
    WHERE c.content LIKE '%${escapedQuery}%'
    ORDER BY c.timestamp DESC
    LIMIT ${limit}
  `;

  try {
    // Try FTS first
    let stmt = db.prepare(ftsSql);
    let results = stmt.all() as SearchResult[];

    // Fallback to LIKE if no results (for Russian text)
    if (results.length === 0) {
      stmt = db.prepare(likeSql);
      results = stmt.all() as SearchResult[];
    }

    if (results.length === 0) {
      console.log('\n❌ No results found for:', query);
      console.log('\n💡 Tips:');
      console.log('   - Try different keywords');
      console.log('   - Use simpler search terms');
      console.log('   - Run indexer first: bun run indexer.ts');
      return;
    }

    console.log(`\n🔍 Found ${results.length} results for: "${query}"\n`);

    for (const result of results) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📁 Project: ${result.project}`);
      console.log(`📊 Session: ${result.session_id.substring(0, 8)}...`);
      console.log(`\n${highlightSnippet(result.snippet)}\n`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  } catch (err: any) {
    if (err.message?.includes('fts5: syntax error')) {
      console.log('\n❌ Invalid search query');
      console.log('\n💡 Try simpler search terms without special characters');
    } else {
      throw err;
    }
  } finally {
    db.close();
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🔍 PAI Session Search

Usage:
  bun run search.ts "query" [limit]

Examples:
  bun run search.ts "терраса бюджет"
  bun run search.ts "A0 backup" 20
`);
  process.exit(0);
}

const query = args[0];
const limit = args[1] ? parseInt(args[1]) : 10;

search(query, limit);
