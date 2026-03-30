---
name: Session Search (FTS5)
description: FTS5 full-text search across Claude Code conversation history with Russian support
type: reference
---

# PAI Session Search System

**Location:** `~/.claude/PAI/Tools/SessionSearch/`

**Components:**
- `schema.sql` — FTS5 database schema
- `indexer.ts` — Indexes history.jsonl into SQLite
- `search.ts` — CLI search tool
- `index-hook.ts` — Auto-indexing hook (runs on session end)

**Usage:**
```bash
# Search
bun run ~/.claude/PAI/Tools/SessionSearch/search.ts "query" [limit]

# Manual re-index
bun run ~/.claude/PAI/Tools/SessionSearch/indexer.ts

# Incremental index (only new entries)
bun run ~/.claude/PAI/Tools/SessionSearch/indexer.ts --incremental
```

**Skill:** `/recall <query> [limit]`

**Database:** `sessions.db` (SQLite with FTS5)

**Features:**
- FTS5 BM25 ranking for relevance
- LIKE fallback for Russian/Unicode text
- Snippet highlighting with context
- Project attribution
- Session grouping

**Technical Details:**
- 1366+ conversations indexed
- Porter stemmer + unicode61 tokenizer
- WAL mode for concurrent access
- Automatic indexing on session end via hook

**When to Use:**
- "О чём мы говорили про X?"
- "Find previous discussions about Y"
- "Search history for Z"
- Context recall from past sessions

**Related:** MEMORY/ system, FRAMES/ patterns, Algorithm LEARN phase
