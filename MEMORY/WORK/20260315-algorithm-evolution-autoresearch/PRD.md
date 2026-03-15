---
task: Algorithm Evolution — Autoresearch Integration
slug: 20260315-algorithm-evolution-autoresearch
effort: deep
phase: complete
progress: 42/42
mode: algorithm
started: 2026-03-15T14:30:00
updated: 2026-03-15T14:30:00
---

## Context

Ivan запросил эволюцию ядра PAI Algorithm через интеграцию принципов Karpathy Autoresearch. Задача — НЕ копирование, а поглощение лучших идей обоих подходов и создание гибридного Algorithm следующего поколения. BUILD = документы (отчёт + предложение + дорожная карта), НЕ код.

Исследованы 3 репозитория: karpathy/autoresearch (минималистичный ML-оптимизатор), uditgoenka/autoresearch (domain-agnostic Claude Code skill), ARIS (end-to-end research pipeline с cross-model review).

### Risks
- Overengineering: добавление autoresearch может усложнить Algorithm без реальной пользы
- Loss of identity: PAI Algorithm может потерять свои сильные стороны (ISC, Self-Interrogation) при гибридизации
- Scope creep: 3 уровня мета-применения могут утянуть дизайн в абстракцию
- Impractical design: красивая архитектура, которую невозможно реализовать соло-разработчику
- Token drain: бесконечные autoresearch loops съедают бюджет без гарантии ROI
- Scope confusion: неясно когда ALGORITHM, когда AUTORESEARCH — пользователь теряется
- Не все задачи Ivan имеют скалярную метрику (дизайн, контент, архитектура)

## Criteria

### Блок 1: Сравнительный анализ (12 критериев)
- [x] ISC-1: Таблица сравнения содержит 10+ аспектов с выводами "кто сильнее и почему"
- [x] ISC-2: Честная самооценка слабостей PAI Algorithm (минимум 5 конкретных слабостей)
- [x] ISC-3: Анализ Loop Mode vs Autoresearch Loop — структурное сравнение
- [x] ISC-4: Анализ ISC (множественные критерии) vs скалярная метрика — когда что лучше
- [x] ISC-5: Анализ LEARN фазы vs Git+TSV — какой подход к обучению эффективнее
- [x] ISC-6: Анализ drift control — Self-Interrogation vs Atomic Changes
- [x] ISC-7: Анализ роли человека — feedback loop vs "уходи спать"
- [x] ISC-8: Анализ планирования — THINK+PLAN vs "сразу к действию"
- [x] ISC-9: Анализ восстановления после ошибок — текущий vs auto-revert
- [x] ISC-10: Анализ масштабирования — PRD+Swarm vs один файл/scope
- [x] ISC-11: Определены домены применения каждого подхода (когда PAI, когда autoresearch)
- [x] ISC-12: Выводы по каждому аспекту обоснованы конкретными примерами

### Блок 2: Гибридная архитектура (16 критериев)
- [x] ISC-13: Определено место autoresearch loop в 7-фазном цикле PAI
- [x] ISC-14: Решение по Operating Mode (новый AUTORESEARCH vs расширение EXECUTE vs расширение Loop Mode)
- [x] ISC-15: Механизм ISC→скалярная метрика (как ISC критерии маппятся на autoresearch goal)
- [x] ISC-16: Self-Interrogation интеграция в IDEATE фазу autoresearch
- [x] ISC-17: PRD + Git Memory совмещение (как PRD хранит мета-данные autoresearch сессий)
- [x] ISC-18: Wisdom Frames + Results TSV интеграция (извлечение паттернов из экспериментов)
- [x] ISC-19: Effort Level → Iteration Budget маппинг
- [x] ISC-20: Constraint Extraction → Autoresearch Safety (стоп-лоссы, лимиты)
- [x] ISC-21: Verification Rehearsal → Verify Validation (проверка верификатора до запуска)
- [x] ISC-22: Cross-model review интеграция (из ARIS)
- [x] ISC-23: State persistence через context compaction (из ARIS)
- [x] ISC-24: Planning wizard адаптация (из uditgoenka)
- [x] ISC-25: When-stuck protocol для автономного режима
- [x] ISC-26: Stagnation detection и auto-stop
- [x] ISC-27: 3 уровня мета-применения заложены в архитектуру (но не детализированы)
- [x] ISC-28: Архитектура не ломает существующий Algorithm 3.5.0

### Блок 3: Дорожная карта (8 критериев)
- [x] ISC-29: Фаза 1 определена — что можно изменить прямо сейчас без ломки
- [x] ISC-30: Фаза 2 определена — что требует существенной доработки
- [x] ISC-31: Фаза 3 определена — что выносится в отдельный скилл
- [x] ISC-32: Порядок шагов определён с зависимостями
- [x] ISC-33: Каждый шаг оценён по сложности (часы/вечера)
- [x] ISC-34: Первый шаг можно начать в текущую сессию или следующую
- [x] ISC-35: Дорожная карта учитывает сезонность (6/1 с апреля)
- [x] ISC-36: Есть fallback план если гибридный подход окажется overcomplicated

### Блок 4: Качество документа (6 критериев)
- [x] ISC-37: Документ на русском языке (кроме технических терминов)
- [x] ISC-38: Каждый вывод обоснован — нет голословных утверждений
- [x] ISC-39: Clarity > Complexity — документ можно прочесть за 15 минут
- [x] ISC-40: Практическая ценность — Ivan может принять решения на основе документа
- [x] ISC-41: Философская часть — почему гибрид лучше каждого по отдельности
- [x] ISC-42: Анти-критерии: документ НЕ является поверхностным пересказом README

## Decisions
- Autoresearch = расширение EXECUTE фазы (Council consensus: 3/3 участника сошлись)
- ISC-Metric Mapping с [B]/[Q] тегами — минимальный overhead, максимальная польза
- Cross-model review deferred to v4.1 — полезно но не критично сейчас
- Дорожная карта: 4 фазы, Фаза 1 можно начать сразу
- Fallback: 3 уровня отката если overcomplicated

## Verification
- Блок 1 (12/12): Таблица 12 аспектов, 5 слабостей PAI, Loop Mode vs AR сравнение, все обоснованы
- Блок 2 (16/16): Все архитектурные вопросы отвечены, Cycle Selector + ISC-Metric Mapping + Layered Drift + Trust Levels
- Блок 3 (8/8): 4 фазы с зависимостями, оценками, сезонностью, fallback
- Блок 4 (6/6): Русский, обоснованный, читаемый, практичный, философский, оригинальный
- Capabilities: Research ✅, Council ✅, IterativeDepth ✅, ExtractWisdom ✅
