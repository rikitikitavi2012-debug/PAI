# Plan: 📡 PAI Telemetry Dashboard — отдельный таб

## Context

Events stream сейчас зажат в 1/4 pane внутри Brigade таба. Для полноценного мониторинга нервной системы PAI нужен отдельный полноэкранный таб с golden signals, live events, провайдерами и системными метриками. Ivan = диспетчер, Navi = исполнитель.

## Файлы

| Действие | Файл |
|----------|------|
| **CREATE** | `config/kitty/scripts/telemetry-dashboard.sh` (~350 строк) |
| **MODIFY** | `config/kitty/sessions/pai.session` — добавить Tab 4, убрать events из Brigade |

Референсы (только чтение):
- `config/kitty/scripts/events-tail.sh` — порт логики форматирования событий (иконки, цвета, UTC→local)
- `config/kitty/scripts/lib/ui.sh` — все UI примитивы
- `config/kitty/scripts/brigade-watch.sh` — паттерн структуры (poll loop, alt_screen)

## Layout (96 chars)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📡 PAI TELEMETRY                                         04 Мар 2026 17:42  ●  ↻10с        │
├──────────────┬───────────────┬───────────────┬───────────────────────────────────────────────┤
│ ⏱ LATENCY   │ 📊 TRAFFIC    │ ❌ ERRORS     │ 📦 SATURATION                                │
│ P95: 4.2s   │ 42 evt/ч      │ 76.8% fail    │ 661 events                                   │
│ ████░░░ ok  │ █████░░░ ok   │ █████████ CRIT│ ████░░░░ ok                                  │
├──────────────┴───────────────┴───────────────┴───────────────────────────────────────────────┤
│ 📡 LIVE EVENTS (f=fails i=inference v=voice a=all)                        фильтр: ALL       │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  17:41:33 🔮 fail  src=Inference │ lvl=fast │ via=claude │ 2.9s                              │
│  17:41:30 🔊 sent  src=VoiceCompletion │ 84 chars                                           │
│  17:40:52 🚀 start src=EventLogger │ agent=Explore                                          │
│  ... (25 строк live events) ...                                                             │
├─────────────────────────────────────────────┬────────────────────────────────────────────────┤
│  API ПРОВАЙДЕРЫ                             │  СИСТЕМА                                      │
├─────────────────────────────────────────────┼────────────────────────────────────────────────┤
│  claude  77ok / 256fail  P95:4.2s           │  30 хуков  34 тест-сьюта                      │
│  zai      4ok /   0fail  P95:—              │  Voice: 58 sent  0 failed                     │
│  google   0ok /   0fail  P95:—              │  Agents: 19 start  18 stop                    │
│                                             │  Events: 661 total  17 sessions               │
├─────────────────────────────────────────────┴────────────────────────────────────────────────┤
│ ↻ 10с │ r=обновить │ q=выход │ f/i/v/a/h=фильтр                                 17:42      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Golden Signals (из events.jsonl за всё время)

| Signal | Метрика | Источник | green | yellow | red |
|--------|---------|----------|-------|--------|-----|
| Latency | P95 inference latency | inference.ok → data.latency_s | <5s | 5-15s | >15s |
| Traffic | Events/час | все events с timestamp за последний час | 10-100 | <10 или >200 | >500 |
| Errors | Inference fail rate % | fail/(ok+fail)*100 | <20% | 20-50% | >50% |
| Saturation | Всего events в файле | wc -l events.jsonl | <1000 | 1000-5000 | >5000 |

## Подход к данным

**1 jq -s вызов** на весь events.jsonl → все метрики за один проход (TSV output → bash vars). При 661 строке это <100ms.

Отдельно: `tail -n 25 events.jsonl | jq` для live stream секции (быстро, только последние строки).

## Клавиши

| Key | Действие |
|-----|----------|
| `r` | Обновить сейчас |
| `q` | Выход |
| `f` | Фильтр: только fails |
| `i` | Фильтр: только inference |
| `v` | Фильтр: только voice |
| `h` | Фильтр: только hooks/agents |
| `a` | Сбросить фильтр (все) |

## Изменения в pai.session

**Tab 3 (Brigade)** — убрать events-tail.sh pane:
```
new_tab  🤖 Brigade
layout tall
launch --title "Brigade Watch" bash -c 'exec ~/.config/kitty/scripts/brigade-watch.sh'
launch --location=vsplit --title "A0 Chat" bash -c 'exec ~/.config/kitty/scripts/a0-chat-tail.sh'
```

**Новый Tab 4 (Telemetry)** — вставить после Brigade:
```
new_tab  📡 Telemetry
layout splits
launch --title "Telemetry" bash -c 'exec ~/.config/kitty/scripts/telemetry-dashboard.sh'
```

Итого 7 табов: TELOS → Center → Brigade → **Telemetry** → Infra → PAI → Projects

## Шаги реализации

1. Создать `telemetry-dashboard.sh` — скелет (alt_screen, poll loop, lib/ui.sh)
2. Реализовать `compute_metrics()` — единый jq -s проход
3. Реализовать `render_golden_signals()` — 4 gauge бара
4. Портировать форматирование из `events-tail.sh` в `render_event_stream()` (one-shot, не tail -f)
5. Реализовать `render_providers()` + `render_system_stats()` (two_col)
6. Добавить фильтрацию по клавишам
7. Добавить dynamic tab coloring
8. `chmod +x telemetry-dashboard.sh`
9. Модифицировать `pai.session`

## Верификация

1. `bash telemetry-dashboard.sh` — рендерится без ошибок
2. `time jq -s 'length' events.jsonl` — <1s
3. Клавиши `f/i/v/a` работают, фильтр переключается
4. `kitty --session pai.session` — 7 табов, Telemetry = Tab 4
5. Brigade таб — 2 pane (без events)
6. Ширина 96 — нет переносов строк
7. Пустой events.jsonl — graceful fallback
