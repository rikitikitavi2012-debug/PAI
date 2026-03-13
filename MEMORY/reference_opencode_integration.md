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

## Возможности для роста

- **`instructions` array** — подключить доп. файлы прямо в config
- **Custom agents** — создать специализированных агентов (construction-reviewer, telos-auditor)
- **`opencode serve`** — HTTP API для программного доступа (localhost:4096)

## Улучшения (TODO)

- [ ] Создать custom agent `construction` в `~/.config/opencode/agents/construction.md`
- [ ] Добавить `instructions` array с DOMAINS файлами в opencode.json
- [ ] Рассмотреть `opencode serve` для A2A интеграции с Navi
- [ ] Добавить Research/Telos skills через agents/ markdown

## Связанные файлы

- `~/.config/opencode/opencode.json` — providers, MCP
- `~/.config/opencode/AGENTS.md` — контекст PAI
- `~/.config/opencode/plugins/pai-context.ts` — plugin инъекции
- `~/.config/opencode/shared/` — 9 симлинков на PAI/USER
- `~/.local/state/opencode/model.json` — текущая модель
- `~/.bashrc` — alias `oc` с proxy
