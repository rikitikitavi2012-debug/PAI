# Deep Research Workflow

**Mode:** Multi-source → NotebookLM knowledge base → Grounded analysis | **Timeout:** 10 minutes

## When to Use

- Research requiring multiple sources with grounded answers
- "исследование через NLM", "grounded research", "research with sources"
- When hallucination-free answers are critical (competitive analysis, market research, technical review)

## Why This Workflow

NotebookLM отвечает ТОЛЬКО на основе загруженных документов. Нет галлюцинаций. Идеально для исследований где точность критична.

## Workflow

### Step 1: Create Research Notebook

```bash
notebooklm create "Research: [TOPIC]"
```

### Step 2: Gather and Add Sources (5-50 sources)

**URLs (articles, docs, papers):**
```bash
notebooklm source add URL1 URL2 URL3 URL4 URL5
```

**YouTube (talks, interviews, lectures):**
```bash
notebooklm source add --youtube "URL1" "URL2"
```

**PDFs (papers, reports):**
```bash
notebooklm source add report.pdf paper.pdf
```

**Web research (NLM searches and adds):**
```bash
notebooklm source add-research "specific query about topic"
```

Wait for all processing:
```bash
notebooklm source wait
```

### Step 3: Structured Interrogation

Ask a series of research questions:

```bash
notebooklm ask "Каковы основные тезисы и консенсус среди источников?"
notebooklm ask "Где источники противоречат друг другу?"
notebooklm ask "Какие пробелы в знаниях — что не покрыто источниками?"
notebooklm ask "Какие практические выводы и рекомендации?"
notebooklm ask "[SPECIFIC_RESEARCH_QUESTION_1]"
notebooklm ask "[SPECIFIC_RESEARCH_QUESTION_2]"
```

### Step 4: Generate Artifacts

```bash
# Comprehensive report
notebooklm generate report "Детальный аналитический отчёт с цитированием источников" --wait

# Mind map for visual structure
notebooklm generate mind-map "Карта знаний по теме" --wait

# Download artifacts
notebooklm download report ./output/
```

### Step 5: Save Results

Save to MEMORY/RESEARCH for future reference:
```
~/.claude/MEMORY/RESEARCH/{date}_{topic}/
├── report.md          # Generated report
├── mind-map.md        # Mind map export
├── key-findings.md    # Synthesized Q&A answers
└── sources.md         # List of all sources used
```

### Step 6: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
🔬 RESEARCH: [Topic]
📚 SOURCES: [count] sources ([types breakdown])
❓ QUESTIONS: [count] research questions answered
📊 ARTIFACTS: report, mind-map
📁 SAVED: MEMORY/RESEARCH/{date}_{topic}/
🗣️ Navi: Исследование завершено, [count] источников проанализировано
```

## Notes

- Limit of 50 sources per notebook. For larger research, split into sub-notebooks.
- Web research via `source add-research` lets NLM find and add sources automatically.
- All NLM answers are grounded in sources — no hallucinations.
