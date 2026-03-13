---
name: OpenCode CLI Integration Architecture
description: Схема интеграции OpenCode с PAI — AGENTS.md, plugin, symlinks, routing table, DOMAINS, providers
type: reference
---

# OpenCode CLI Integration Architecture (2026-03-13)

## Коммуникация

**Интерактивный:** `oc` (bash alias) → `opencode` с proxy
**Headless:** `opencode run --dir /path "prompt"`
**С моделью:** `opencode run -m zai/glm-5-air-0827 "prompt"`
**JSON output:** `opencode run --format json "prompt" | jq .`
**Proxy:** Амстердам VPS через `_ensure_proxy`

## Контекст

### AGENTS.md (`~/.config/opencode/AGENTS.md`)
- Роль, принципы, координация с PAI
- Routing table: 14 TELOS + DOMAINS (timber frame, landscaping, market, processes, normatives)
- Build & test инструкции

### Plugin (`~/.config/opencode/plugins/pai-context.ts`)
- Инъекция PAI контекста в system prompt (principal, role, season, routing)
- Guard: блокировка записи в `~/.claude/PAI/`
- Сезонное определение (construction 6/1 vs off-season)

## Симлинки

### shared/ (9 файлов → PAI/USER)
ABOUTME, AISTEERINGRULES, BELIEFS, CHALLENGES, GOALS, MISSION, STATUS, STRATEGIES, WISDOM

### skills/ (пуста — OpenCode использует agents/ вместо skills)

## Providers & Models

| Provider | Модель | Контекст | Роль |
|----------|--------|----------|------|
| OpenCode Go | Kimi K2.5 | 100k+ | Default |
| Z.AI | GLM-4 Plus | 128k | Fallback |
| Z.AI | GLM-4.1V Thinking | 200k | Vision + reasoning |
| Z.AI | GLM-5 Air | 200k | High-quality |

## MCP Servers

- **zai-vision** — 13 vision tools (Z.AI MCP server)

## Config Hierarchy

1. Global: `~/.config/opencode/opencode.json`
2. AGENTS.md: `~/.config/opencode/AGENTS.md`
3. Plugin: `~/.config/opencode/plugins/pai-context.ts`
4. State: `~/.local/state/opencode/` (DB, model.json, history)

## Отличия от Gemini CLI

| Аспект | OpenCode | Gemini CLI |
|--------|----------|-----------|
| Context file | AGENTS.md | GEMINI.md |
| Provider | Kimi K2.5 / Z.AI GLM | Google Gemini Pro |
| Plugin system | TypeScript plugins | Bash hooks |
| Skills | agents/ (markdown) | symlinks to PAI skills |
| Memory | Нет native | save_memory tool |
| `instructions` array | Поддерживается | Нет |
| Claude compat | Читает CLAUDE.md fallback | Нет |

## Custom Agents (4 шт, `~/.config/opencode/agents/`)

| Агент | Файл | Модель | Mode | Назначение |
|-------|------|--------|------|------------|
| construction | construction.md | GLM-5 | subagent | Строительная экспертиза, нормативы, сметы |
| content | content.md | Kimi K2.5 | subagent | SEO-контент для timber-frame-spb.ru |
| reviewer | reviewer.md | MiniMax M2.5 | subagent | Code review другой моделью |
| telos | telos.md | Kimi K2.5 | subagent | TELOS анализ, противоречия, прогресс |

**Вызов:** subagent'ы спавнятся build агентом изнутри сессии (делегирование).
**AGENTS.md** содержит таблицу агентов — build видит и знает когда делегировать.

## Возможности для роста

- **`instructions` array** — подключить доп. файлы прямо в config (пока не нужно — plugin + AGENTS.md покрывают)
- **`opencode serve`** — HTTP API для программного A2A доступа (localhost:4096)

## Улучшения (TODO)

- [ ] Рассмотреть `opencode serve` для A2A интеграции с Navi
- [ ] При появлении новых доменов — создать агента (real-estate, investment и т.д.)

## Связанные файлы

- `~/.config/opencode/opencode.json` — providers, MCP
- `~/.config/opencode/AGENTS.md` — контекст PAI
- `~/.config/opencode/plugins/pai-context.ts` — plugin инъекции
- `~/.config/opencode/shared/` — 9 симлинков на PAI/USER
- `~/.local/state/opencode/model.json` — текущая модель
- `~/.bashrc` — alias `oc` с proxy
