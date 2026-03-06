# Plan: Telemetry Dashboard v2 — Algorithm + Active Agents + Operational Improvements

## Context

Текущий Telemetry Dashboard (`telemetry-dashboard.sh`) показывает только агрегированные метрики (Golden Signals, Providers, System counters). Не видно:
- **Какая задача сейчас в Алгоритме** (фаза, прогресс, slug)
- **Какие агенты активны** (start без stop)
- **Последняя активность** по категориям (inference, voice, agents)

Данные уже есть в events.jsonl (`prd.synced`, `agent.start`/`agent.stop`) и work.json — нужно только отображение.

## Изменения

### Файл: `config/kitty/scripts/telemetry-dashboard.sh`

**Добавить 3 новых секции** между Golden Signals и Providers:

#### 1. ALGORITHM (текущая задача)
```
ALGORITHM
  kitty-tui-best-practices     EXECUTE  ████████░░ 16/20
```
- Источник: `MEMORY/STATE/work.json` — последняя сессия с phase != complete
- Если нет активной — `(idle)` серым
- Progress bar через `progress_bar()` из ui.sh
- Slug обрезан до 30 символов

#### 2. ACTIVE AGENTS (кто работает)
```
AGENTS (2 active)
  Engineer  a4e2b32  fix upstream #905      2м
  Engineer  a96120b  fix statusline spacing  1м
```
- Вычисление: agent.start без парного agent.stop (по agent_id)
- Показывать: type, id[:7], description[:25], elapsed time
- Если нет активных — `(no active agents)` серым
- Данные прямо из events.jsonl (jq фильтр)

#### 3. RECENT ACTIVITY (последние 5 событий, кроме inference)
```
RECENT
  15:32 🧠 a0.response  ctx=bAZ18fq7
  15:30 📋 prd.synced   φ=execute prog=16/20
  15:28 🚀 agent.start  Engineer a4e2b32
  15:25 ⭐ rating       ★8
  15:20 🔊 voice.sent   hook=Algorithm
```
- Последние 5 non-inference событий
- Формат из events-format.sh (reuse цвета и иконки)
- Compact: время + иконка + тип + 1 деталь

### Порядок секций (итого):
1. Header (дата, время, pulse)
2. **ALGORITHM** (новый)
3. **AGENTS** (новый)
4. GOLDEN SIGNALS (существующий)
5. API PROVIDERS (существующий)
6. **RECENT** (новый)
7. SYSTEM (существующий)
8. Footer (keys)

### Дополнительно: EventLogger.hook.ts enrichment

Сейчас `agent.start` не записывает `description`. В хуке:
```typescript
// SubagentStart handler — line ~25
description: (input.prompt || '').slice(0, 100)
```
Но в реальных events data — `description` отсутствует. Проверить и починить если нужно.

## Реализация

1. Добавить `compute_algorithm()` — читает work.json, находит последнюю не-complete сессию
2. Добавить `compute_active_agents()` — jq: все agent.start ids минус agent.stop ids
3. Добавить `compute_recent()` — jq: последние 5 non-inference событий
4. Добавить секции в `build_metrics()`
5. Проверить EventLogger — починить description если не записывается

## Файлы
- `config/kitty/scripts/telemetry-dashboard.sh` — основные изменения
- `hooks/EventLogger.hook.ts` — проверить/fix description field

## Верификация
1. `bash -n telemetry-dashboard.sh` — синтаксис
2. Визуальная проверка через ZaiVision screenshot
3. Убедиться что jq не падает на пустых/битых данных
4. `bun test hooks/tests/` — тесты не ломаются
