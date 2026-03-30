# Content Pipeline Workflow

**Mode:** Article/content → NotebookLM → Podcast + extras for TF site | **Timeout:** 10 minutes

## When to Use

- Create multi-format content from a single article
- "статья → подкаст", "content pipeline", "TF podcast"
- Timber Frame site content repurposing
- Marketing content multiplication (1 article → podcast + quiz + infographic)

## Why This Workflow

Одно усилие (статья) → несколько форматов контента. Для TF сайта: статья + подкаст = 2x маркетинговый эффект. Подкаст привлекает аудиторию которая предпочитает аудио.

## Workflow

### Step 1: Prepare Source Content

If article already written:
```bash
notebooklm create "TF: [ARTICLE_TITLE]"
notebooklm source add /path/to/article.md
```

If article is a URL:
```bash
notebooklm create "TF: [ARTICLE_TITLE]"
notebooklm source add "https://timber-frame-spb.ru/blog/article-slug"
```

Add supporting reference materials:
```bash
notebooklm source add reference1.pdf reference2.pdf
```

Wait:
```bash
notebooklm source wait
```

### Step 2: Generate Podcast

```bash
notebooklm generate audio "Подкаст для клиентов компании по каркасным конструкциям. Простым языком, без излишнего технического жаргона. Расскажите о преимуществах и практических аспектах. Тон: профессиональный но дружелюбный." --wait
```

Download:
```bash
notebooklm download audio /home/ser/projects/timber-frame-site/public/podcasts/
```

### Step 3: Generate Extras (Optional)

```bash
# FAQ/Quiz для страницы
notebooklm generate quiz "5 вопросов для потенциальных клиентов" --wait

# Инфографика с ключевыми фактами
notebooklm generate infographic "Ключевые преимущества и цифры" --wait

# Краткий отчёт для соцсетей
notebooklm generate report "Краткая сводка для поста в соцсетях, 3-5 ключевых пунктов" --wait
```

### Step 4: Integration Points

- Podcast file → `timber-frame-site/public/podcasts/` → add player to article page
- Quiz → convert to FAQ section on article page
- Infographic → download and add to article
- Report → social media post text

### Step 5: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
📝 CONTENT: [Article title]
🎙️ PODCAST: Generated and saved
📊 EXTRAS: [list of additional artifacts]
📁 FILES:
  - Podcast: /podcasts/[filename]
  - Quiz: [if generated]
  - Infographic: [if generated]
🗣️ Navi: Контент-пайплайн завершён, [count] форматов создано
```
