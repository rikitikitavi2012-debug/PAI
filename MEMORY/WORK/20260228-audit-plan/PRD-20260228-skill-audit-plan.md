---
prd: true
id: PRD-20260228-skill-audit-plan
status: PLANNED
mode: loop
effort_level: Extended
created: 2026-02-28
updated: 2026-02-28
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: PLAN
failing_criteria: []
verification_summary: "0/10"
parent: null
children: []
---

# Стратегический план аудита оставшихся скиллов PAI

> Систематический план аудита 21+ неаудированного скилла с приоритизацией по risk/impact, батчированием по зависимостям, и стратегией боевого тестирования.

## STATUS

| What | State |
|------|-------|
| Progress | 0/10 criteria |
| Phase | PLAN (только планирование) |
| Next action | Утверждение Ivan → последовательное выполнение батчей |
| Blocked by | nothing |

## CONTEXT

### Problem Space
За 10 коммитов аудита пофиксили 200+ багов в ~14 скиллах + ядро PAI. Остались 21+ скилл без аудита. Нужна стратегия: в каком порядке, как группировать, что проверять, как тестировать.

### Key Files
- `skills/skill-index.json` — маршрутизация всех скиллов
- `skills/skill-workflow-capabilities.json` — capability mapping
- Каждый `skills/{SkillName}/SKILL.md` — точка входа скилла

### Constraints
- Только планирование, не выполнение
- Паттерны из прошлых аудитов должны информировать чеклист
- Ivan делегирует аудиты 3-4 параллельным агентам

---

## 1. КАРТА ПОКРЫТИЯ АУДИТОМ

### Аудированные скиллы (14 скиллов + ядро)

| # | Скилл | Коммит | Багов | Статус |
|---|-------|--------|-------|--------|
| 1 | PAI (ядро, 7 подсистем) | 8e62477, 7f12897 | 18+3 | COMPLETE |
| 2 | Agents (персональности, шаблоны) | 209cdaa, d4c98e0, e9ff069, 8a7066d | 7+15+13 | COMPLETE |
| 3 | Research (10 контекстов агентов) | b73f783, 79f8f0d | 40+6 | COMPLETE |
| 4 | Telos | c882208 | 9 | COMPLETE |
| 5 | ExtractWisdom | 00f4c3a, b3a8281 | 3 | COMPLETE |
| 6 | Recon | 00f4c3a, b3a8281 | 4 | PARTIAL (dig не установлен) |
| 7 | Sales | 00f4c3a, b3a8281 | 4 | COMPLETE |
| 8 | PAIUpgrade | 00f4c3a, b3a8281 | 2 | COMPLETE |
| 9 | Parser | 00f4c3a | 5 | COMPLETE |
| 10 | PromptInjection | 00f4c3a | 3 | COMPLETE |
| 11 | WorldThreatModelHarness | 00f4c3a | 4 | COMPLETE |
| 12 | skill-index.json | 6542b94 | 48 | COMPLETE |
| 13 | skill-workflow-capabilities.json | 6542b94 | 29+15 | COMPLETE |
| 14 | CORE/ACTIONS | 6542b94 | 5 | COMPLETE |

**Итого пофиксили: ~230+ багов**

### НЕ аудированные скиллы (26 скиллов)

#### Группа 1 — Активно используемые (HIGH priority)
| # | Скилл | Файлов | Сложность | Зависимости | Предполагаемые проблемы |
|---|-------|--------|-----------|-------------|------------------------|
| 1 | **Fabric** | ~5 | HIGH (240 паттернов) | fabric CLI | placeholder'ы, сломанные паттерны |
| 2 | **Art** | ~10 | MEDIUM | API ключи, curl | phantom refs, локализация |
| 3 | **Browser** | ~8 | MEDIUM | Playwright | broken paths |
| 4 | **Council** | ~6 | MEDIUM | — | phantom refs |
| 5 | **RedTeam** | ~5 | MEDIUM | — | phantom refs |
| 6 | **FirstPrinciples** | ~4 | LOW | — | минимальные |
| 7 | **BeCreative** | ~3 | LOW | — | минимальные |
| 8 | **IterativeDepth** | ~4 | LOW | — | SLA→effort level терминология |

#### Группа 2 — Специализированные (MEDIUM priority)
| # | Скилл | Файлов | Сложность | Зависимости | Предполагаемые проблемы |
|---|-------|--------|-----------|-------------|------------------------|
| 9 | **Evals** | ~19 | HIGH | bun, TS tools | placeholder'ы в .ts, phantom refs |
| 10 | **Prompting** | ~24 | HIGH | bun, Handlebars | {UPPERCASE} placeholders (2 файла!) |
| 11 | **Science** | ~8 | MEDIUM | curl | phantom refs |
| 12 | **WriteStory** | ~12 | MEDIUM | curl | phantom refs |
| 13 | **OSINT** | ~7 | MEDIUM | curl, web APIs | phantom refs |
| 14 | **CreateSkill** | ~5 | MEDIUM | curl | cross-refs на устаревшие шаблоны |
| 15 | **CreateCLI** | ~6 | MEDIUM | bun | {UPPERCASE} placeholders (4 файла!) |

#### Группа 3 — Интеграции и утилиты (LOWER priority)
| # | Скилл | Файлов | Сложность | Зависимости | Предполагаемые проблемы |
|---|-------|--------|-----------|-------------|------------------------|
| 16 | **Documents** | ~30+ | HIGH | python, pip, PDF tools | python deps, {NAME} placeholders |
| 17 | **Remotion** | ~20+ | HIGH | npm/bun, remotion, ffmpeg | npm deps, outdated packages |
| 18 | **WebAssessment** | ~40+ | VERY HIGH | ffuf, nmap, python, pip | 57KB+ content, ext tool deps |
| 19 | **AnnualReports** | ~8 | MEDIUM | bun tools | MEDIUM risk |
| 20 | **USMetrics** | ~8 | MEDIUM | bun, FRED API | API key deps |
| 21 | **SECUpdates** | ~4 | LOW | curl | минимальные |
| 22 | **Apify** | ~5 | MEDIUM | Apify API | API keys |
| 23 | **BrightData** | ~4 | LOW | — | phantom refs (фиксили CONSTITUTION.md) |
| 24 | **Cloudflare** | ~5 | MEDIUM | wrangler CLI | CLI deps |
| 25 | **PrivateInvestigator** | ~8 | MEDIUM | pip (holehe, sherlock) | python deps |
| 26 | **Aphorisms** | ~6 | LOW | fabric -y reference | fabric dep |

---

## 2. ПАТТЕРНЫ БАГОВ ИЗ ПРОШЛЫХ АУДИТОВ

### Типология (по частоте, от самых частых)

| # | Категория бага | Частота | Пример | Как искать |
|---|---------------|---------|--------|------------|
| 1 | **Phantom refs** — ссылки на несуществующие файлы/workflow | ~80 | `CoreStack.md`, `CONSTITUTION.md`, `PerplexityResearch.md` | `grep -r "CoreStack\|CONSTITUTION\|REDESIGN" skills/` |
| 2 | **Placeholder'ы** — нерезолвленные шаблонные переменные | ~50 | `{PRINCIPAL.NAME}`, `{ASSISTANT_NAME}`, `YOUR_VOICE_ID_HERE` | `grep -rP '\{[A-Z_]+[.][A-Z_]+\}' skills/` |
| 3 | **Broken paths** — неверный регистр, устаревшие пути | ~25 | `report-template/` vs `ReportTemplate/`, `commands/` vs `Tools/` | `grep -r "commands/\|context/" skills/` |
| 4 | **Нелокализованные строки** — английский вместо русского | ~20 | Voice messages, agent greetings | `grep -r "I'll\|I will\|Let me" skills/` |
| 5 | **Orphaned agents/workflows** — мёртвый код без вызовов | ~10 | CodexResearcher agent | manual review |
| 6 | **Stale terminology** — устаревшие термины (SLA→effort level) | ~8 | `SLA` вместо `effort_level` в документации | `grep -ri "SLA" skills/` |
| 7 | **Generator bugs** — ошибки в скриптах генерации | ~4 | curl leak в GenerateCapabilityIndex.ts | review generator scripts |
| 8 | **Missing voice notifications** — отсутствие обязательных curl'ов | ~5 | Skills без voice notification блока | `grep -rL "localhost:8888" skills/*/SKILL.md` |
| 9 | **Cross-skill broken deps** — ссылки между скиллами на несуществующее | ~5 | WebAssessment → Recon Tools | cross-reference audit |

---

## 3. УНИФИЦИРОВАННЫЙ ЧЕКЛИСТ АУДИТА

Для КАЖДОГО скилла проверять:

```
□ CH-1: PHANTOM REFS — grep -rP 'CoreStack|CONSTITUTION|REDESIGN|PerplexityResearch' skills/{NAME}/
□ CH-2: PLACEHOLDERS — grep -rP '\{[A-Z_]+\}' skills/{NAME}/ (исключая шаблоны Handlebars)
□ CH-3: BROKEN PATHS — проверить все пути в SKILL.md и Workflows/ на существование
□ CH-4: LOCALIZATION — grep -r "I'll\|I will\|Let me\|the user\|the principal" skills/{NAME}/
□ CH-5: VOICE CURL — SKILL.md содержит обязательный voice notification блок
□ CH-6: STALE TERMS — grep -ri "SLA\b" skills/{NAME}/ (должно быть effort_level)
□ CH-7: ORPHANED FILES — все файлы в директории имеют ссылки из SKILL.md или Workflows
□ CH-8: EXTERNAL DEPS — внешние зависимости (dig, fabric, pip, npm) доступны или задокументированы
□ CH-9: WORKFLOW REFS — все Workflows/ упомянутые в SKILL.md существуют и наоборот
□ CH-10: CROSS-SKILL REFS — ссылки на другие скиллы указывают на существующие файлы
□ CH-11: SKILL-INDEX SYNC — скилл корректно описан в skill-index.json
```

---

## 4. СТРАТЕГИЯ БАТЧИРОВАНИЯ

### Батч 1: Лёгкие активные (4 скилла, ~15 мин)
**Effort: Standard | Агенты: 2 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| FirstPrinciples | Agent-1 | Простой, мало файлов, нет ext deps |
| BeCreative | Agent-1 | Простой, мало файлов, нет ext deps |
| IterativeDepth | Agent-2 | Простой, может быть SLA→effort_level |
| Council | Agent-2 | Средний, нет ext deps |

**Тест-сценарии:**
- FirstPrinciples: `"Примени first principles к проблеме масштабирования PAI"`
- BeCreative: `"Используй be creative для генерации идей автоматизации"`
- IterativeDepth: `"Примени iterative depth к задаче оптимизации хуков"`
- Council: `"Запусти council debate о выборе между Redis и SQLite для кэша"`

---

### Батч 2: Средние активные (4 скилла, ~25 мин)
**Effort: Extended | Агенты: 4 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| RedTeam | Agent-1 | Средний, 32 агента — нужна проверка конфигов |
| Art | Agent-2 | Средний, API зависимости |
| Browser | Agent-3 | Средний, Playwright зависимость |
| Fabric | Agent-4 | КРУПНЫЙ — 240 паттернов, fabric CLI |

**Тест-сценарии:**
- RedTeam: `"Red team идею: PAI хранит все данные в plain text файлах"`
- Art: `"Создай диаграмму архитектуры PAI skill system"`
- Browser: `"Сделай скриншот https://example.com и проверь заголовок"`
- Fabric: `"Используй fabric pattern extract_wisdom на тексте: [короткий текст]"`

---

### Батч 3: Специализированные-1 (4 скилла, ~25 мин)
**Effort: Extended | Агенты: 4 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| Evals | Agent-1 | Сложный — 19 файлов, TS tools |
| Prompting | Agent-2 | Сложный — 24 файла, ИЗВЕСТНЫЕ placeholder'ы |
| CreateCLI | Agent-3 | ИЗВЕСТНЫЕ placeholder'ы (4 файла!) |
| CreateSkill | Agent-4 | Cross-refs на шаблоны |

**Тест-сценарии:**
- Evals: `"Создай eval для проверки что PAI отвечает на русском"`
- Prompting: `"Сгенерируй промпт для агента-исследователя"`
- CreateCLI: `"Создай CLI для управления PAI скиллами"`
- CreateSkill: `"Создай скилл для мониторинга цен криптовалют"`

---

### Батч 4: Специализированные-2 (3 скилла, ~20 мин)
**Effort: Standard | Агенты: 3 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| Science | Agent-1 | Средний, 8 файлов |
| WriteStory | Agent-2 | Средний, 12 файлов |
| OSINT | Agent-3 | Средний, web API зависимости |

**Тест-сценарии:**
- Science: `"Используй scientific method для гипотезы: ежедневные ревью повышают качество кода"`
- WriteStory: `"Создай story bible для короткого рассказа в жанре sci-fi"`
- OSINT: `"Проведи OSINT на компанию Anthropic"`

---

### Батч 5: Тяжёлые интеграции (3 скилла, ~40 мин)
**Effort: Extended | Агенты: 3 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| WebAssessment | Agent-1 | САМЫЙ БОЛЬШОЙ — 40+ файлов, ffuf/nmap/python |
| Documents | Agent-2 | 30+ файлов, python/pip зависимости |
| Remotion | Agent-3 | 20+ файлов, npm/remotion/ffmpeg |

**Тест-сценарии:**
- WebAssessment: Только аудит кода (боевой тест требует таргет)
- Documents: `"Обработай PDF файл ~/.claude/skills/PAI/SKILL.md"` (md→md, проверка пайплайна)
- Remotion: Только аудит кода (требует npm install)

---

### Батч 6: Лёгкие интеграции (8 скиллов, ~30 мин)
**Effort: Standard | Агенты: 4 параллельных**

| Скилл | Агент | Почему тут |
|-------|-------|-----------|
| AnnualReports | Agent-1 | Средний, bun tools |
| USMetrics | Agent-1 | Средний, FRED API |
| SECUpdates | Agent-2 | Простой |
| Apify | Agent-2 | API зависимости |
| BrightData | Agent-3 | Простой, уже частично фиксили |
| Cloudflare | Agent-3 | wrangler CLI |
| PrivateInvestigator | Agent-4 | pip deps (holehe, sherlock) |
| Aphorisms | Agent-4 | fabric dep |

**Тест-сценарии:**
- AnnualReports: `"bun run ListSources.ts"` (проверка работы инструмента)
- USMetrics: `"Покажи текущие экономические метрики США"` (если FRED API key есть)
- SECUpdates: `"Покажи последние новости безопасности"`
- Apify: Только аудит (требует API key)
- BrightData: Только аудит (требует API key)
- Cloudflare: Только аудит (требует wrangler auth)
- PrivateInvestigator: Только аудит (этические ограничения)
- Aphorisms: `"Найди афоризм о стратегии"`

---

## 5. ИЗВЕСТНЫЕ ПРОБЛЕМЫ ЗАВИСИМОСТЕЙ

| Зависимость | Скиллы | Проблема | Решение |
|-------------|--------|----------|---------|
| `dig` (DNS) | Recon | Не установлен | `sudo apt install dnsutils` |
| `fabric` CLI | Fabric, Aphorisms | Может не быть в PATH | `which fabric` → установить если нет |
| `ffuf` | WebAssessment | Может не быть установлен | `go install github.com/ffuf/ffuf/v2@latest` |
| `nmap` | WebAssessment | Может не быть установлен | `sudo apt install nmap` |
| `holehe` | PrivateInvestigator | Python pip package | `pip install holehe` |
| `sherlock` | PrivateInvestigator | Python pip package | `pip install sherlock-project` |
| `wrangler` | Cloudflare | Cloudflare CLI | `npm install -g wrangler` |
| `remotion` | Remotion | npm package + ffmpeg | `npm install` в проекте |
| `pytesseract` | Documents (PDF) | Python + system dep | `pip install pytesseract && apt install tesseract-ocr` |
| FRED API key | USMetrics | Нужен ключ | Проверить `.env` или `settings.json` |
| Apify API key | Apify | Нужен ключ | Проверить конфигурацию |

---

## 6. РЕКОМЕНДУЕМЫЙ ПОРЯДОК ВЫПОЛНЕНИЯ

```
Батч 1 (лёгкие) → Батч 2 (средние активные) → Батч 3 (спец-1) → Батч 4 (спец-2) → Батч 6 (лёгкие интеграции) → Батч 5 (тяжёлые)
```

**Обоснование:**
- Батч 1 первым: быстрая победа, прогрев чеклиста, проверка процесса
- Батч 5 последним: самый тяжёлый, требует ext deps, может занять отдельную сессию
- Батч 6 перед Батч 5: лёгкие интеграции разогреют для тяжёлых

**Оценка трудоёмкости:**
| Батч | Effort | Время | Агенты | Скиллов |
|------|--------|-------|--------|---------|
| 1 | Standard | ~15 мин | 2 | 4 |
| 2 | Extended | ~25 мин | 4 | 4 |
| 3 | Extended | ~25 мин | 4 | 4 |
| 4 | Standard | ~20 мин | 3 | 3 |
| 6 | Standard | ~30 мин | 4 | 8 |
| 5 | Extended | ~40 мин | 3 | 3 |
| **TOTAL** | — | **~155 мин** | — | **26** |

Это 3-4 сессии по ~45 мин каждая.

---

## 7. ДОП. СКИЛЛЫ (не в списке Ivan, но тоже не аудированы)

| Скилл | Тип | Примечание |
|-------|-----|-----------|
| `supabase-postgres-best-practices` | .md-only integration | Внешний, minimal risk |
| `vercel-composition-patterns` | .md-only integration | Внешний, minimal risk |
| `vercel-react-best-practices` | .md-only integration | Внешний, minimal risk |
| `web-design-guidelines` | .md-only integration | Внешний, minimal risk |
| `claude-developer-platform` | .md-only integration | Внешний, minimal risk |

Эти 5 — read-only .md файлы от внешних авторов. Аудит не нужен (нет workflows, нет tools, нет dependencies). Просто проверить что они корректно в skill-index.json.

## 8. COMMIT STRATEGY (контрольные точки + upstream PR)

### Промежуточные коммиты

Коммит после КАЖДОГО завершённого батча для сохранения прогресса:

```
Батч 1 → git commit: "fix: audit Batch 1 — CreateSkill, CreateCLI, Aphorisms, Documents (N bugs fixed)"
Батч 2 → git commit: "fix: audit Batch 2 — IterativeDepth, BeCreative, FirstPrinciples, Council (N bugs fixed)"
Батч 3 → git commit: "fix: audit Batch 3 — RedTeam, Art, Browser, Prompting (N bugs fixed)"
Батч 4 → git commit: "fix: audit Batch 4 — Science, WriteStory, OSINT (N bugs fixed)"
Батч 6 → git commit: "fix: audit Batch 6 — integrations (N bugs fixed)"
Батч 5 → git commit: "fix: audit Batch 5 — Fabric, Evals, WebAssessment (N bugs fixed)"
```

**Формат коммита:**
```
fix: audit Batch N — SkillA, SkillB, SkillC (X bugs fixed)

Checklist: CH-1 through CH-11 applied
Skills audited: [list]
Bugs found: X | Fixed: Y | Deferred: Z
Details: [1-line per fix]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Финальный коммит

После прохождения всех 6 батчей:
```
fix: complete PAI skill audit — 26 skills, N total bugs fixed

Full audit of remaining PAI skills using standardized 11-point checklist.
See PRD-20260228-skill-audit-plan.md for details.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Upstream PR стратегия

После завершения полного аудита — PR в `danielmiessler/PAI`:

**Ветка:** `fix/skill-audit-full`
**PR title:** `fix: comprehensive skill audit — N bugs fixed across 26 skills`

**PR body template:**
```markdown
## Summary
- Systematic audit of all PAI skills using standardized 11-point checklist
- Derived checklist from patterns in 230+ bugs found across previous 10 audit commits
- N total bugs fixed across 26 skills in 6 prioritized batches

## Bug Categories Fixed
- Phantom references to non-existent files/skills
- Unresolved placeholders (`${VAR}`, `{TEMPLATE}`)
- Broken cross-skill imports and paths
- Missing referenced files (workflows, tools)
- Stale terminology (SLA→effort_level, etc.)
- Case-sensitive path mismatches
- Missing error handling in CLI tools
- Outdated API references
- Dead code and unreachable branches

## Test Plan
- [x] Each skill's SKILL.md verified against actual file structure
- [x] All internal cross-references validated
- [x] CLI tools executed with --help to verify no runtime errors
- [x] Workflow files parsed for broken references
- [x] No regressions in previously audited skills

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## DECISIONS

- Порядок батчей: лёгкие → средние → тяжёлые (прогрессивный)
- Чеклист 11 пунктов — стандартизирован из паттернов прошлых аудитов
- Боевые тесты только для скиллов без внешних API зависимостей
- .md-only интеграции исключены из полного аудита
- Промежуточные коммиты после каждого батча для сохранения прогресса
- Upstream PR после завершения полного аудита

- Порядок батчей: лёгкие → средние → тяжёлые (прогрессивный)
- Чеклист 11 пунктов — стандартизирован из паттернов прошлых аудитов
- Боевые тесты только для скиллов без внешних API зависимостей
- .md-only интеграции исключены из полного аудита

## LOG

### Iteration 0 — 2026-02-28
- Phase: PLAN (планирование только, исполнение в следующих сессиях)
- Work done: Полная инвентаризация 45 скиллов, типология 9 категорий багов, 11-пунктовый чеклист, батчирование 6 групп, тест-сценарии, commit strategy
- Context: 3 агента сканировали структуру всех скиллов параллельно, нашли 11 багов ещё до формального аудита
- 11 pre-audit bugs discovered: Fabric missing UpdatePatterns.md, Evals phantom ref THEALGORITHM + missing EvalServer/, Prompting 2x placeholder, IterativeDepth 10x SLA, WebAssessment 3x Recon phantom refs, OSINT phantom ref, AnnualReports missing Workflows/, BrightData path case mismatch
- Режим: PRD готов к loop mode execution
- Commit strategy: промежуточные коммиты после каждого батча + upstream PR в конце
- Next: запустить сессию с промптом ниже
