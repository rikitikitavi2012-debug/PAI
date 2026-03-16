# Следующая сессия: Фаза 3 — /autoresearch skill + Trust Levels + Telegram

## Контекст предыдущей сессии (2026-03-16 день)

Масштабная сессия — 90+ коммитов, Algorithm вырос с v3.6.0 до v4.0.0 (stable release):

1. ✅ G10 закрыта — 11 скиллов аудированы, 10 локализованы на русский
2. ✅ Полная RU локализация — 0 английских voice messages (170 файлов, 195 messages)
3. ✅ Algorithm v4.0.0 — 618 строк, 45 механизмов, 93/100 score
4. ✅ 6 новых механизмов: mid-session downshift, ISC quality gate, time budget enforcement, capability audit fast-path, interview protocol, verify@creation
5. ✅ 3 Miessler механизма: interview protocol, verification at creation, research override
6. ✅ 5 мировых механизмов: ACE Reflector/Curator, Agent-as-Judge, Context Isolation, CORPGEN Reuse, ACON Compression
7. ✅ 3 CLI инструмента: LearningRecall.ts, EffortPredictor.ts, ISCManager.ts
8. ✅ ISCQualityGate.hook.ts — 35-й хук, блокирует >30% тривиальных ISC
9. ✅ stdin sharing fixed — 5 event types разделены
10. ✅ Hook error fixed — двойной confirmWrite убран, VoiceCompletion race fix
11. ✅ UpdateTabTitle — Russian SYSTEM_PROMPT
12. ✅ THEHOOKSYSTEM.md — обновлён с 20 до 50 хуков, 15 event types
13. ✅ 36 Jules PRs обработаны (33 merged, 3 closed), 10 новых задач отправлены
14. ✅ 10 Wisdom Frames кристаллизованы из 14 LEARN.md
15. ✅ Statusline fix — ALG version из symlink readlink
16. ✅ Deep research — 27 queries, 6 findings, 5 adopted
17. ✅ 6 автономных loop cycles выполнены

Algorithm score: Miessler 57 → наш 93/100. Фазы 1 и 2 из ANALYSIS.md полностью закрыты.

## Задача этой сессии: Фаза 3

Источник: `MEMORY/WORK/20260315-algorithm-evolution-autoresearch/ANALYSIS.md` → Часть 3 → Фаза 3

### 3.1 `/autoresearch` skill (ПРИОРИТЕТ)

Создать полноценный скилл для автономной оптимизации метрик:

**SKILL.md:**
```yaml
name: Autoresearch
description: Autonomous metric optimization via iterative experimentation. USE WHEN autoresearch, optimize metric, CPA optimization, lighthouse score, performance optimization, автоисследование, оптимизация метрики, оптимизируй CPA, ночная оптимизация.
```

**Workflows:**
- `Plan.md` — интерактивный setup: выбор метрики, baseline замер, target, iteration cap, regression gates, dry-run
- `Run.md` — запуск Autoresearch Sub-Loop из v4.0.0.md EXECUTE фазы
- `Resume.md` — возобновление прерванного autoresearch (из PRD + experiments.tsv)
- `Report.md` — генерация отчёта из experiments.tsv (лучшие эксперименты, trajectory, diminishing returns)

**Ключевое:** Скилл — интерфейс, ядро — в Algorithm v4.0.0.md. Скилл создаёт PRD с [Q] критериями, Algorithm EXECUTE делает работу.

### 3.2 `/autoresearch:plan` wizard

Интерактивный workflow:
1. "Какую метрику оптимизировать?" → выбор или ввод
2. `bun PAI/Tools/LearningRecall.ts "тема"` → прошлый опыт
3. Dry-run: запуск verify команды → baseline measurement
4. Confirmation: "Target: X, Baseline: Y, Cap: Z iterations. Запускать?"
5. Создание PRD с [Q] критерием + verify command + experiments.tsv

### 3.3 Telegram notifications через A0

Интеграция autoresearch прогресса в @A0_timecloud_bot:
- Каждые 10 итераций → push в Telegram
- Формат: iteration/cap, current metric, trajectory, revert rate
- При completion/stagnation/error → алерт

Используй существующий: `PAI/Tools/AgentZero.ts` → `sendMessage()` для отправки.

### 3.4 Trust Level framework

Конфигурация в PRD frontmatter:
```yaml
trust_level: L3  # L1: supervised, L2: monitored, L3: autonomous, L4: scheduled
```

| Level | Поведение |
|-------|-----------|
| L1 | AskUserQuestion каждые 5 итераций |
| L2 | AskUserQuestion каждые 20 итераций |
| L3 | Telegram notifications, no questions |
| L4 | Запуск по расписанию (cron), полная автономия |

## Как работать

Используй Algorithm v4.0.0 (Deep effort — это создание нового скилла с 4 workflows).

1. OBSERVE: LearningRecall для контекста + EffortPredictor
2. THINK: Архитектура скилла (SKILL.md structure, workflow routing)
3. PLAN: Параллельные агенты (Agent 1: SKILL.md + Plan.md, Agent 2: Run.md + Resume.md, Agent 3: Report.md + Telegram)
4. BUILD: Создание файлов
5. EXECUTE: Smoke-test — вызвать `/autoresearch plan` на тестовой метрике
6. VERIFY: ISCManager show + verify
7. LEARN: Что сработало, паттерны

## Ожидаемые артефакты

1. `skills/Autoresearch/SKILL.md` — с русскими триггерами и voice
2. `skills/Autoresearch/Workflows/Plan.md` — интерактивный wizard
3. `skills/Autoresearch/Workflows/Run.md` — запуск sub-loop
4. `skills/Autoresearch/Workflows/Resume.md` — возобновление
5. `skills/Autoresearch/Workflows/Report.md` — отчёт из experiments.tsv
6. Trust Level config в Algorithm v4.0.0
7. Telegram integration для L3+
8. PRD + LEARN.md

## Важное

- Voice notifications на русском (шаблон: "Запускаю X в скилле Autoresearch")
- Русские триггеры в USE WHEN
- ISCManager.ts для управления критериями
- LearningRecall.ts в OBSERVE
- EffortPredictor.ts для effort level
- ISCQualityGate проверит качество ISC
- Тесты после создания
- Jules batch script для тестового покрытия
