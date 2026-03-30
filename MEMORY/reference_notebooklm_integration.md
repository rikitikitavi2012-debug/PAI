---
name: NotebookLM Integration
description: Архитектура интеграции Google NotebookLM в PAI — выбор инструмента, паттерны использования, риски, экосистема
type: reference
---

## Инструмент: notebooklm-py (teng-lin)

- **GitHub**: 5,961 stars, v0.3.4, MIT
- **Установка**: `pip install --break-system-packages notebooklm-py`
- **CLI**: `notebooklm` — полный набор команд
- **Auth**: `~/.notebooklm/storage_state.json` (Playwright cookies)
- **PAI Skill**: `skills/NotebookLM/SKILL.md` с 6 workflows

## Ключевые паттерны использования

1. **Zero-Token YouTube Research** — NLM бесплатно транскрибирует видео, Claude запрашивает результат. Экономия 10-100x токенов.
2. **Research Memory + Reasoning** — NLM держит документы (грунтованные ответы), Claude рассуждает и действует.
3. **Content Pipeline** — статья → NLM → подкаст = 2x контент из одного усилия.
4. **Audio Learning** — техдоки → Audio Overview для пассивного обучения (сезон 6/1).

## Риски

- **Отдельный Google аккаунт ОБЯЗАТЕЛЕН** — юрист потерял весь Gmail/Photos/Voice (137 upvotes r/LocalLLaMA)
- **Cookie expiry**: 1-2 часа (Китай) → 2-4 недели (Европа)
- **Undocumented API** — notebooklm-py имеет daily RPC health monitoring
- **FastMCP PR не слит** (март 2026) — PR #156 и #166 открыты

## Альтернативы

- **notebooklm-mcp-cli** (jacob-bd): 2,569 stars, 35 MCP tools, context bloat
- **nblm-rs**: Rust SDK для Enterprise API (alpha)
- **Open Notebook**: Self-hosted, 4,100 stars, 16+ провайдеров
- **notebooklm-sdk** (npm): TypeScript порт notebooklm-py (15.03.2026)

## Почему не MCP-CLI для PAI

35 tool schemas загружаются всегда → context bloat. Sub-agents наследуют все 35 tools. Обходит Skill/Workflow систему PAI.
