# Audio Learning Workflow

**Mode:** Technical docs → Audio Overview for passive learning | **Timeout:** 5 minutes

## When to Use

- Convert documentation to listenable audio for learning on the go
- "аудио обучение", "слушать документацию", "listen to docs"
- Perfect for commute or physical work (season 6/1)
- Learning new technology or framework

## Why This Workflow

Ivan работает на стройке 6/1 (апрель-ноябрь). Загрузил документацию утром → слушает Audio Overview по дороге. Пассивное обучение в "мёртвое" время.

## Workflow

### Step 1: Create Learning Notebook

```bash
notebooklm create "Learning: [TOPIC]"
```

### Step 2: Add Learning Materials

**Documentation:**
```bash
notebooklm source add "https://docs.example.com/guide"
notebooklm source add ./docs/architecture.md ./docs/api-reference.md
```

**YouTube tutorials:**
```bash
notebooklm source add --youtube "TUTORIAL_URL_1" "TUTORIAL_URL_2"
```

**PDFs (books, papers):**
```bash
notebooklm source add book-chapter.pdf
```

Wait:
```bash
notebooklm source wait
```

### Step 3: Generate Audio Overview

Choose focus based on learning goal:

**Broad overview (first exposure):**
```bash
notebooklm generate audio "Объясни основные концепции простым языком, как для разработчика который впервые изучает эту тему. Начни с самого важного." --wait
```

**Focused deep-dive (specific topic):**
```bash
notebooklm generate audio "Сосредоточься на [SPECIFIC_ASPECT]. Объясни детально с примерами." --wait
```

**Practical focus (how-to):**
```bash
notebooklm generate audio "Практическое руководство: как использовать [TOOL] для [TASK]. Пошагово, с примерами." --wait
```

**Critical analysis:**
```bash
notebooklm generate audio "Дебаты: плюсы и минусы [APPROACH]. Какие подводные камни? Когда НЕ использовать?" --wait
```

### Step 4: Download

```bash
notebooklm download audio ~/audio-learning/
```

### Step 5: Generate Study Materials (Optional)

```bash
# Flashcards for spaced repetition
notebooklm generate flashcards "Ключевые термины и концепции" --wait

# Quiz for self-check
notebooklm generate quiz "Проверь понимание основных концепций" --wait
```

### Step 6: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
🎧 LEARNING: [Topic]
📚 SOURCES: [count] sources loaded
🎙️ AUDIO: Generated ([focus type])
📁 FILE: ~/audio-learning/[filename]
📝 EXTRAS: [flashcards/quiz if generated]
🗣️ Navi: Аудио для обучения готово, слушай по дороге
```

## Tips

- **Multiple audio overviews** from same sources with different focus — generates different content each time
- **Add sources incrementally** — start with overview docs, add advanced material later
- **Quiz after listening** — generate quiz to verify retention
- **Flashcards export** — can be imported to Anki for spaced repetition
