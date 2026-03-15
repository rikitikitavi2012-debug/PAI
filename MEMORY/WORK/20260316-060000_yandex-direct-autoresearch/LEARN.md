## Reflections
- PAI v4.0-alpha уже содержит Autoresearch — внешний ресёрч сравнивал с v3.5.0, мы на шаг впереди
- Research skill (параллельные агенты) дал 289 строк качественного отчёта за 2 минуты — стоит использовать чаще
- Главная адаптация ML→реклама: цикл 24h (не 5 min), stagnation 3 (не 5), amplitude ±20%, Guard = бюджет

## Patterns
- Karpathy Autoresearch ≈ PAI Autoresearch sub-loop: 90% совпадение, PAI превосходит по tiered gates, multiple [Q], learning loop
- Реклама = "дорогой autoresearch": каждый discard стоит реальных денег → нужны стоп-лоссы которых нет в ML
- direct-mcp vs свой код: для 1 сайта свой skill достаточен, MCP нужен для масштаба (10+ клиентов)
- CPA через API полностью доступен — нет технических блокеров, только OAuth токен

## Actions
- REPORT.md: 263 строки аналитического отчёта с 5 частями
- PRD.md: 48 ISC критериев по 5 фазам + 4 anti-criteria
- Blocker: YANDEX_DIRECT_TOKEN — следующий шаг
- Research report сохранён: MEMORY/RESEARCH/2026-03/
