---
task: Reconnect Wisdom pipeline — ratings to wisdom extraction
slug: 20260301-180000_wisdom-pipeline-reconnect
effort: extended
phase: complete
progress: 18/18
mode: algorithm
started: 2026-03-01T18:00:00+03:00
updated: 2026-03-01T18:00:00+03:00
---

## Context

### Проблема
Wisdom extraction отключена с 28 февраля. Рейтинги копятся (189), trending обновляется,
но WISDOM/*.json не обновляются. Причина: ни один хук не вызывает Wisdom инструменты.

### Текущая архитектура

Работает:
```
UserPrompt → RatingCapture → ratings.jsonl → TrendingAnalysis → trending.json
                           → low-rating learning (≤4) → LEARNING/SYSTEM|ALGORITHM/
```

Не работает:
```
ratings.jsonl → (???) → WISDOM/*.json    ← РАЗРЫВ
WISDOM/FRAMES/ → (не существует)         ← FRAMES не созданы
```

### Инструменты (все существуют, но не подключены)

1. `WisdomFrameUpdater.ts` — пишет в WISDOM/FRAMES/*.md
2. `WisdomDomainClassifier.ts` — классифицирует prompt → домен
3. `LearningPatternSynthesis.ts` — синтез из ratings → SYNTHESIS/
4. `WisdomCrossFrameSynthesizer.ts` — кросс-фреймовый анализ

### Два формата WISDOM

- `WISDOM/*.json` — плоские JSON (22+ observations, используются learning-readback)
- `WISDOM/FRAMES/*.md` — markdown фреймы (WisdomFrameUpdater ожидает, не существуют)

LoadContext через learning-readback.ts ожидает FRAMES/*.md для инъекции принципов в контекст.

### Решение

Создать WisdomSync хук (SessionEnd), который:
1. Читает последние рейтинги из ratings.jsonl
2. Если есть низкий рейтинг (≤4) с sentiment — обновляет WISDOM JSON как anti-pattern
3. Если есть высокий рейтинг (≥8) с sentiment — обновляет WISDOM JSON как confirmed pattern
4. Периодически (раз в 5 сессий) запускает LearningPatternSynthesis
5. Создаёт начальные FRAMES из существующих JSON

### Risks

- Не перегружать SessionEnd (уже 5 хуков)
- WisdomFrameUpdater ожидает FRAMES/*.md, learning-readback тоже — нужно создать FRAMES
- Не дублировать observations — нужна dedupe по тексту

## Criteria

- [x] ISC-1: WISDOM/FRAMES/ директория существует
- [x] ISC-2: FRAMES/communication.md создан из communication.json (6 obs)
- [x] ISC-3: FRAMES/development.md создан из development.json (20 obs)
- [x] ISC-4: FRAMES/workflow.md создан из workflow.json (36 obs)
- [x] ISC-5: FRAMES/system.md создан из system.json (14 obs)
- [x] ISC-6: FRAMES/learning.md создан из learning.json (4 obs)
- [x] ISC-7: WisdomSync.hook.ts создан (249 строк) и зарегистрирован в SessionEnd
- [x] ISC-8: WisdomSync читает ratings.jsonl, фильтрует по 2h window
- [x] ISC-9: WisdomSync обновляет JSON на низких рейтингах — 13 anti-patterns добавлены
- [x] ISC-10: WisdomSync обновляет JSON на высоких рейтингах — 10 principles добавлены
- [x] ISC-11: WisdomSync запускает LearningPatternSynthesis каждые 5 сессий
- [x] ISC-12: WisdomSync обновляет FRAMES (updateFrame function inline)
- [x] ISC-13: learning-readback находит 8 CRYSTAL principles в FRAMES
- [x] ISC-14: Dedupe через wordOverlap (>0.8 = duplicate, >0.6 = confirm existing)
- [x] ISC-15: Graceful failure verified — exit(0) on empty/malformed input
- [x] ISC-16: settings.json содержит WisdomSync между WorkCompletion и SessionCleanup
- [x] ISC-17: End-to-end test: 23 updates from 13 low + 10 high ratings
- [x] ISC-18: Все 5 WISDOM/*.json timestamps обновлены на Mar 1

## Decisions

## Verification
