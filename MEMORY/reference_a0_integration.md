---
name: A0 Integration Architecture
description: Полная схема интеграции Agent Zero (A0) с PAI — контекст, синхронизация, scheduled tasks, knowledge base, behaviour, улучшения
type: reference
---

# A0 Integration Architecture (2026-03-13)

## Коммуникация Navi ↔ A0

```
Navi (Claude Code, WSL)  ←→  AgentZero.ts (REST API)  ←→  A0 (Docker, VPS 72.56.86.51:50002)
```

**Инструмент:** `bun ~/.claude/PAI/Tools/AgentZero.ts`
**Команды:** `message` (sync, 600s), `async` (fire-and-forget), `health`, `status`, `log`, `poll`, `scheduler list/results/run`, `terminate`
**Auth:** `X-API-KEY: $A0_API_TOKEN` (в `~/.config/PAI/.env`)
**Fallback:** Container 1 на порту 50001 (escape hatch)

## Синхронизация контекста

### Git как Message Bus
```
Navi → git push private master → GitHub PAI-personal → A0 git pull → knowledge/custom/
A0 → результаты в MEMORY/STATE/ → git push → Navi git pull (через `poll`)
```

### Scheduled Tasks на A0 (7 шт)

| UUID | Задача | Расписание | Что делает |
|------|--------|------------|------------|
| `Wqg7hKhH` | Daily PAI Health Check | Ежедневно 04:00 MSK | git pull + проверка API/инфры |
| `zhDeNotK` | **Weekly PAI Context Sync** | Вс 02:00 MSK | git pull → sync DOMAINS+TELOS+USER → knowledge/custom/ |
| `2HRlisSR` | Weekly TELOS Progress | Пн 03:00 MSK | Анализ прогресса по целям |
| `iUeI9PnM` | Weekly Learning Mining | Пн 04:00 MSK | Паттерны из events/сессий |
| `mSo4moec` | Monthly Memory Compaction | 1-е число 02:00 MSK | Сжатие vector store |
| `4llSE4LR` | Weekly Security Scan | Вс 00:00 MSK | Аудит безопасности |
| `vN0bta7k` | Weekly Upstream Monitor | Вс 05:00 MSK | Мониторинг upstream PAI |

### Knowledge Base (заполнена 2026-03-13)

```
/a0/usr/knowledge/custom/
├── domains/      → 61 файл (construction: timber frame, МАФ, благоустройство, нормативы)
├── telos/        → 41 файл (GOALS, STRATEGIES, BELIEFS, WISDOM, FRAMES...)
├── user-core/    → 2 файла (ABOUTME.md, OPINIONS.md)
├── INDEX.md      → описание структуры
└── LAST_SYNC.txt → timestamp последней синхронизации
```

**RAG-индексация:** автоматическая — всё в knowledge/custom/ доступно через document_query

## Конфигурация A0

### LLM
- **Chat:** GLM-5 (zai_coding), 200k context, 11% history, temp 0.6
- **Utility:** Kimi K2.5, 100k context
- **Embeddings:** `paraphrase-multilingual-MiniLM-L12-v2` (multilingual, threshold 0.3 для русского)

### Behaviour.md (/a0/usr/memory/default/behaviour.md)
- Язык: русский
- Brigade Context: роли, протоколы
- Мудрость: W1, W5
- FRAMES: FR1, FR3, FR4
- Steering Rules: verification, surgical fixes, read before modify
- **Доменная экспертиза:** ссылки на knowledge/custom/ (domains, telos, user-core)

### Skills на A0 (9 шт)
telos, the-algorithm, a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, create-skill

## Интеграционные точки

1. **JulesAutoMerge** — A0 ревьюит код перед auto-merge (PAI/Tools/JulesAutoMerge.ts)
2. **BrigadeAudit** — A0 как внешний аудитор TELOS (skills/Telos/Workflows/BrigadeAudit.md)
3. **Brigade Dashboard** — мониторинг A0 health в Kitty (config/kitty/scripts/brigade-watch.sh)
4. **Events** — все взаимодействия логируются в MEMORY/STATE/events.jsonl

## Ограничения

- **WSL файлы недоступны** — только через git repo
- **Русский в embeddings** — threshold 0.3, дублировать критичное в файлы
- **Context window** — 200k (управляемо, 11% history)
- **.gitignore** — events.jsonl, settings.json не видны A0

## Цикл роста

```
Navi наращивает экспертизу (DOMAINS/, TELOS/)
  → git push private master
  → Вс 02:00 A0 sync task: git pull → knowledge/custom/
  → A0 использует экспертизу в задачах
  → A0 пишет findings в MEMORY/STATE/
  → git push → Navi подтягивает через poll
```

## Улучшения (TODO)

- [ ] Улучшить русский поиск: попробовать `labse` или `rubert-tiny2` вместо multilingual-MiniLM
- [ ] A2A интеграция: если Navi получит API endpoint — прямая коммуникация без git
- [ ] Webhook на push: GitHub → A0 pull (мгновенная синхронизация vs еженедельная)
- [ ] Увеличить `memories_max_result` до 8 для research задач
- [ ] PREFERENCES.md добавить в user-core/ sync (сейчас файл не найден в USER/)

## Связанные файлы

- `PAI/Tools/AgentZero.ts` — CLI инструмент (426 строк)
- `MEMORY/RESEARCH/2026-03/agent-zero-integration-plan.md` — старый план (03-03)
- `MEMORY/STATE/a0-*` — 15+ файлов состояния A0
- `MEMORY/STATE/a0-container-escape-hatch.md` — recovery через container 1
- `skills/Telos/Workflows/BrigadeAudit.md` — workflow бригадного аудита
