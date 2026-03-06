# Plan: Telemetry Dashboard — два layout'а + tail -f streaming

## Context

Таб Телеметрия (📡) перерисовывает ВСЁ каждые 10 секунд, включая LIVE EVENTS — логи из events.jsonl. Логи не нуждаются в периодическом poll'е, им нужен real-time streaming (tail -f). Разделяем на 2 layout'а для разных use case.

## Изменения

### Файл: `config/kitty/scripts/telemetry-dashboard.sh`

**1. Переменная LAYOUT** — `"dashboard"` (default) или `"livelog"`

**2. Layout 1 — Dashboard (клавиша `1`)**
- Golden Signals (без изменений)
- Provider + System Stats (без изменений)
- БЕЗ секции LIVE EVENTS
- Poll 10s как сейчас

**3. Layout 2 — Live Log (клавиша `2`)**
- Легенда событий сверху (постоянный блок):
  ```
  ┌── 📡 LIVE LOG ─────────────────────────────┐
  │ ЛЕГЕНДА:                                    │
  │ 🔮 inference — API вызов к LLM              │
  │ 🔊 voice     — голосовое уведомление        │
  │ 🚀 agent.start — спавн субагента            │
  │ 🏁 agent.stop  — субагент завершился        │
  │ ⭐ rating     — оценка сессии               │
  │ 📦 work       — рабочий блок завершён       │
  │ 📋 prd        — синхронизация PRD            │
  │ 🧠 a0         — Agent Zero (VPS)            │
  │ ─── ПОЛЯ ──────────────────────────────     │
  │ src= источник │ via= провайдер │ φ= фаза    │
  │ hook= хук     │ ★ рейтинг     │ prog= %    │
  ├─────────────────────────────────────────────┤
  │ 14:32:01 🔮 ok   via=anthropic 2.1s         │
  │ ... tail -f streaming ...                    │
  ```
- `tail -f events.jsonl | jq --unbuffered` — реальный стриминг
- Реализация: фоновый процесс `tail -f | jq` + trap cleanup
- Переключение на `1` убивает tail и возвращает в Dashboard poll

**4. Навигация**
- `1` → Dashboard layout
- `2` → Live Log layout
- `f/i/v/h/a` → фильтры (работают в обоих layouts: в Dashboard влияют на метрики? нет — только в Live Log)
- `r` → refresh (только Dashboard)
- `q` → выход

**5. Архитектурное решение для tail -f**
- При входе в Layout 2: рисуем легенду, запускаем `tail -f | jq` в foreground
- Ловим keypress через `stty` настройку (raw mode) — нет, проще: tail -f отправляет вывод напрямую в терминал, а мы ловим ключ `1` или `q` через trap + background read
- Реально проще: используем подход events-tail.sh — `tail -f | jq` работает как foreground, но мы оборачиваем в цикл где читаем input
- Самый простой: запускаем tail -f в background (`&`), PID сохраняем. Main loop продолжает `read -rsn1 -t1`. При нажатии `1` — kill PID, переключаем layout, poll().

### Переиспользование кода из events-tail.sh
- jq фильтр форматирования событий (~строки 45-141) — идентичен коду в telemetry-dashboard.sh (строки 200-292)
- Вынесем jq скрипт в переменную `JQ_EVENT_FORMAT` чтобы использовать и в poll-режиме и в tail-f

## Verification
1. Запустить `telemetry-dashboard.sh` — видим Dashboard (Golden Signals + Provider + System)
2. Нажать `2` — переключается на Live Log с легендой + streaming
3. Добавить тестовое событие в events.jsonl — появляется мгновенно
4. Нажать `1` — возвращаемся в Dashboard
5. `q` — выход чисто (tail -f процесс убит)
