# Plan: PAI Events Dashboard — UX & Functionality Overhaul

## Context

Tab 4 "Brigade" в Kitty PAI Workspace имеет два скрипта:
- **brigade-watch.sh** (левая панель) — поллинг A0/Jules/AutoMerge каждые 30с
- **events-tail.sh** (правая панель) — live tail events.jsonl

**Проблемы (выявлены при исследовании):**

1. **UTC timestamps** — events.jsonl хранит UTC (`14:04:31.175Z`), а Moscow time = UTC+3 (`17:04:31`). Dashboard показывает UTC, разница 3 часа — Ivan видит неправильное время
2. **Нет видимости чатов A0** — только health check, нет сообщений из диалогов Agent Zero
3. **Нет событий Z.AI** — Inference.ts не пишет события при вызове GLM-5
4. **Нет событий хуков/инструментов** — 30 хуков работают, но только часть эмитит в events.jsonl
5. **Шум worktree_create** — 325 из 1369 событий (24%) — тестовый мусор
6. **Нет real-time для brigade-watch** — 30с поллинг, не видно промежуточных состояний

## Approach: 3-Phase Incremental Improvement

### Phase 1: Fix Events Display (Quick Wins)

**1.1 UTC → Local Time в events-tail.sh**
- File: `~/.claude/config/kitty/scripts/events-tail.sh`
- Проблема: jq извлекает `HH:MM:SS` из ISO UTC timestamp как есть
- Решение: Использовать `date -d` для конвертации UTC→local в jq pipeline, или предварительно конвертировать через bash `date` подстановку
- Реализация: заменить jq timestamp extraction на post-processing через `date`:
  ```
  # В jq выводим полный ISO timestamp, затем через sed + date конвертируем
  # Или проще: в jq добавить offset +3h через арифметику часов
  ```
- Наиболее надёжно: выводить из jq raw ISO timestamp, затем через `while read` конвертировать `date -d "$ts" '+%H:%M:%S'`

**1.2 Фильтрация шума worktree_create**
- File: `~/.claude/config/kitty/scripts/events-tail.sh`
- Добавить фильтр: пропускать `worktree_create` и `worktree_remove` события из test harness (где путь содержит `test-wc-`)
- Или: показывать worktree события компактно (одной строкой с счётчиком)

**1.3 Relative Time ("3s ago") для свежих событий**
- Для событий <60s — показывать "Xs ago" вместо абсолютного времени
- Не обязательно на первом этапе, но приятный UX

### Phase 2: Event Enrichment (New Event Types)

**2.1 Inference Events → events.jsonl**
- File: `~/.claude/PAI/Tools/Inference.ts`
- При каждом вызове inference (любой level) — emit event в events.jsonl:
  ```json
  {"type": "inference.call", "source": "Inference", "data": {"level": "glm5", "provider": "zai", "model": "glm-5"}, "timestamp": "..."}
  ```
- Для Z.AI добавить icon 🔮 и цвет в events-tail.sh
- Для Gemini — icon 💎

**2.2 A0 Communication Events**
- File: `~/.claude/PAI/Tools/AgentZero.ts`
- При каждом вызове `message`/`async` — emit event:
  ```json
  {"type": "a0.message_sent", "source": "AgentZero", "data": {"context_id": "...", "preview": "first 50 chars..."}, "timestamp": "..."}
  ```
- При получении ответа (sync message):
  ```json
  {"type": "a0.response", "source": "AgentZero", "data": {"context_id": "...", "latency_s": "22.1", "preview": "first 50 chars..."}, "timestamp": "..."}
  ```
- Добавить icon 🧠 и cyan цвет в events-tail.sh

**2.3 Hook Execution Events** (optional, low priority)
- EventLogger.hook.ts уже ловит agent.start/stop, но не все хуки эмитят
- Не трогаем — слишком шумно. Хуки которые важны (voice, prd, rating) уже эмитят.

### Phase 3: A0 Chat Live Viewer (New Script)

**3.1 Новый скрипт: a0-chat-tail.sh**
- File: `~/.claude/config/kitty/scripts/a0-chat-tail.sh`
- Поллит `/api_log_get` с known context_id каждые 5с
- Показывает сообщения в формате чата:
  ```
  17:04:31  👤 Ivan: Review this PR diff...
  17:04:53  🧠 A0: I've reviewed the diff. Found 3 issues...
  ```
- Context ID: читает из state файла `~/.claude/MEMORY/STATE/a0-active-context.json`
  - AgentZero.ts будет записывать context_id при каждом вызове

**3.2 Обновить сессию — Brigade tab layout**
- File: `~/.claude/config/kitty/sessions/pai.session`
- Brigade tab: 3 панели вместо 2:
  ```
  ┌─────────────────┬──────────────────┐
  │  Brigade Watch   │  PAI Events     │
  │  (A0/Jules/AM)   │  (live feed)    │
  │                  ├──────────────────┤
  │                  │  A0 Chat Log    │
  │                  │  (live tail)    │
  └─────────────────┴──────────────────┘
  ```
- Left: brigade-watch.sh (как есть)
- Top-right: events-tail.sh (с фиксами Phase 1)
- Bottom-right: a0-chat-tail.sh (новый)

### Phase 3b: AgentZero.ts — Context Tracking

- При каждом вызове `message`/`async` — сохранять context_id в state:
  ```json
  // ~/.claude/MEMORY/STATE/a0-active-context.json
  {"context_id": "abc-123", "updated": "2026-03-03T17:04:31Z", "last_message": "Review PR..."}
  ```
- a0-chat-tail.sh читает этот файл и знает какой чат поллить

## Files to Modify

| File | Action | Phase |
|------|--------|-------|
| `config/kitty/scripts/events-tail.sh` | Fix UTC→local, filter noise, add new event colors | 1 |
| `PAI/Tools/Inference.ts` | Add event emission after each inference call | 2 |
| `PAI/Tools/AgentZero.ts` | Add event emission + context_id tracking to state | 2, 3b |
| `config/kitty/scripts/a0-chat-tail.sh` | **NEW** — A0 chat live viewer | 3 |
| `config/kitty/sessions/pai.session` | Update Brigade tab to 3-pane layout | 3 |

## Existing Code to Reuse

- **Event emission**: `hooks/lib/event-emitter.ts` — `appendEvent()` with auto timestamp/session_id
- **Event types**: `hooks/lib/event-types.ts` — typed events, use `CustomEvent` (`custom.*`) for new types
- **A0 API**: `PAI/Tools/AgentZero.ts:apiCall()` — POST with X-API-KEY header
- **Color palette**: Both scripts share PAI palette (cyan, violet, emerald, etc.)
- **State files**: `MEMORY/STATE/` — standard JSON state location
- **getPaiDir()**: `hooks/lib/paths.ts` — canonical base dir resolver

**Note on event emission from Tools/**: Tools (Inference.ts, AgentZero.ts) can import `appendEvent` directly from `hooks/lib/event-emitter.ts` — same process, sync write, no hook overhead. Alternatively, lightweight inline `appendFileSync` to avoid import chain.

## Verification

1. **UTC fix**: запустить events-tail.sh, сравнить время с `date '+%H:%M:%S'` — должны совпадать
2. **Worktree filter**: tail events с worktree_create от тестов — не должны показываться
3. **Inference events**: `bun Inference.ts --level glm5 "test" "hello"` → событие `inference.call` в events-tail.sh с icon 🔮
4. **A0 events**: `bun AgentZero.ts message "test"` → события `a0.message_sent` + `a0.response` + context_id в state
5. **A0 chat tail**: a0-chat-tail.sh показывает последний диалог из state
6. **Session layout**: Brigade tab = 3 панели (watch | events + a0-chat)
7. **Symlinks**: новый скрипт symlinked в `~/.config/kitty/scripts/`

## Order of Execution

1. **Phase 1** — events-tail.sh: UTC→local, worktree filter, new event colors (5 min)
2. **Phase 2** — Inference.ts + AgentZero.ts: event emission + context tracking (10 min)
3. **Phase 3** — a0-chat-tail.sh + session layout update (10 min)
4. **Verify** — all 7 checks above (5 min)
5. **Commit** — все изменения одним коммитом
