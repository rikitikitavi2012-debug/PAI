# YouTube Knowledge Extraction Workflow

**Mode:** YouTube URL(s) → NotebookLM → Structured knowledge | **Timeout:** 3 minutes

## When to Use

- Extract knowledge from YouTube without spending context tokens
- "извлеки из YouTube", "что в этом видео", "YouTube research"
- Zero-token YouTube research pattern

## Why This Workflow

NotebookLM бесплатно транскрибирует YouTube видео. Claude не тратит токены контекстного окна на транскрипт. Вместо этого Claude запрашивает уже обработанный контент через CLI.

## Workflow

### Step 1: Create Notebook

```bash
notebooklm create "YouTube: [VIDEO_TOPIC]"
```

### Step 2: Add YouTube Source(s)

```bash
notebooklm source add --youtube "YOUTUBE_URL"
```

For multiple videos on same topic:
```bash
notebooklm source add --youtube "URL1" "URL2" "URL3"
```

Wait for processing:
```bash
notebooklm source wait
```

### Step 3: Extract Knowledge

Run a series of targeted questions:

```bash
notebooklm ask "Перечисли 10 ключевых идей из этого видео"
```

```bash
notebooklm ask "Какие практические рекомендации и actionable советы?"
```

```bash
notebooklm ask "Какие цитаты или высказывания стоит запомнить?"
```

```bash
notebooklm ask "Что было удивительным или противоречивым?"
```

### Step 4: Synthesize

Combine answers into structured output. Optionally pipe through Fabric:

```bash
# If deeper analysis needed, generate a report artifact
notebooklm generate report "Полный анализ ключевых идей, инсайтов и рекомендаций"
```

### Step 5: Save to Memory (Optional)

If content is valuable for future reference:
- Save to `~/.claude/MEMORY/RESEARCH/{date}_{topic}/`
- Or feed into ContentAnalysis skill for extract_wisdom

### Step 6: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
🎬 YOUTUBE: [Video title]
📋 IDEAS: [count] key ideas extracted
💡 INSIGHTS: [count] insights
🎯 ACTIONS: [count] actionable recommendations
📁 SAVED: [path if saved to MEMORY]
🗣️ Navi: Знания из видео извлечены, [token savings] токенов сэкономлено
```

## Token Savings

Typical YouTube video transcript = 5,000-50,000 tokens.
This workflow: ~500 tokens (CLI commands + responses).
Savings: 10-100x.
