## Reflections
- Тесты ContentAnalysis/Investigation ломались потому что мы убрали version/triggers при канонизации в предыдущей задаче — нужно ВСЕГДА проверять тесты после изменения YAML schema
- Hook error для settings.json — двойная проверка (SecurityValidator confirmWrite + Claude Code native ask). Lesson: не дублировать проверки на разных уровнях
- THEHOOKSYSTEM.md отставал на 2.35x от реальности (20 vs 47). Нужен автоматический audit documentation drift

## Patterns
- **Schema change → test update:** При удалении поля из YAML, grep тесты на это поле и обновить
- **Double-confirm anti-pattern:** Если Claude Code `ask` list уже проверяет файл, не добавлять его в hook confirmWrite
- **Documentation drift:** Документация хуков устаревает быстро. Нужен CI check: count hooks in settings.json vs documented count

## Actions
- Fixed 3 test failures (ContentAnalysis, Investigation version field; parser uuid dep)
- Removed settings.json from confirmWrite (eliminates double-ask hook error)
- THEHOOKSYSTEM.md updated: 7 → 15 event types, 20 → 34/50 hook count
- Remaining 18 test failures are pre-existing (5 HealthMonitor mock + 13 Apify API timeout)
