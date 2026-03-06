# Open Source AI Agents Research: Pi Agent, OpenClaw, NanoClaw

**Дата:** 2026-03-06
**Источник:** Исследование в облаке (Claude, Anthropic)
**Цель:** Интеграция с Claude Code для мульти-агентных пайплайнов

---

## Главный вывод

Pi Agent, OpenClaw и NanoClaw — три проекта с разными философиями, но общей идеей: LLM отлично пишут и выполняют код, поэтому дайте им инструменты. Для интеграции с Claude Code оптимальная стратегия — Pi Agent как RPC-субагент для кодинга, NanoClaw для безопасной фоновой автоматизации, и OpenClaw как gateway для мульти-канальной коммуникации.

---

## 1. Pi Agent

**Автор:** Mario Zechner (badlogicgames)
**Стек:** TypeScript монорепозиторий
**Философия:** Минимализм + расширяемость

### Архитектура (4 слоя)

| Пакет | Назначение |
|-------|-----------|
| pi-ai | Unified LLM API: Anthropic, OpenAI, Google, xAI, Groq, Cerebras, OpenRouter, Ollama. Streaming, tool calling, токены/стоимость |
| pi-agent-core | Агентный цикл: инструменты → LLM → выполнение → результат |
| pi-coding-agent | Полный runtime: read/write/edit/bash, JSONL-сессии, compaction, скиллы, расширения |
| pi-tui | Терминальный UI: diff-рендеринг, Markdown, автодополнение |

### Ключевые особенности

- **4 режима работы:** Interactive (TUI), Print/JSON (скрипты), RPC (stdin/stdout JSON для интеграции), SDK (встраивание)
- **Древовидные сессии:** Ветвление, переход назад, продолжение из любой точки. JSONL
- **Compaction:** Авто-суммаризация при приближении к лимиту контекста
- **Мульти-провайдерность:** Смена модели прямо в сессии
- **Расширения (хот-релоад):** Агент пишет расширения, перезагружает и тестирует в цикле
- **Пакеты:** Бандлы расширений/скиллов/промптов/тем через npm/git
- **Браузер:** Headless Chrome + CDP + Reader mode
- **Hashline edits:** Контент-хэш на строку → прецизионные правки без конфликтов

### Интеграция с Claude Code

Pi в режиме RPC (JSON через stdin/stdout) или Print-режиме (`pi -p "задача"`) — Claude Code делегирует как субпроцессу. SDK — встраивание в приложение.

```bash
# Одноразовый запрос
pi -p "Проанализируй файл src/api.ts и найди баги"
# JSON для парсинга
pi -p "Задача" --mode json
# RPC для диалога
echo '{"type":"message","content":"..."}' | pi --rpc
```

### Сильные/Слабые стороны

| Сильные | Ограничения |
|---------|------------|
| Минимализм, понятная архитектура | Нужен TypeScript для глубокой настройки |
| 4 режима (RPC идеален для интеграции) | Нет контейнеризации/изоляции |
| Hot-reload расширений | Диктаторский стиль управления автора |
| Мульти-провайдер + смена модели в сессии | Только терминал, нет GUI |

---

## 2. OpenClaw

**Автор:** Peter Steinberger (основатель PSPDFKit, перешёл в OpenAI 02/2026)
**Звёзды:** 247,000+ GitHub
**Статус:** Под независимым фондом после ухода автора в OpenAI

### Архитектура

Gateway (WebSocket ws://127.0.0.1:18789) — нормализация сообщений из 15+ каналов:
- WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Teams, Matrix, LINE, Mattermost, Twitch, Zalo, WebChat
- Pi Agent (RPC) для кодинга
- CLI, WebChat UI, macOS/iOS/Android ноды

### Ключевые особенности

- **15+ каналов коммуникации**
- **Heartbeat-демон:** Каждые 30 мин, HEARTBEAT.md, задачи без промпта
- **Workspace (память):** AGENTS.md, SOUL.md, USER.md, TOOLS.md, IDENTITY.md — Markdown
- **ClawHub:** Реестр скиллов, авто-подключение
- **Модель-агностик:** Claude, GPT-4o, DeepSeek, Gemini, Ollama
- **50+ интеграций:** Apple Notes, Notion, Obsidian, Trello, GitHub, умный дом

### Безопасность — КРИТИЧЕСКИЕ РИСКИ

~400,000 строк кода, 70+ зависимостей. CrowdStrike, Palo Alto, Cisco предупреждают о prompt injection и несанкционированном доступе. Нет OS-изоляции — один Node-процесс.

---

## 3. NanoClaw

**Автор:** Gavriel Cohen (Qwibit.ai, ex-Wix)
**Стек:** ~500 строк TypeScript, 15 файлов, Anthropic Agent SDK
**Философия:** Минимализм + безопасность через контейнеры

### Сравнение с OpenClaw

| Параметр | OpenClaw | NanoClaw |
|----------|----------|----------|
| Кодовая база | ~400K строк, 70+ deps | ~500 строк, 15 файлов |
| Изоляция | Уровень приложения | OS-уровень (Linux-контейнеры) |
| LLM Runtime | Pi Agent Framework | Anthropic Agent SDK / Claude Code |
| Модели | Любые | Только Claude |
| Каналы | 15+ из коробки | WhatsApp, остальные через skills |
| Agent Swarms | Через расширения/tmux | Встроенные (native) |
| Аудит | Нереалистично | ~8 мин на полный аудит |
| Конфигурация | 53 конфиг-файла | Нет конфигов — просите Claude |

### Архитектура безопасности

- Каждый агент в своём контейнере (Apple Container / Docker)
- Mount allowlist: ~/.config/nanoclaw/mount-allowlist.json — .ssh/.gnupg/.aws/.env заблокированы
- Группы не доверяют друг другу (изоляция данных)
- Код хоста в read-only

### Интеграция с Claude Code

Наиболее естественная — уже на Claude Agent SDK. Установка через Claude Code (/setup, /add-whatsapp). Скиллы = .claude/skills/ Markdown-файлы.

---

## 4. Уровни интеграции

### Уровень 1: Pi Agent как субагент Claude Code
```bash
pi -p "Проанализируй и отрефактори src/utils.ts" --mode json
# Другая модель (Gemini, DeepSeek) для экономии токенов
```

### Уровень 2: NanoClaw для безопасной автоматизации
- Каждый агент в изолированном контейнере
- Расписание задач (@Andy каждый понедельник...)
- Agent swarms для параллельных задач

### Уровень 3: Полный стек
```
Claude Code (оркестратор)
├── Pi Agent (RPC/SDK) — кодинг, дешёвые модели для рутины, A/B-тесты
├── NanoClaw (контейнеры) — фоновые задачи, swarms, sandbox
└── OpenClaw (Gateway) — мессенджеры, heartbeat, приём команд
```

---

## 5. Экономика и риски

### Токены

| Сценарий | Провайдер | Модель | Эффект |
|----------|-----------|--------|--------|
| Рутинный кодинг | Google/DeepSeek | Gemini Flash/DS-V3 | 10-50x дешевле |
| Сложный анализ | Anthropic | Claude Opus/Sonnet | Макс. качество |
| Фоновые задачи | Anthropic | Claude Agent SDK | Нативно |

### Матрица рисков

| Риск | Pi Agent | NanoClaw | OpenClaw |
|------|----------|----------|----------|
| Prompt injection | Средний | Низкий (контейнер) | Высокий |
| Утечка данных | Средний | Низкий (allowlist) | Высокий |
| Неконтрол. действия | Низкий | Низкий (sandbox) | Высокий |
| Сложность аудита | Низкая | Очень низкая | Очень высокая |

### Стратегический контекст

OpenClaw тяготеет к OpenAI (Steinberger перешёл туда, спонсорство). NanoClaw — на Anthropic SDK. Pi Agent — модель-агностик.

### Рекомендации исследования

1. **Начать с NanoClaw** — нативная интеграция с Claude Code, безопасен, ~500 строк (17% контекста)
2. **Добавить Pi Agent для экономии** — делегирование на дешёвые модели через RPC/Print
3. **OpenClaw — только если нужны мессенджеры** — gateway с осторожной настройкой безопасности

---

## Ссылки

- Pi Agent: pi.dev | github.com/badlogic/pi-mono | npm: @mariozechner/pi-coding-agent
- OpenClaw: openclaw.ai | github.com/openclaw/openclaw
- NanoClaw: nanoclaw.dev | github.com/qwibitai/nanoclaw
- Блог Armin Ronacher о Pi: lucumr.pocoo.org/2026/1/31/pi/
- Блог Mario Zechner: mariozechner.at/posts/2025-11-30-pi-coding-agent/
