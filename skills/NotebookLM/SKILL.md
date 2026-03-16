---
name: NotebookLM
description: Google NotebookLM integration — podcast generation, research knowledge bases, YouTube extraction, content pipelines. USE WHEN podcast, подкаст, notebooklm, notebook, knowledge base, база знаний, audio overview, аудио обзор, YouTube extraction, research notebook, исследовательский блокнот, создай подкаст, generate podcast, create podcast, аудио из статьи, audio from article, сгенерируй аудио, quiz from docs.
context: fork
---

## Language

**Все ответы на русском языке.** Английский только для CLI команд и технических терминов.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/NotebookLM/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле NotebookLM", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Запускаю **WorkflowName** в скилле **NotebookLM**...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# NotebookLM Skill

Программный доступ к Google NotebookLM через CLI `notebooklm` (notebooklm-py).
Подкасты, исследования, knowledge bases, контент-пайплайны.

## Prerequisites Check

**Before ANY workflow, verify auth:**
```bash
notebooklm auth check
```

If auth fails, instruct user to run `notebooklm login` in terminal (requires browser).

---

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Quick podcast / подкаст из URL / audio from article | `Workflows/QuickPodcast.md` |
| YouTube extraction / извлеки из YouTube / zero-token research | `Workflows/YouTubeKnowledge.md` |
| Deep research with NLM / исследование через NLM / grounded research | `Workflows/DeepResearch.md` |
| Content pipeline / статья → подкаст / TF podcast | `Workflows/ContentPipeline.md` |
| Knowledge base / база знаний / manage notebooks | `Workflows/KnowledgeBase.md` |
| Audio learning / аудио обучение / listen to docs | `Workflows/AudioLearning.md` |
| PAI audit / аудит PAI / проверь систему / infrastructure review | `Workflows/PAIAudit.md` |

**Default (ambiguous request):** QuickPodcast.

---

## Quick CLI Reference

### Session
```bash
notebooklm login                    # Auth via browser (one-time)
notebooklm auth check               # Verify auth status
notebooklm list                     # List all notebooks
notebooklm create "Title"           # Create notebook
notebooklm use <id>                 # Set active notebook
notebooklm status                   # Current context
```

### Sources
```bash
notebooklm source add URL           # Add URL source
notebooklm source add URL1 URL2     # Multiple URLs
notebooklm source add file.pdf      # Upload local file
notebooklm source add --youtube URL # YouTube video
notebooklm source list              # List sources
notebooklm source wait              # Wait for processing
```

### Chat
```bash
notebooklm ask "question"           # Ask current notebook
notebooklm ask "question" -n ID     # Ask specific notebook
```

### Generate Artifacts
```bash
notebooklm generate audio "instructions" --wait    # Podcast
notebooklm generate video "instructions" --wait     # Video
notebooklm generate slide-deck "instructions"       # Slides
notebooklm generate quiz "instructions"             # Quiz
notebooklm generate flashcards "instructions"       # Flashcards
notebooklm generate mind-map "instructions"         # Mind map
notebooklm generate infographic "instructions"      # Infographic
notebooklm generate report "instructions"           # Report
```

### Download
```bash
notebooklm download audio ./output/                 # Download podcast
notebooklm download video ./output/                 # Download video
notebooklm download slide-deck ./output/            # Download slides
```

### Research
```bash
notebooklm research web "query"                     # Web research
notebooklm source add-research "query"              # Research + add as source
```

---

## Important Notes

- **Separate Google account required** — never use primary Gmail for automation
- **Cookie auth expires** (days to weeks) — re-run `notebooklm login` if auth fails
- **Undocumented Google API** — may break without warning. notebooklm-py has daily RPC health monitoring.
- **--wait flag** on generate commands = polls until artifact is ready (recommended)
- All artifact generation is async — use `notebooklm artifact poll <id>` to check status manually

---

## Integration

### Feeds Into
- **Research** — NLM as grounded knowledge layer for research workflows
- **TFContent** — Content pipeline: article → podcast for timber-frame-spb.ru
- **ContentAnalysis** — Feed NLM chat output to extract_wisdom

### Uses
- **notebooklm-py CLI** — all operations via bash commands
- **Fabric patterns** — post-process NLM output with extract_wisdom, summarize, etc.
