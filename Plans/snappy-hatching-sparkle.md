# Plan: Интеграция NotebookLM в PAI

## Context

Ivan получил аналитическое сравнение двух CLI-инструментов для Google NotebookLM (notebooklm-py vs notebooklm-mcp-cli). Задача — исследовать экосистему, изучить как юзеры используют инструменты (YouTube, Reddit), и спроектировать идеальный подход интеграции в PAI и AI-бригаду.

**Проведено исследование** (4 параллельных агента):
- ClaudeResearcher: YouTube + блоги + техническая экосистема
- PerplexityResearcher: Reddit (r/NotebookLM, r/ClaudeAI, r/LocalLLaMA)
- CodexResearcher: GitHub deep-dive обоих репозиториев
- GeminiResearcher: Use cases и бизнес-применения

---

## Ключевые находки исследования

### Экосистема (обновлённые данные, март 2026)

| Инструмент | Stars | Подход | Статус |
|---|---|---|---|
| **notebooklm-py** (teng-lin) | 5,961 | Python SDK + CLI + Skill | v0.3.4, активен |
| **notebooklm-mcp-cli** (jacob-bd) | 2,569 | CLI + MCP (35 tools) | v0.4.8, активен |
| **nblm-rs** (K-dash) | новый | Rust SDK для Enterprise API | alpha |
| **notebooklm-mcp** (PleasePrompto) | новый | MCP zero-hallucination | нишевой |
| **Open Notebook** | 4,100 | Self-hosted альтернатива | 16+ провайдеров |

### Паттерны использования (из YouTube/Reddit/блогов)

1. **NotebookLM как Research Memory + Claude как Reasoning** — доминирующий паттерн. NLM держит документы, Claude запрашивает и действует.
2. **Zero-Token YouTube Research** — видео → NLM (бесплатная транскрипция) → запрос через CLI. Экономит токены контекстного окна.
3. **Automated Podcast Pipeline** — источники → NLM → Audio Overview → публикация. Для контент-маркетинга.
4. **n8n/Zapier автоматизация** — CRM/RSS триггеры → NLM → сводки/подкасты.
5. **Learning Accelerator** — техдоки → аудио с настройкой фокуса и сложности.

### Риски (критично)

- **Аккаунт-бан**: юрист потерял Gmail/Voice/Photos после загрузки документов в NLM (137 upvotes r/LocalLLaMA). **Обязательно**: отдельный Google аккаунт.
- **Undocumented API**: Google может сломать в любой момент. notebooklm-py имеет daily RPC health check — узнаём о поломке за 24ч.
- **Cookie expiry**: от 1-2 часов (Китай) до 2-4 недель (Европа/США). Требуется workflow переаутентификации.
- **FastMCP PR не слит**: PR #156 и #166 открыты в notebooklm-py. MCP-сервер пока недоступен.

---

## Решение: notebooklm-py как PAI Skill

### Почему notebooklm-py, а не MCP-CLI

| Критерий | notebooklm-py | notebooklm-mcp-cli | Для PAI |
|---|---|---|---|
| **Context overhead** | SKILL.md загружается по триггеру | 35 tool schemas всегда | notebooklm-py wins |
| **Sub-agents** | bash CLI, лёгкий | 35 tools на каждого агента | notebooklm-py wins |
| **Workflow control** | CLI команды = предсказуемо | Claude решает порядок | notebooklm-py wins |
| **PAI Skill паттерн** | SKILL.md first-class | MCP обходит skills | notebooklm-py wins |
| **RPC health** | Daily мониторинг | Нет | notebooklm-py wins |
| **Python API** | Async, для A0/cron | Нет | notebooklm-py wins |
| **JSON responses** | Текстовый stdout | Типизированный JSON | MCP-CLI wins |
| **Мульти-клиент** | Claude Code only | 7+ клиентов | MCP-CLI wins |

**Вердикт**: notebooklm-py — основной. MCP-CLI держать на радаре для Gemini CLI/OpenCode.

---

## Архитектура интеграции

### Новый скилл: `skills/NotebookLM/`

```
skills/NotebookLM/
├── SKILL.md                          # Router + triggers (ru/en)
├── Workflows/
│   ├── QuickPodcast.md               # URL → подкаст за 1 команду
│   ├── DeepResearch.md               # Мульти-источник исследование
│   ├── YouTubeKnowledge.md           # Zero-token YouTube extraction
│   ├── ContentPipeline.md            # Статья → NLM → подкаст для TF
│   ├── KnowledgeBase.md              # Создание/управление базами знаний
│   └── AudioLearning.md              # Техдоки → аудио для обучения
└── Reference/
    └── CLIReference.md               # Справочник команд notebooklm-py
```

### SKILL.md — структура

```yaml
---
name: NotebookLM
description: Google NotebookLM integration — podcast generation, research knowledge bases, YouTube extraction, content pipelines. USE WHEN podcast, подкаст, notebooklm, notebook, knowledge base, база знаний, audio overview, аудио обзор, YouTube extraction, research notebook, исследовательский блокнот, создай подкаст, generate podcast.
context: fork
---
```

- Voice notification (обязательно)
- Workflow routing table (6 workflows)
- Prerequisites check: `notebooklm auth check`
- CLI reference inline

### Workflows (ключевые)

**1. QuickPodcast** — MVP, самый частый use case
```
1. notebooklm create "Title"
2. notebooklm source add URL [URL2 URL3...]
3. notebooklm generate audio "instructions" --wait
4. notebooklm download audio ./output/
```

**2. YouTubeKnowledge** — killer feature для Ivan
```
1. notebooklm create "YouTube: Topic"
2. notebooklm source add YOUTUBE_URL [URL2...]
3. notebooklm chat "Извлеки ключевые идеи, инсайты, рекомендации"
4. Результат → MEMORY или Fabric extract_wisdom
```

**3. ContentPipeline** — для TF маркетинга
```
1. Написать статью (TFContent skill)
2. notebooklm create "TF: Topic"
3. notebooklm source add article.md + reference_docs
4. notebooklm generate audio "подкаст для клиентов, простым языком"
5. Скачать → timber-frame-site/public/podcasts/
```

**4. DeepResearch** — исследование с грунтовкой
```
1. notebooklm create "Research: Topic"
2. notebooklm source add [10+ URLs, PDFs, YouTube]
3. notebooklm research web "уточняющий запрос"
4. notebooklm chat "синтезируй находки" [серия вопросов]
5. Результат → MEMORY/RESEARCH/
```

### Brigade Integration

| Член бригады | Роль с NotebookLM | Как |
|---|---|---|
| **Navi** | Orchestrator. Запускает workflows, управляет notebooks | Skill + CLI |
| **A0** | Scheduled research. Еженедельные обзоры рынка/технологий | `notebooklm-py` через code_execution |
| **Jules** | Контент-пайплайн. Статья → подкаст автоматизация | Bash в PR workflow |
| **Gemini CLI** | Альтернативный клиент (когда MCP-CLI нужен) | `nlm` CLI или MCP |
| **Research Skill** | Enrichment. NLM как дополнительный слой грунтовки | Вызов из workflow |

### Безопасность

1. **Отдельный Google аккаунт** — ОБЯЗАТЕЛЬНО. Не основной.
2. **Auth в ~/.notebooklm/** — не в PAI repo (gitignore)
3. **Cookie refresh** — cron проверка `notebooklm auth check` раз в день
4. **RPC health** — подписка на GitHub issues notebooklm-py (automated alerts)

---

## План реализации (4 фазы)

### Фаза 1: Установка + базовый Skill (30 мин)
1. `pip install notebooklm-py` (или `uv tool install notebooklm-py`)
2. `notebooklm login` — авторизация через отдельный Google аккаунт
3. `notebooklm auth check` — верификация
4. Создать `skills/NotebookLM/SKILL.md` по PAI-конвенции
5. Создать `Workflows/QuickPodcast.md` — первый MVP workflow
6. Создать `Reference/CLIReference.md` — справочник команд
7. Тест: `"создай подкаст из этой статьи: [URL]"`

### Фаза 2: Полный набор Workflows (1 час)
1. `Workflows/YouTubeKnowledge.md`
2. `Workflows/DeepResearch.md`
3. `Workflows/ContentPipeline.md`
4. `Workflows/KnowledgeBase.md`
5. `Workflows/AudioLearning.md`
6. Обновить skill-index.json
7. Тест каждого workflow end-to-end

### Фаза 3: Brigade Integration (30 мин)
1. Добавить NotebookLM в BRIGADE.md (как T3 Tool)
2. Обновить матрицу делегирования
3. Hook: SessionStart проверка auth validity (опционально)
4. Интеграция с Research skill (опциональный NLM enrichment step)

### Фаза 4: Автоматизация (межсезонье)
1. A0 scheduled task: еженедельный industry research
2. n8n pipeline: RSS → NLM → podcast
3. TF content pipeline: статья → подкаст → деплой
4. Мониторинг: RPC health alerts → Telegram

---

## Verification

1. **Skill activation**: сказать "создай подкаст" — должен загрузиться NotebookLM skill
2. **QuickPodcast E2E**: URL → notebook → audio → скачанный файл
3. **YouTubeKnowledge**: YouTube URL → structured knowledge output
4. **Sub-agent test**: Research skill → NotebookLM enrichment → combined result
5. **Auth persistence**: проверка через 24ч — cookie ещё валиден
6. **skill-index.json**: NotebookLM появился в индексе

---

## Файлы для создания/изменения

| Файл | Действие |
|---|---|
| `skills/NotebookLM/SKILL.md` | Создать |
| `skills/NotebookLM/Workflows/QuickPodcast.md` | Создать |
| `skills/NotebookLM/Workflows/YouTubeKnowledge.md` | Создать |
| `skills/NotebookLM/Workflows/DeepResearch.md` | Создать |
| `skills/NotebookLM/Workflows/ContentPipeline.md` | Создать |
| `skills/NotebookLM/Workflows/KnowledgeBase.md` | Создать |
| `skills/NotebookLM/Workflows/AudioLearning.md` | Создать |
| `skills/NotebookLM/Reference/CLIReference.md` | Создать |
| `skills/skill-index.json` | Обновить (добавить NotebookLM) |
| `PAI/BRIGADE.md` | Обновить (добавить NLM как T3 Tool) |
| `.gitignore` | Проверить: ~/.notebooklm/ excluded |

---

## Мудрость из исследования (для MEMORY)

1. **Zero-Token Research** — самый ценный паттерн. NLM бесплатно транскрибирует YouTube, Claude только запрашивает результат. Экономия: тысячи токенов на видео.
2. **Podcast = маркетинг-актив**. Для TF сайта: статья + подкаст = 2x контент из одного усилия.
3. **Learning Accelerator** — Ivan может слушать техдоки на стройке (6/1 сезон). Загрузил документацию утром → слушает Audio Overview по дороге.
4. **Отдельный аккаунт — не опция, а необходимость**. Google отключает аккаунты целиком.
5. **notebooklm-py TypeScript port** (npm: notebooklm-sdk) появился 15.03.2026 — потенциально для Bun Tools в будущем.
