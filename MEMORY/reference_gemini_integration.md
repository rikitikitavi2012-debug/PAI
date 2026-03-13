---
name: Gemini CLI Integration Architecture
description: Схема интеграции Gemini CLI с PAI — GEMINI.md, symlinks, hooks, skills, commands, routing table, DOMAINS
type: reference
---

# Gemini CLI Integration Architecture (2026-03-13)

## Коммуникация

**Интерактивный:** `gemi` (bash alias) → `gemini --include-directories ~/.claude/PAI/USER/`
**Headless:** `echo "prompt" | gemini -p "" -y -o text --include-directories ~/.claude/PAI/USER/`
**Inference API:** `bun ~/.claude/PAI/Tools/Inference.ts --level gemini "system" "user"`
**Proxy:** Амстердам VPS через `_ensure_proxy`
**Auth:** OAuth (riki.tiki.tavi.2012@gmail.com)

## Контекст (всегда загружается)

**GEMINI.md** (`~/.gemini/GEMINI.md`) через `@./shared/` импорты:
- ABOUTME.md, AISTEERINGRULES.md
- TELOS: MISSION, GOALS, STATUS, CHALLENGES, STRATEGIES, BELIEFS, WISDOM
- Все через **симлинки** → `~/.claude/PAI/USER/` (всегда актуальны, sync не нужен)

## Симлинки

### shared/ (10 файлов → PAI/USER)
ABOUTME, AISTEERINGRULES, BELIEFS, CHALLENGES, GOALS, MISSION, STATUS, STRATEGIES, TELOS, WISDOM

### skills/ (6 → ~/.claude/skills/)
ContentAnalysis, Investigation, Media, TFContent, Telos, Thinking

## Hooks (2)

| Hook | Файл | Что делает |
|------|------|------------|
| SessionStart | `hooks/session-start.sh` | Инъекция PAI контекста (principal, role, season) |
| BeforeTool | `hooks/before-tool-security.sh` | Блокировка записи в `~/.claude/` |

## Custom Commands (5)

navi.toml, pai.toml, telos.toml, tf.toml, think.toml

## Routing Table (GEMINI.md)

Полная таблица маршрутизации к файлам PAI:
- **TELOS:** 14 файлов (все, включая PROBLEMS, FRAMES, MODELS, TRAUMAS, LEARNED, WRONG, PREDICTIONS)
- **DOMAINS/construction:** timber_frame (5), landscaping (6), market (4), estimates (1), processes (4), normatives (3+папка)
- **TF Knowledge Base:** 13 файлов глубокой экспертизы
- **USER:** opinions, business

## Отличия от A0

| Аспект | Gemini CLI | A0 |
|--------|-----------|-----|
| Sync | Симлинки (мгновенно) | Weekly git pull task |
| Контекст | GEMINI.md @imports | knowledge/custom/ RAG |
| Память | save_memory tool → GEMINI.md | FAISS vector store |
| Доступ | Прямой к файлам WSL | Только через git repo |
| Write | Заблокирован хуком | Пишет в MEMORY/STATE/ |

## Extensions

- **Jules** (`~/.gemini/extensions/gemini-cli-jules/`) — async code execution

## Улучшения (TODO)

- [ ] Добавить Research skill в симлинки
- [ ] Создать command landscaping.toml для быстрого доступа к благоустройству
- [ ] Проверить `save_memory` tool — может ли Gemini сам сохранять findings
- [ ] Добавить YandexDirect skill в симлинки (для маркетинговых задач)

## Связанные файлы

- `~/.gemini/GEMINI.md` — основной контекст
- `~/.gemini/settings.json` — hooks конфигурация
- `~/.gemini/shared/` — симлинки на PAI/USER
- `~/.gemini/skills/` — симлинки на скиллы
- `~/.gemini/commands/` — custom TOML commands
- `~/.gemini/hooks/` — session-start + security
