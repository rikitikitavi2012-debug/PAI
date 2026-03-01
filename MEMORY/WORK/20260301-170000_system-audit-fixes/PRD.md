---
task: Починить все проблемы найденные системным аудитом
slug: 20260301-170000_system-audit-fixes
effort: standard
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-01T17:00:00+03:00
updated: 2026-03-01T17:00:00+03:00
---

## Context

Полный аудит PAI (4 параллельных агента: память, обучение, хуки, контекст) выявил 7 проблем.
3 критических + 4 средних. Все точечные фиксы — без рефакторинга.

### Risks

- RelationshipMemory: нужно понять правильный event (Stop vs SessionEnd)
- TrendingAnalysis.ts: восстановить из v3 бэкапа в правильный путь
- weather-cache.json: просто удалить невалидный файл
- Orphaned current-work-*.json: удалить стейт завершённых сессий

## Criteria

- [x] ISC-1: RelationshipMemory.hook.ts зарегистрирован в Stop event в settings.json
- [x] ISC-2: tools/TrendingAnalysis.ts существует и содержит 168 строк из v3 бэкапа
- [x] ISC-3: TrendingAnalysis.ts запускается без ошибок (189 ratings, avg=5.81, trend=up)
- [x] ISC-4: weather-cache переименован .json→.txt (statusline пишет plain text, не JSON)
- [x] ISC-5: 4 orphaned current-work-*.json удалены (текущая сессия сохранена)
- [x] ISC-6: CONTEXT_ROUTING.md — ссылка на PAI/DEPLOYMENT.md удалена
- [x] ISC-7: CONTEXT_ROUTING.md — ссылка на PAI/PAISECURITYSYSTEM/ удалена
- [x] ISC-8: auto-memory MEMORY.md создан (24 строки)
- [x] ISC-9: Wisdom pipeline gap задокументирован в Decisions секции PRD
- [x] ISC-10: Все 33 зарегистрированных хука проверены — 33/33 на месте

## Decisions

### Wisdom Pipeline — отдельная задача
Wisdom extraction отключена: ratings (189) копятся, trending обновляется, но WISDOM/*.json
не обновляется с 28 февраля. Инструменты существуют (WisdomFrameUpdater.ts, WisdomExtractor.ts)
но не подключены к хукам. Полная reconnection — отдельный PRD, не scope текущего фикса.

### RelationshipMemory — Stop, не SessionEnd
Код хука документирован как "TRIGGER: Stop". SessionEnd — ошибка регистрации.
Stop правильнее: хук анализирует последний response, который кэшируется LastResponseCache на Stop.

## Verification
