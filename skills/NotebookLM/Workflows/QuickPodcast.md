# Quick Podcast Workflow

**Mode:** URL(s) → NotebookLM notebook → Audio Overview | **Timeout:** 5 minutes

## When to Use

- User wants a podcast from URL(s), article, or document
- "создай подкаст", "generate podcast", "audio from this"
- Quick content-to-audio conversion

## Workflow

### Step 1: Create Notebook

```bash
notebooklm create "Podcast: [TOPIC_TITLE]"
```

Save the notebook ID from output.

### Step 2: Add Sources

For URLs:
```bash
notebooklm source add URL1 [URL2 URL3...]
```

For local files (PDF, TXT, MD):
```bash
notebooklm source add /path/to/file.pdf
```

For YouTube:
```bash
notebooklm source add --youtube "https://youtube.com/watch?v=..."
```

Wait for source processing:
```bash
notebooklm source wait
```

### Step 3: Generate Audio Overview

```bash
notebooklm generate audio "INSTRUCTIONS" --wait
```

**Instruction examples:**
- `"Обсудите ключевые идеи простым языком"` — general podcast
- `"Focus on practical takeaways and actionable advice"` — practical focus
- `"Объясните как для новичка, без жаргона"` — beginner-friendly
- `"Debate the pros and cons critically"` — critical analysis
- `"Кратко, по делу, 5 минут максимум"` — brief overview

### Step 4: Download

```bash
notebooklm download audio ./output/
```

### Step 5: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
🎙️ PODCAST: [Topic]
📎 SOURCES: [count] sources added
⏱️ DURATION: [estimated from generation]
📁 FILE: ./output/[filename]
🗣️ Navi: Подкаст готов, [count] источников обработано
```

## Speed Target

~2-5 minutes (depends on source processing + audio generation)
