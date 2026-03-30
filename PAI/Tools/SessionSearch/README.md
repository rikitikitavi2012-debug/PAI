# PAI Session Search

Full-text search across Claude Code conversation history using SQLite FTS5.

## Quick Start

```bash
# Index conversations (run once)
bun run indexer.ts

# Search
bun run search.ts "query" [limit]

# Examples
bun run search.ts "терраса" 5
bun run search.ts "A0 backup"
```

## Skill

```
/recall <query> [limit]
```

## Components

| File | Purpose |
|------|---------|
| `schema.sql` | FTS5 database schema |
| `indexer.ts` | Index history.jsonl into SQLite |
| `search.ts` | CLI search tool |
| `index-hook.ts` | Auto-indexing hook |

## Features

- ✅ FTS5 BM25 ranking
- ✅ LIKE fallback for Russian text
- ✅ Snippet highlighting
- ✅ Project attribution
- ✅ Auto-indexing on session end

## Database

- Location: `sessions.db`
- Table: `conversations` (main) + `conversations_fts` (FTS5)
- Size: ~1366+ conversations indexed

## Technical Details

- **Tokenizer:** Porter stemmer + unicode61
- **Mode:** WAL for concurrent access
- **Ranking:** BM25 (lower = more relevant)
- **Fallback:** LIKE query for Unicode text

## Integration

The `index-hook.ts` can be added to `settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": ["bun", "run", "~/.claude/PAI/Tools/SessionSearch/index-hook.ts"]
    }]
  }
}
```

## Related

- MEMORY/reference_session_search.md
- PAI/Skills/recall/SKILL.md
