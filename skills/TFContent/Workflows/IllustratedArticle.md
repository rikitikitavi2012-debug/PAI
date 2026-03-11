# IllustratedArticle — Brigade Pipeline

> Полный пайплайн создания статьи с AI-визуалами и SEO-оптимизированными изображениями.
> Бригада: A0 (текст) + Navi (оркестрация) + Artist-агенты (генерация) + Vision QA (верификация).

---

## Зачем

Статьи без изображений = сухой контент с низким engagement и слабым SEO.
Каждая статья должна содержать 3-5 визуалов с SEO alt-текстами из Wordstat.

---

## Роли бригады

| Роль | Кто | Что делает |
|------|-----|-----------|
| Architect | Navi | Планирует image slots, формирует промпты, оркестрирует |
| Writer | A0 | Пишет статью с IMAGE-плейсхолдерами |
| Artist x3 | Artist-агенты | Генерируют каждый слот через 3 модели параллельно |
| Vision QA | Navi (multimodal) | Верифицирует: TF accuracy, brand alignment, anti-patterns |
| Optimizer | Engineer-агент | Сжимает, ресайзит, интегрирует в markdown |

---

## Pipeline Steps

### Step 0: Wordstat Research (A0 или Navi)

Выполнить `WordstatResearch.md` — собрать Keyword Brief.

**Дополнительно для изображений:** запросить image-related ключи:
```
Базовые ключи статьи + варианты:
- "[тема] фото"
- "[тема] примеры"
- "терраса timber frame фото"
- "фахверк терраса дизайн"
```

Результат: **Image Keyword Brief** — ключи с частотностями для alt-текстов.

### Step 1: A0 пишет статью с IMAGE-плейсхолдерами

A0 использует WriteArticle.md workflow, но с **обязательным** добавлением плейсхолдеров:

```markdown
<!-- IMAGE: slot=1, type=header, description="Готовая терраса timber frame 30м² с видимым каркасом, вечернее освещение", seo_alt="терраса timber frame фото — готовый проект 30 м² с клеёным брусом", keyword="терраса timber frame фото", position="after_h1" -->

## H2: Как устроен каркас

Текст секции...

<!-- IMAGE: slot=2, type=detail, description="Соединение шип-паз крупным планом, деревянные нагели", seo_alt="соединение шип-паз timber frame — деревянные нагели без металла", keyword="шип-паз соединение дерево", position="after_paragraph_1" -->

## H2: Сравнение материалов

Текст с таблицей...

<!-- IMAGE: slot=3, type=comparison, description="Таблица-инфографика: TF vs обычный каркас за 10 лет", seo_alt="сравнение timber frame и обычной террасы — стоимость за 10 лет", keyword="фахверк терраса цена сравнение", position="after_table" -->
```

**Правила плейсхолдеров:**
- Минимум 3, максимум 5 на статью 1000+ слов
- `slot=1` ВСЕГДА type=header (заголовочное изображение)
- `seo_alt` берётся из Image Keyword Brief (реальные частотности!)
- `keyword` = целевой ключ для этого изображения
- `type`: header | detail | comparison | atmosphere | infographic

### Step 2: Navi парсит плейсхолдеры и формирует промпты

Для каждого `<!-- IMAGE -->` блока:

1. Определить prompt template из PREFERENCES.md:
   - `header` → Blog Article Header template
   - `detail` → Technology / Detail Shot template
   - `comparison` → Infographic (GPT-Image-1.5 only, text in image)
   - `atmosphere` → Hero / Key Visual template (адаптированный)

2. Обогатить промпт TF-терминологией из PREFERENCES.md

3. Сформировать финальный промпт с параметрами

### Step 3: Параллельная генерация (Artist-агенты)

Запуск: **1 агент на слот, каждый генерирует 3 модели**.

Для статьи с 4 слотами = 4 агента x 3 модели = 12 изображений.

```
Agent "artist-slot-1" → header через FLUX.2 max + GPT-1.5 + Nano Banana 2
Agent "artist-slot-2" → detail через FLUX.2 max + GPT-1.5 + Nano Banana 2
Agent "artist-slot-3" → infographic через GPT-1.5 only (text in image)
Agent "artist-slot-4" → atmosphere через FLUX.2 max + GPT-1.5 + Nano Banana 2
```

Сохранение: `~/Downloads/article-{slug}/slot-{N}-{model}.png`

### Step 4: Vision QA (Navi)

Для каждого варианта проверить:

**Checklist:**
- [ ] TF конструкция видна (post-and-beam, не generic terrace)
- [ ] Нет anti-patterns (rustic, tropical, people faces, log cabin)
- [ ] Тона соответствуют бренду (dark wood, warm amber, gold)
- [ ] Фон = северная Россия (берёзы, mixed forest, flat terrain)
- [ ] Нет артефактов AI (лишние пальцы, сломанная геометрия)
- [ ] Соответствует description из плейсхолдера

**Результат:** выбор лучшего варианта на слот + обоснование.

### Step 5: Компрессия и интеграция (Engineer-агент)

Для каждого выбранного изображения:

```bash
# Resize to target dimensions
convert input.png -resize {WIDTH}x{HEIGHT} -quality 95 resized.png

# Compress to WebP
cwebp -q {QUALITY} -m 6 resized.png -o output.webp
```

Размеры по типу (из PREFERENCES.md Output Specifications):
- header: 1200x630, WebP, max 120KB, q=80
- detail/atmosphere: 1200x800, WebP, max 150KB, q=80
- infographic: 1200x800, PNG, max 200KB, q=90

Сохранение: `public/images/blog/{slug}/{slot-N}.webp`

### Step 6: Замена плейсхолдеров в статье

Заменить каждый `<!-- IMAGE -->` на Next.js Image:

```markdown
![терраса timber frame фото — готовый проект 30 м² с клеёным брусом](/images/blog/chto-takoe-timber-frame/header.webp)
```

А в коде блога (`[slug]/page.tsx`) — рендерить как `<Image>` с:
- `alt` = `seo_alt` из плейсхолдера (SEO-оптимизированный!)
- `width`/`height` по типу
- `loading="lazy"` (кроме header — он `priority`)

### Step 7: Обновление frontmatter

Добавить в frontmatter статьи:

```yaml
images:
  - slot: 1
    type: header
    src: /images/blog/chto-takoe-timber-frame/header.webp
    alt: "терраса timber frame фото — готовый проект 30 м² с клеёным брусом"
    keyword: "терраса timber frame фото"
    keyword_freq: 320
    model: gpt-image-1.5
  - slot: 2
    type: detail
    src: /images/blog/chto-takoe-timber-frame/detail-joint.webp
    alt: "соединение шип-паз timber frame — деревянные нагели без металла"
    keyword: "шип-паз соединение дерево"
    keyword_freq: 140
    model: flux-2-max
```

---

## SEO Image Strategy

### Alt Text Formula

```
{keyword из Wordstat} — {описание что на изображении}
```

Примеры:
- `терраса timber frame фото — готовый проект с видимым каркасом из клеёного бруса`
- `шип-паз соединение дерево — традиционная врубка с деревянными нагелями`
- `фахверк терраса цена сравнение — таблица стоимости за 10 лет`

### Image Sitemap

Для каждого нового изображения добавлять в sitemap:

```xml
<url>
  <loc>https://timber-frame-spb.ru/blog/{slug}</loc>
  <image:image>
    <image:loc>https://timber-frame-spb.ru/images/blog/{slug}/{name}.webp</image:loc>
    <image:title>{seo_alt}</image:title>
    <image:caption>{description}</image:caption>
  </image:image>
</url>
```

---

## Стоимость пайплайна на 1 статью

| Этап | Модели | Кол-во | Стоимость |
|------|--------|--------|-----------|
| Wordstat | API | 1 запрос | ~0 ₽ |
| Генерация | 3 модели x 4 слота | 12 изображений | ~$0.52 |
| Компрессия | CLI tools | 4 финальных | 0 |
| **Итого** | | | **~$0.52 / статья** |

При 2 моделях вместо 3 (убрать FLUX.2 max для bulk): ~$0.24/статья.

---

## A0 Integration

Для A0 добавить в WriteArticle.md инструкцию:

> После Step 3 (Написание) — вставить IMAGE-плейсхолдеры.
> A0 НЕ генерирует изображения. A0 пишет плейсхолдеры с описаниями.
> Navi берёт плейсхолдеры и запускает бригадную генерацию.

### A0 Output Format (обновлённый)

```markdown
---
title: "..."
description: "..."
slug: "..."
keywords: ["...", "..."]
image_slots: 4
---

# H1

Вступление...

<!-- IMAGE: slot=1, type=header, description="...", seo_alt="...", keyword="...", position="after_h1" -->

## H2
...
<!-- IMAGE: slot=2, type=detail, ... -->
```

Navi парсит `image_slots` из frontmatter → запускает N агентов.

---

## Anti-Patterns

- A0 генерирует изображения сам (нет доступа к Generate.ts)
- Использовать 1 модель вместо 3 для важных визуалов
- alt текст = описание изображения без ключевых слов
- Все изображения одного типа (все header, нет detail/atmosphere)
- Пропускать Vision QA (бренд может быть нарушен)
- PNG вместо WebP на сайте (раздувает размер)
