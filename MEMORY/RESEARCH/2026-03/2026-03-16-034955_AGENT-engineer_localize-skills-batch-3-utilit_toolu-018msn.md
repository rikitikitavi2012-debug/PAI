# Localize skills batch 3: Utilities, Investigation + system

**Agent:** Engineer
**Captured:** 2026-03-16T03:49:55+03:00
**Tool Use ID:** toolu_018mSNnPRVHoQJ3iRzAA7zin
**Tokens:** 28928
**Duration:** 39s
**Source:** PostToolUse hook capture

---

Both files verified. Here is the verification checklist:

**Utilities** (`/home/ser/.claude/skills/Utilities/SKILL.md`):
1. Russian triggers in USE WHEN -- present (line 3, end): `создай CLI, утилита, создай скилл, делегирование, обновление системы, оценка, документ, PDF, парсинг, аудио, браузер, скриншот, афоризм, цитата, fabric паттерн, Cloudflare`
2. All English triggers -- preserved (entire original list intact)
3. Voice section -- present (lines 6-21) with Russian message `"Запускаю WORKFLOWNAME в скилле Utilities"`
4. Description -- single YAML line (no `|` or `>`)

**Investigation** (`/home/ser/.claude/skills/Investigation/SKILL.md`):
1. Russian triggers in USE WHEN -- present (line 3, end): `расследование, проверка компании, дью дилидженс, фоновая проверка, найди человека, поиск людей, публичные записи, обратный поиск, поиск в соцсетях, проверка личности, разведка угроз`
2. All English triggers -- preserved (OSINT through threat intel)
3. Voice section -- present (lines 7-22) with Russian message `"Запускаю WORKFLOWNAME в скилле Investigation"`
4. Old `triggers:` YAML array -- removed (no more `version: 1.0.0`, no `triggers:` block)
5. Description -- single YAML line
6. `context: fork` -- preserved (line 4)