---
task: Algorithm v3.6.0 — Phase 1 Autoresearch Integration
slug: 20260315-algorithm-v360-phase1
effort: extended
phase: complete
progress: 18/18
mode: algorithm
started: 2026-03-15T15:30:00
updated: 2026-03-15T15:30:00
---

## Context

Реализация Фазы 1 дорожной карты Algorithm Evolution. Создание v3.6.0.md с 4 хирургическими дополнениями к v3.5.0: ISC-Metric Mapping, experiments.tsv формат, усиленная LEARN фаза (Track 3 Synthesis), Verification Rehearsal (dry-run). Feature branch, атомарные коммиты, v3.5.0 остаётся как fallback.

Точки вставки в файле:
- ISC-Metric Mapping: после ISC Count Gate (строка ~171), перед CAPABILITY SELECTION (строка 173)
- experiments.tsv: новая подсекция после ISC Decomposition Methodology (после строки 112)
- LEARN Track 3: расширение LEARN фазы (строки 293-308)
- Dry-run: новый шаг в EXECUTE (строки 274-280)

### Risks
- Добавления раздувают файл → теряется читаемость (mitigation: каждое добавление < 20 строк)
- Новые инструкции конфликтуют с существующими (mitigation: additive, не заменяющие)
- CLAUDE.md ссылка не обновлена → загружается старая версия
- LATEST файл не обновлён → hooks/tools используют старую версию

## Criteria

### Git workflow (4 критерия)
- [x] ISC-1: Feature branch создана от master
- [x] ISC-2: v3.5.0.md не модифицирован (остаётся как fallback)
- [x] ISC-3: CLAUDE.md ссылается на v3.6.0.md
- [x] ISC-4: LATEST файл содержит v3.6.0

### ISC-Metric Mapping (4 критерия)
- [x] ISC-5: Инструкция по [B]/[Q] тегированию добавлена в OBSERVE фазу
- [x] ISC-6: Формат [Q] определения: Metric, Command, Baseline, Target, Direction
- [x] ISC-7: [B] критерии определены как regression gates для autoresearch
- [x] ISC-8: ISC-A (anti-criteria) определены как hard stops

### Experiments TSV (2 критерия)
- [x] ISC-9: 6-колоночный формат определён (iteration, commit, metric, delta, status, description)
- [x] ISC-10: Формат размещён как подсекция PRD format или Algorithm reference

### Enhanced LEARN (3 критерия)
- [x] ISC-11: Track 1 (Reflective) — существующие вопросы сохранены
- [x] ISC-12: Track 2 (Empirical) — experiments.tsv упоминается
- [x] ISC-13: Track 3 (Synthesis) — рефлексия над данными определена

### Verification Rehearsal (2 критерия)
- [x] ISC-14: Dry-run протокол добавлен (baseline + good change + bad change)
- [x] ISC-15: Условие активации: только при наличии [Q] критериев

### Качество (3 критерия)
- [x] ISC-16: Файл v3.6.0.md валидный markdown без синтаксических ошибок
- [x] ISC-17: Каждое добавление < 25 строк (Clarity > Complexity)
- [x] ISC-18: Версия в заголовке файла обновлена на 3.6.0

### Anti-criteria
- [x] ISC-A1: Существующие секции v3.5.0 НЕ удалены и НЕ переписаны
- [x] ISC-A2: Файл НЕ превышает 400 строк (v3.5.0 = 338, v3.6.0 = 394)

## Decisions
- ISC-Metric Mapping gated to Extended+ (RedTeam P1/P3: 80% задач Standard, не нужен overhead)
- `||` как разделитель полей вместо `|` (RedTeam U3: коллизия с shell pipes)
- Default to [B], require causal link for [Q] (RedTeam A1: предотвращение Goodhart's Law)
- experiments.tsv lifecycle: создаётся при первом [Q] эксперименте, persist с PRD
- Wisdom Frames threshold: 5+ экспериментов (RedTeam A5: не засорять n=2 паттернами)

## Verification
- v3.5.0.md: git diff = 0 строк (untouched) ✅
- v3.6.0.md: 394 строки (< 400 limit) ✅
- CLAUDE.md: ссылается на v3.6.0.md (строка 25) ✅
- LATEST: содержит v3.6.0 ✅
- Нет упоминаний v3.5.0 внутри v3.6.0.md ✅
- 7 коммитов на feature branch, каждый атомарный ✅
- RedTeaming: 2 CRITICAL + 6 MAJOR найдены и исправлены ✅
- Capability check: RedTeaming invoked via Skill tool ✅
