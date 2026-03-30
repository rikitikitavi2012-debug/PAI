# Knowledge Base Management Workflow

**Mode:** Create, manage, and query persistent knowledge bases | **Timeout:** 5 minutes

## When to Use

- Create or manage a knowledge base for ongoing reference
- "создай базу знаний", "knowledge base", "manage notebooks"
- List, query, or update existing notebooks
- Organize sources for a project or domain

## Workflow

### Operations

#### List All Notebooks
```bash
notebooklm list
```

#### Create Knowledge Base
```bash
notebooklm create "[DOMAIN]: [DESCRIPTION]"
```

Naming convention:
- `TF: Террасы и навесы` — Timber Frame domain
- `Research: AI Agents 2026` — Research project
- `Learning: TypeScript Advanced` — Learning materials
- `Project: Digital Foreman` — Project docs

#### Add Sources to Existing
```bash
notebooklm use <notebook_id>
notebooklm source add URL1 URL2 file.pdf
notebooklm source wait
```

#### Query Knowledge Base
```bash
notebooklm use <notebook_id>
notebooklm ask "Your question here"
```

#### View Sources
```bash
notebooklm source list
```

#### Export Metadata
```bash
notebooklm metadata
```

#### Delete Notebook
```bash
# CAUTION: irreversible
notebooklm delete <notebook_id>
```

### Suggested Knowledge Bases for PAI

| Notebook | Purpose | Sources |
|---|---|---|
| `TF: Каркасные конструкции` | Timber frame expertise | Нормативы, книги, статьи |
| `TF: Конкуренты СПб` | Competitor intelligence | Сайты конкурентов |
| `Learning: PAI Architecture` | PAI system docs | CLAUDE.md, skill docs |
| `Research: AI Trends` | AI industry monitoring | Блоги, подкасты, статьи |
| `Project: Digital Foreman` | App documentation | Specs, user stories |

### Report

```markdown
════ PAI | NotebookLM ═══════════════════════
📚 KNOWLEDGE BASE: [action performed]
📋 NOTEBOOKS: [count] total
🔄 UPDATED: [notebook name if modified]
🗣️ Navi: [action summary]
```
