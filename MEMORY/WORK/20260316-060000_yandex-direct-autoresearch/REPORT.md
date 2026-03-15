# Аналитический отчёт: Автономная оптимизация Яндекс Директа

**Дата:** 2026-03-16
**Автор:** Navi (PAI v4.0.3)
**Статус:** Исследование и проектирование

---

## Part I: PAI Algorithm v4.0-alpha vs Karpathy Autoresearch

### Главный инсайт: интеграция УЖЕ произошла

Внешний ресёрч сравнивал PAI Algorithm v3.5.0 с Karpathy Autoresearch и предлагал интеграцию. **Факт: PAI v4.0-alpha уже содержит Autoresearch sub-loop как встроенный режим EXECUTE фазы.** Вопрос не "как интегрировать", а "как адаптировать под рекламу".

### Сравнительная таблица (актуальная, v4.0-alpha)

| Аспект | PAI v4.0-alpha | Karpathy/Uditgoenka | Статус интеграции |
|--------|---------------|---------------------|-------------------|
| Тип цикла | 7-фазный (OBSERVE→LEARN) с Autoresearch sub-loop внутри EXECUTE | 8-фазный автономный (REVIEW→REPEAT) | ✅ Интегрирован: Cycle Selector маршрутизирует [Q] → Autoresearch |
| Метрика | Множественные ISC ([B] + [Q]), multiple [Q] sequential | Одна скалярная метрика | ✅ Расширен: поддержка 2+ [Q] последовательно с regression gates |
| Верификация | [B-fast]/[B-slow] gates + anti-criteria | Одна verify команда + Guard | ✅ Превосходит: tiered gates (fast/slow) + ISC-A hard stops |
| Stagnation | 5 → Amplify, 10 → STOP, domain-aware | Нет (бесконечный цикл) | ✅ Расширен: domain-aware stagnation, noise calibration |
| Обучение | LEARN фаза + Wisdom Frames + experiments.tsv readback | Git log + results TSV | ✅ Превосходит: learning loop замкнут, cross-task analytics |
| Drift control | Self-Interrogation L1 + L2 tactical + L3 structural | Atomic changes + auto-revert | ✅ Превосходит: 3-layered defense |
| Роль человека | Задаёт цели + OBSERVE + AskUser на Pareto conflicts | Задаёт цель + уходит спать | ✅ Гибрид: автономен но спрашивает на конфликтах |
| Cost model | Budget-aware: gate cost validation перед стартом | Нет | ✅ PAI уникален |
| Revert strategy | git reset --hard (clean history) | git revert (noise) | ✅ Оптимизирован |

### Что PAI v4.0-alpha ДОБАВИЛ поверх Karpathy

1. **Multiple [Q] sequential** — оптимизация 2+ метрик последовательно с regression gates
2. **Noise calibration** — 3-run variance check, адаптивная tolerance
3. **PARTIAL classification** — PROGRESSING vs BLOCKED (не просто "не достиг")
4. **Pause/resume** — recalibration при возобновлении
5. **Cost model gate** — проверка что бюджет gates не съест весь iteration budget
6. **Active Retrieval** — поиск похожих PRDs перед планированием
7. **LEARN readback** — insights из прошлых задач инжектятся в каждую сессию

### Что Karpathy/ARIS имеют, а PAI пока нет

1. **Бесконечный цикл без участия человека** — PAI останавливается по iteration cap
2. **Кросс-модельная верификация (ARIS)** — Claude исполняет, GPT рецензирует
3. **Scheduled execution** — cron-based автозапуск между сессиями
4. **Sleep mode** — работа ночью без интерактивного терминала

### Ответ на ключевой вопрос: "Как встроить autoresearch в PAI?"

**Уже встроен.** Autoresearch = специализированный режим EXECUTE фазы, маршрутизируемый через Cycle Selector:
- Все [B] критерии → Standard EXECUTE
- Любой [Q] критерий → Autoresearch EXECUTE (8-phase sub-loop)
- Mixed [B]+[Q] → Hybrid (Standard → Autoresearch)

Для Яндекс Директа это означает: создаём PRD с [Q] ISC (например `ISC-5 [Q]: CPA < 800 руб`), Algorithm автоматически маршрутизирует в Autoresearch, и sub-loop оптимизирует.

---

## Part II: Инвентаризация текущей инфраструктуры

### Что уже есть

| Компонент | Статус | Путь |
|-----------|--------|------|
| PAI Algorithm v4.0-alpha | ✅ Протестирован (14/14 механизмов) | `PAI/Algorithm/v4.0-alpha.md` |
| Autoresearch sub-loop | ✅ Работает | `PAI/Algorithm/Algorithm-Autoresearch.md` |
| YandexDirect skill | ✅ 4 workflows | `skills/YandexDirect/` |
| — KeywordResearch | ✅ | `Workflows/KeywordResearch.md` |
| — CampaignManagement | ✅ | `Workflows/CampaignManagement.md` |
| — BidOptimization | ✅ | `Workflows/BidOptimization.md` |
| — ReportAnalysis | ✅ | `Workflows/ReportAnalysis.md` |
| YANDEX_WORDSTAT_TOKEN | ✅ Есть | `.env` |
| YANDEX_DIRECT_TOKEN | ❌ Нет | Нужен OAuth с scope `direct:api` |
| YANDEX_METRIKA_TOKEN | ❌ Нет | Нужен OAuth с scope `metrika:read` |
| Рекламные кампании | ❌ Не созданы | timber-frame-spb.ru |
| Метрика цели | ❌ Не настроены | Нужны: заявка, звонок, чат |
| timber-frame-spb.ru | ✅ Задеплоен | Vercel, MVP ready |
| experiments.tsv readback | ✅ Работает | `hooks/lib/learning-readback.ts` |
| LEARN.md readback | ✅ Работает | `hooks/lib/learning-readback.ts` |

### Blockers (в порядке приоритета)

1. **YANDEX_DIRECT_TOKEN** — без него ничего не работает
2. **Цели в Метрике** — без них нет конверсий → нет CPA → нет метрики для Autoresearch
3. **Бюджет на рекламу** — без денег нет данных

---

## Part III: Оценка инструментов

### direct-mcp vs свой MCP vs raw API (YandexDirect skill)

| Критерий | direct-mcp | Свой MCP-сервер | YandexDirect skill (текущий) |
|----------|-----------|----------------|------------------------------|
| **Готовность** | Готов к использованию | 2-3 дня разработки | Готов (4 workflows) |
| **Стоимость** | 990 руб/мес | 0 | 0 |
| **Инструментов** | 119 Direct + 76 VK | Сколько напишем | 4 workflow (покрывают ~80% операций) |
| **Контроль** | Чужой сервер, токен уходит туда | Полный | Полный |
| **MCP protocol** | ✅ Нативный MCP | ✅ Можно реализовать | ❌ Через Skill tool, не MCP |
| **Безопасность** | Токен на чужом сервере | Токен локальный | Токен локальный |
| **Автономный цикл** | ✅ MCP → Claude может вызывать в sub-loop | ✅ То же | ⚠️ Через Skill tool — медленнее |
| **Wordstat** | ✅ Встроен | Нужно добавить | ✅ Через WORDSTAT_TOKEN |
| **Для соло-предпринимателя** | 990 руб/мес = завтрак | Время = дороже | Уже есть |

### Рекомендация

**Фаза 1: YandexDirect skill + raw API** (бесплатно, уже есть).
**Фаза 2: direct-mcp** если нужна скорость и VK Ads. 990 руб/мес оправдано когда кампании работают.
**Фаза 3: свой MCP** только если нужна кастомная логика которую direct-mcp не покрывает.

**Обоснование:** Для соло-предпринимателя с 1 сайтом, 4 workflow в YandexDirect skill покрывают все операции. MCP нужен для масштаба (10+ клиентов) или для бесшовной интеграции с Autoresearch sub-loop (MCP tools вызываются нативно, Skill tools — через дополнительный слой).

---

## Part IV: Архитектура гибридной системы

### Два слоя (PAI Strategy + Autoresearch Tactics)

```
┌──────────────────────────────────────────────────────────┐
│              PAI ALGORITHM (Strategic Layer)              │
│                                                          │
│  OBSERVE: Анализ рынка, конкурентов, сезонности          │
│  THINK: Какие кампании создать, какие метрики            │
│  PLAN: Структура аккаунта, бюджеты, таргетинг           │
│  BUILD: Создание кампаний через YandexDirect skill       │
│  ┌──────────────────────────────────────────────────┐    │
│  │    EXECUTE: Autoresearch Sub-Loop (Tactical)     │    │
│  │                                                  │    │
│  │  [Q] ISC: CPA < 800 руб                         │    │
│  │  verify: bun scripts/get-cpa.ts --days 7        │    │
│  │  guard: bun scripts/check-budget.ts             │    │
│  │                                                  │    │
│  │  REVIEW → IDEATE → MODIFY → COMMIT → VERIFY     │    │
│  │     ↑       → DECIDE → LOG → REPEAT             │    │
│  │     └────────────────────────────────┘           │    │
│  │                                                  │    │
│  │  Тактические действия:                           │    │
│  │  • Чистка поисковых запросов (минус-слова)       │    │
│  │  • Корректировка ставок по времени/устройству    │    │
│  │  • A/B тест текстов объявлений                  │    │
│  │  • Отключение неэффективных ключей              │    │
│  └──────────────────────────────────────────────────┘    │
│  VERIFY: Все ISC проверены                               │
│  LEARN: Паттерны → Wisdom Frames → LEARN.md              │
└──────────────────────────────────────────────────────────┘
```

### Адаптация Autoresearch под рекламный домен

| ML Autoresearch | Рекламный Autoresearch | Почему |
|-----------------|----------------------|--------|
| Цикл: 5 минут | Цикл: 24-72 часа | Статистическая значимость конверсий |
| Метрика: мгновенная | Метрика: агрегированная за период | Шум дневных колебаний |
| Revert: бесплатный | Revert: деньги уже потрачены | Нужны стоп-лоссы |
| Amplitude: любая | Amplitude: ограниченная (max ±20% ставки) | Бюджетная безопасность |
| Guard: тесты | Guard: бюджетный лимит + min CTR + min показы | Реальные деньги |
| Iteration cap: 200 | Iteration cap: 30 (1 месяц по 1/день) | Ограничение по времени |
| Stagnation: 5 discards | Stagnation: 3 discards (дни, не минуты) | Каждый discard = 1-3 дня |
| Noise: σ от повторных запусков | Noise: день-к-дню variance конверсий | Нужен moving average |

### Verification Script Architecture

```
scripts/
├── get-cpa.ts         # Директ API → CPA за период
├── get-ctr.ts         # CTR по кампаниям
├── get-conversions.ts # Метрика API → конверсии по целям
├── check-budget.ts    # Guard: дневной расход < лимит
├── check-min-ctr.ts   # Guard: CTR > порог (антиспам)
├── check-impressions.ts # Guard: показы > min (кампания жива)
└── daily-report.ts    # Агрегированный отчёт для LEARN
```

### Стоп-лоссы (критически важно)

| Параметр | Лимит | Действие при нарушении |
|----------|-------|----------------------|
| Дневной бюджет | max X руб/день | STOP sub-loop, alert |
| Изменение ставки | max ±20% за итерацию | Clamp to limit |
| Минимальный CTR | > 1% (поиск), > 0.1% (РСЯ) | STOP, investigate |
| Минимальные показы | > 100/день | Alert (кампания умирает) |
| Максимальный CPA | < 3× target | STOP + revert last change |
| Минус-слов за итерацию | max 50 | Clamp |

---

## Part V: Дорожная карта

### Фаза 0 — Исследование и проектирование (ТЕКУЩАЯ)

**Статус:** ✅ Выполняется
**Длительность:** 1 сессия
**Результат:** Этот отчёт + PRD

### Фаза 1 — Подготовка инфраструктуры

**Длительность:** 1-2 вечера
**Зависимости:** OAuth токен Яндекса

Задачи:
1. Получить YANDEX_DIRECT_TOKEN (OAuth, scope: direct:api)
2. Получить YANDEX_METRIKA_TOKEN (scope: metrika:read,write)
3. Настроить цели в Метрике для timber-frame-spb.ru (заявка, звонок, чат)
4. Написать verification scripts (get-cpa.ts, check-budget.ts)
5. Протестировать API в sandbox mode Директа
6. Определить бюджет на тестовый период

### Фаза 2 — Создание первых кампаний

**Длительность:** 1-2 вечера
**Зависимости:** Фаза 1 complete + бюджет выделен

Задачи:
1. Семантическое ядро через Wordstat (существующий workflow)
2. Создание кампаний: Поиск (точные запросы) + РСЯ (отдельно)
3. Написание объявлений (через TFContent skill для brand voice)
4. Настройка структуры: 1 кампания = 1 направление (террасы, навесы, беседки)
5. Установка начальных ставок и бюджетов
6. Прохождение модерации

### Фаза 3 — Сбор baseline данных

**Длительность:** 2-4 недели (пассивно)
**Зависимости:** Фаза 2 complete + кампании одобрены модерацией

Задачи:
1. Кампании работают 2-4 недели
2. Накопление статистики (показы, клики, CTR, конверсии)
3. Фиксация baseline CPA
4. Ежедневный мониторинг через ReportAnalysis workflow

### Фаза 4 — Запуск Autoresearch оптимизации

**Длительность:** Ongoing
**Зависимости:** Фаза 3 complete + baseline CPA зафиксирован + min 100 кликов

Задачи:
1. Создать PRD с [Q] ISC: `CPA < target` (target = baseline × 0.7)
2. Algorithm OBSERVE → Cycle Selector → Autoresearch EXECUTE
3. Цикл: 1 итерация/день (24h data window)
4. Тактики: минус-слова (day 1-7), корректировки ставок (day 8-14), A/B тексты (day 15-30)
5. LEARN после каждого 30-дневного цикла

### Фаза 5 (опционально) — Автономный ночной режим

**Зависимости:** 2+ успешных Autoresearch цикла

Задачи:
1. Cron-расписание: `0 6 * * * bun autoresearch-direct.ts` (каждое утро)
2. Чтение вчерашней статистики → формулировка гипотезы → применение изменения
3. Human checkpoint: сводка изменений в Telegram через A0 бота
4. Эскалация при аномалиях (CPA > 3× target, бюджет > лимит)

---

## Философия проекта

**Мы не делаем "ещё один инструмент управления Директом".** Мы создаём систему где AI-агент оптимизирует рекламу в интересах рекламодателя, а не платформы.

Яндекс зарабатывает на кликах → его алгоритмы оптимизируют расход. Мы зарабатываем на конверсиях → наш агент оптимизирует CPA.

Autoresearch парадигма Karpathy даёт фреймворк: гипотеза → эксперимент → измерение → решение. PAI Algorithm даёт стратегический слой: цели → риски → обучение → compound effect.

Вместе: **strategic AI + tactical optimization = автономный рекламный агент.**
