# Recall Skill

**Description:** Full-text search across PAI conversation history using FTS5

**Trigger Phrases:**
- `/recall <query>`
- `find <query> in history`
- `search history for <query>`
- `что мы говорили про <query>`
- `найди в истории <query>`

**Usage:**
```
/recall терраса бюджет        # Search for terrace and budget mentions
/recall A0 backup             # Find A0 backup discussions
/recall ошибка hook           # Search for hook errors
/recall "exact phrase"        # Search for exact phrase
/recall timber 20             # Limit to 20 results
```

**Implementation:**
```bash
bun run ~/.claude/PAI/Tools/SessionSearch/search.ts "<query>" [limit]
```

**Features:**
- FTS5 full-text search with BM25 ranking
- Fallback LIKE query for Russian/Unicode text
- Snippet highlighting with context
- Session grouping
- Project attribution

**Examples:**
- `/recall алгоритм` → Find all Algorithm discussions
- `/recall A0 backup 15` → Last 15 A0 backup mentions
- `/recall Jules PR` → Find Jules PR discussions

**Notes:**
- Indexing happens automatically at session end
- Manual re-index: `bun run ~/.claude/PAI/Tools/SessionSearch/indexer.ts`
- Database: `~/.claude/PAI/Tools/SessionSearch/sessions.db`
