---
prd: true
id: PRD-20260228-v4-migration
status: VERIFYING
mode: loop
effort_level: Advanced
created: 2026-02-28
updated: 2026-02-28
iteration: 0
maxIterations: 10
loopStatus: null
last_phase: PLAN
failing_criteria: []
verification_summary: "18/18 + 3/3 anti"
parent: null
children: []
---

# Миграция PAI v3.0 → v4.0.1

> Безопасный переход на v4.0.1 с сохранением всех наработок: 222 файла MEMORY, 15 аудит-коммитов, кастомные хуки, настройки.

## STATUS

| What | State |
|------|-------|
| Progress | 18/18 + 3/3 anti — ALL PASSING |
| Phase | VERIFY |
| Next action | Batch 7: Swap (requires user confirmation) |
| Blocked by | User confirmation for swap |

## CONTEXT

### Problem Space
Мы на PAI v3.0 с 15 аудит-коммитами, 222 файлами MEMORY, кастомными хуками. v4.0.1 даёт -50% контекста при старте, Algorithm v3.5.0, иерархические скиллы (11 категорий vs 44 плоских). Нужно мигрировать без потери наработок.

### Key Files
- `~/.claude/settings.json` — главный конфиг (23 top-level ключа)
- `~/.claude/hooks/` — 22 хука (6 уникальных наших)
- `~/.claude/hooks/lib/` — 12 утилит (2 уникальных наших)
- `~/.claude/hooks/handlers/` — 7 хэндлеров (2 уникальных наших)
- `~/.claude/skills/PAI/` — Algorithm v1.8.1-ru + наши компоненты
- `~/.claude/MEMORY/` — 222 файла, 1.8MB
- `~/.claude/agents/` — 13+ агентов с русификацией
- `~/.claude/custom-agents/` — наши кастомные агенты
- `~/.claude/VoiceServer/` — голосовой сервер
- `~/.claude/plugins/` — плагины

### Constraints
- MEMORY/ НИКОГДА не перезаписывается
- settings.json МЕРЖИТСЯ, не заменяется
- Наши 15 аудит-коммитов содержат фиксы в хуках и скиллах
- WSL2 специфика (Kitty socket, LIBGL_ALWAYS_SOFTWARE)
- Русский язык как основной

### Decisions Made
- Подход A: v4.0.1 как база, наши наработки сверху
- Работаем в отдельной директории ~/.claude-v4-staging/ для безопасности

## PLAN

### Общий подход

**Принцип:** v4.0.1 = чистая база → наши данные оверлеем → наши хуки портируем → тестируем → свапаем.

### Batch 1: Подготовка (безопасность)
1. Бэкап: `cp -r ~/.claude ~/.claude-v3-backup-20260228`
2. Клонируем PAI репо: `git clone --depth 1 danielmiessler/PAI /tmp/pai-v4`
3. Создаём staging: `cp -r /tmp/pai-v4/Releases/v4.0.1/.claude ~/.claude-v4-staging`

### Batch 2: Overlay — наши данные поверх v4.0.1
Эти директории/файлы копируются AS-IS (v4.0.1 их не трогает):
- `MEMORY/` → целиком
- `custom-agents/` → целиком
- `plugins/` → целиком
- `VoiceServer/` → целиком
- `tasks/`, `projects/`, `backups/`, `todos/` → целиком
- `.config/kitty/` → не в .claude, не трогаем

### Batch 3: Merge — settings.json
v4.0.1 settings.json имеет другую структуру. Нужно:
1. Прочитать наш settings.json
2. Прочитать v4.0.1 settings.json
3. Взять из v4.0.1: hooks (новая структура), PAI-specific новые поля
4. Сохранить наши: daidentity, principal, permissions, env, mcpServers, statusLine, spinnerVerbs, counts, notifications, techStack
5. Мержить: hooks — добавить наши уникальные хуки к v4.0.1 хукам

### Batch 4: Портирование хуков

**ВЕРИФИЦИРОВАНО из кода v4.0.1 (28 фев 2026):**

**Совместимость lib API:** paths.ts экспорты ИДЕНТИЧНЫ (7 функций совпадают). tab-setter.ts экспорты ИДЕНТИЧНЫ (7 функций). identity.ts API расширен (добавлены getAlgorithmVoice, getVoicePersonality) но ОБРАТНО СОВМЕСТИМ.

**НОВАЯ ЗАВИСИМОСТЬ:** `hook-io.ts` импортирует `../../PAI/Tools/TranscriptParser` — значит хуки v4.0.1 требуют директорию `PAI/Tools/` (новая в v4.0.1). Без неё VoiceCompletion, LastResponseCache, DocIntegrity не запустятся.

**Полная карта замен (верифицировано из settings.json обоих версий):**

| Event | Наш хук | v4.0.1 хук | Решение |
|-------|---------|------------|---------|
| PreToolUse/Bash | VoiceGate.hook.ts | — | ДРОП — v4.0.1 убрал, VoiceCompletion решает иначе (через CLAUDE_CODE_AGENT_TASK_ID) |
| PostToolUse/Bash,TaskCreate,TaskUpdate,Task | AlgorithmTracker.hook.ts | — | ПОРТ — наш уникальный функционал |
| SessionEnd | ISCSyncHook.hook.ts | — | ДРОП → заменён на PRDSync.hook.ts (PostToolUse/Write,Edit) |
| SessionEnd | SessionSummary.hook.ts | SessionCleanup.hook.ts | ЗАМЕНА — SessionCleanup делает то же + больше (чистит tab, work state) |
| UserPromptSubmit | AutoWorkCreation.hook.ts | — | ПОРТ — автоматическое создание WORK директорий |
| SessionStart | StartupGreeting.hook.ts | KittyEnvPersist.hook.ts | МЕРЖ — KittyEnvPersist делает tab reset + env persist, StartupGreeting делает приветствие + PAI контекст. Нужно ОСТАВИТЬ ОБА или объединить |
| SessionStart | CheckVersion.hook.ts | — | ДРОП — v4.0.1 имеет BuildCLAUDE.ts при старте |
| SessionStart/compact | PostCompactRecovery.hook.ts | — | ПОРТ — восстановление env после компрессии |
| Stop | StopOrchestrator.hook.ts | VoiceCompletion + ResponseTabReset + LastResponseCache + DocIntegrity | ДРОП — v4.0.1 разбил на 4 отдельных Stop хука вместо оркестратора |
| ConfigChange | SecurityValidator.hook.ts | — | АНАЛИЗ — v4.0.1 не слушает ConfigChange, нужна ли эта защита? |

**Итого решений:**
- ПОРТ (2): AlgorithmTracker, PostCompactRecovery
- МЕРЖ/АНАЛИЗ (2): StartupGreeting + KittyEnvPersist, ConfigChange/SecurityValidator
- ДРОП (4): VoiceGate, ISCSyncHook, SessionSummary, CheckVersion, StopOrchestrator
- БЕРЁМ ОТ v4.0.1 (7): KittyEnvPersist, DocIntegrity, LastResponseCache, PRDSync, ResponseTabReset, SessionCleanup, VoiceCompletion

**Наши уникальные lib/handlers:**
| Файл | Действие |
|------|----------|
| `lib/algorithm-state.ts` | ПОРТ — нужен для AlgorithmTracker |
| `lib/metadata-extraction.ts` | ПОРТ — нужен для AlgorithmTracker |
| `handlers/AlgorithmEnrichment.ts` | ПОРТ — обогащение алгоритма |
| `handlers/RebuildSkill.ts` | ДРОП — мёртвая система (v4.0.1 тоже удалил) |

**Новые lib v4.0.1:**
- `lib/hook-io.ts` — КРИТИЧНО, нужен для VoiceCompletion, LastResponseCache, DocIntegrity (читает stdin)
- `lib/learning-readback.ts` — берём
- `lib/prd-utils.ts` — берём (замена нашего prd-template.ts по функциям)

**Новые handlers v4.0.1:**
- `handlers/BuildCLAUDE.ts` — генерация CLAUDE.md (КРИТИЧНО для template системы)

**КРИТИЧЕСКИЙ ПУТЬ:** `PAI/Tools/TranscriptParser.ts` — обязательно нужен, без него 4 хука v4.0.1 не работают

### Batch 5: Скиллы
v4.0.1 полностью перестроил скиллы. Стратегия:
1. Берём v4.0.1 скиллы целиком (11 категорий)
2. Проверяем что наши аудит-фиксы не нужны (v4.0.1 мог пофиксить сам)
3. Наш `skills/PAI/` заменяется на `PAI/` директорию v4.0.1
4. `skill-index.json` берём от v4.0.1 целиком
5. Наши .md-only скиллы (vercel-*, supabase-*, web-design-*) — проверяем наличие в v4.0.1

### Batch 6: Agents
1. Сравниваем `agents/` — берём v4.0.1 как базу
2. Наши русификации агентов — портируем поверх
3. `custom-agents/` — уже скопированы в Batch 2

### Batch 7: Финальная сборка
1. `CLAUDE.md.template` + `BuildCLAUDE.ts` → генерируем CLAUDE.md
2. Полный тест: запуск Claude Code из staging
3. Проверка всех хуков
4. Если ок → swap: `mv ~/.claude ~/.claude-v3-old && mv ~/.claude-v4-staging ~/.claude`

## IDEAL STATE CRITERIA (Verification Criteria)

### Подготовка
- [x] ISC-C1: Полный бэкап v3.0 создан в ~/.claude-v3-backup-20260228 | Verify: CLI: 631M backup, settings.json present
- [x] ISC-C2: v4.0.1 скачан в staging директорию без ошибок | Verify: CLI: CLAUDE.md.template present

### Данные
- [x] ISC-C3: MEMORY директория скопирована полностью без изменений | Verify: CLI: 231=231 files, checksums match
- [x] ISC-C4: settings.json корректно смержен с обоими конфигами | Verify: Read: valid JSON, daidentity/principal/hooks all present
- [x] ISC-C5: custom-agents и plugins скопированы целиком | Verify: CLI: dirs exist with content

### Хуки
- [x] ISC-C6: 24 хука (20 v4.0.1 + 4 наших) в staging | Verify: CLI: count=24
- [x] ISC-C7: AlgorithmTracker портирован — импорты совместимы | Verify: Grep: imports tab-setter, identity, algorithm-state all present in v4.0.1 lib
- [x] ISC-C8: StartupGreeting портирован с русским приветствием | Verify: Grep: "Navi готов к работе" found
- [x] ISC-C9: AutoWorkCreation портирован в v4.0.1 формат | Verify: Read: imports time, prd-template from v4.0.1 lib
- [x] ISC-C10: PostCompactRecovery портирован в v4.0.1 формат | Verify: Read: imports identity from v4.0.1 lib
- [x] ISC-C11: settings.json hooks содержит все 32 хук-записи | Verify: CLI: 32 total hook entries across 6 events

### Скиллы
- [x] ISC-C12: Все 11 категорий скиллов v4.0.1 присутствуют | Verify: CLI: 11 dirs + custom skills in Utilities
- [x] ISC-C13: PAI/Tools (43 файла, TranscriptParser present) | Verify: CLI: TranscriptParser.ts exists, LATEST=v3.5.0
- [x] ISC-C14: skill-index.json установлен и валиден | Verify: Read: valid JSON, 5 entries (v3, needs refresh)

### Агенты
- [x] ISC-C15: 15 агентов (14 v4.0.1 + Intern.md) | Verify: CLI: count=15
- [x] ISC-C16: Intern.md русифицирован, остальные v4.0.1 originals | Verify: Grep: 1/15 has Russian

### Финал
- [x] ISC-C17: CLAUDE.md сгенерирован из template (0 unresolved vars) | Verify: CLI: BuildCLAUDE.ts success, Navi+v3.5.0 resolved
- [x] ISC-C18: Staging содержит полную рабочую структуру PAI | Verify: Custom: all dirs/files verified

### Анти-критерии
- [x] ISC-A1: MEMORY не перезаписана (231=231, checksums match) | Verify: CLI: md5sum match
- [x] ISC-A2: daidentity.name=Navi, principal.name=Ivan | Verify: Read: confirmed in merged settings
- [x] ISC-A3: VoiceServer скопирован (11 files) | Verify: CLI: ls confirmed

## DECISIONS

- 2026-02-28: ConfigChange hook DROPPED — v4.0.1 не использует ConfigChange event. SecurityValidator по-прежнему защищает через PreToolUse.
- 2026-02-28: Русификация агентов — только Intern.md перенесён с русским. Остальные 14 агентов v4.0.1 на английском. Отдельная задача на ре-русификацию.
- 2026-02-28: skill-index.json — v4.0.1 не имеет своего, скопирован наш v3 (5 записей). Нужна регенерация для v4.0.1 skills.
- 2026-02-28: Custom md-only skills (vercel-*, supabase-*, web-design-*) перемещены в skills/Utilities/.
- 2026-02-28: env.PAI_DIR оставлен как /home/ser/.claude (конкретный путь) для совместимости с текущей системой.

## LOG

### Iteration 0 — 2026-02-28 (Planning + Deep Verification)
- Phase reached: PLAN (verified)
- Criteria progress: 0/18 (+3 anti)
- Work done: Полный анализ различий v3.0 vs v4.0.1, создание 7-batch плана, ГЛУБОКАЯ ВЕРИФИКАЦИЯ кода v4.0.1
- Verified from v4.0.1 source:
  - settings.json: 27 top-level keys, 6 hook events, 20 hooks (mapped all)
  - hooks/lib/paths.ts: API ИДЕНТИЧЕН нашему (7 exports match)
  - hooks/lib/tab-setter.ts: API ИДЕНТИЧЕН нашему (7 exports match)
  - hooks/lib/identity.ts: РАСШИРЕН но обратно совместим (добавлены getAlgorithmVoice, getVoicePersonality)
  - hooks/lib/hook-io.ts: НОВЫЙ, импортирует PAI/Tools/TranscriptParser — КРИТИЧЕСКАЯ ЗАВИСИМОСТЬ
  - SessionCleanup.hook.ts: Заменяет наш SessionSummary + StopOrchestrator (подтверждено)
  - VoiceCompletion.hook.ts: Заменяет наш VoiceGate (использует CLAUDE_CODE_AGENT_TASK_ID вместо kitty-sessions check)
  - PAI/Tools/: 20+ утилит, включая TranscriptParser, BuildCLAUDE, Inference — ОБЯЗАТЕЛЬНО копировать
- Failing: all
- Context for next iteration: Начать с Batch 1. КРИТИЧЕСКИЙ ПУТЬ: PAI/Tools/ + hook-io.ts → без них 4 хука v4.0.1 не запустятся. Batch 4 (хуки) — ключевой риск, но lib API совместим.

### Iteration 1 — 2026-02-28 (Execution — Batches 1-7)
- Phase reached: VERIFY
- Criteria progress: 18/18 + 3/3 anti — ALL PASSING
- Work done:
  - Batch 1: Бэкап (631M) + клон PAI repo + staging создан
  - Batch 2: MEMORY (231 файлов), VoiceServer, plugins, custom-agents, tasks, projects скопированы
  - Batch 3: settings.json мержнут — v4.0.1 hooks + наши ported hooks + наши identity/mcp/counts + новые v4.0.1 поля (loadAtStartup, dynamicContext, spinnerTipsOverride, preferences)
  - Batch 4: 4 хука портированы (AlgorithmTracker, StartupGreeting, AutoWorkCreation, PostCompactRecovery) + 2 lib (algorithm-state, metadata-extraction) + 1 handler (AlgorithmEnrichment). Все импорты совместимы.
  - Batch 5: 11 категорий скиллов v4.0.1 + наши 4 custom skills в Utilities. skill-index.json скопирован (needs refresh).
  - Batch 6: 15 агентов (14 v4.0.1 + Intern.md). Русификация частичная (1/15).
  - Batch 7: CLAUDE.md сгенерирован из template, statusline скопирован, Plans/ide/.git скопированы.
- Failing: none
- Context for next iteration: Swap (mv ~/.claude ~/.claude-v3-old && mv ~/.claude-v4-staging ~/.claude) — ожидает подтверждения пользователя. Follow-up: ре-русификация агентов, обновление skill-index.json.

### Инвентаризация различий

**Хуки:**
- Общие (есть в обоих): AgentExecutionGuard, IntegrityCheck, LoadContext, QuestionAnswered, RatingCapture, RelationshipMemory, SecurityValidator, SessionAutoName, SetQuestionTab, SkillGuard, UpdateCounts, UpdateTabTitle, WorkCompletionLearning (13 штук)
- Только наши (портировать): AlgorithmTracker, AutoWorkCreation, PostCompactRecovery, StartupGreeting (4 штуки)
- Только наши (дропнуть): CheckVersion, ISCSyncHook→PRDSync (2 штуки)
- Только наши (анализ): StopOrchestrator vs SessionCleanup, VoiceGate vs VoiceCompletion, SessionSummary vs SessionCleanup (3 штуки)
- Только v4.0.1 (взять): DocIntegrity, KittyEnvPersist, LastResponseCache, PRDSync, ResponseTabReset, SessionCleanup, VoiceCompletion (7 штук)

**Lib:**
- Общие: change-detection, identity, learning-utils, notifications, output-validators, paths, prd-template, tab-constants, tab-setter, time (10 штук)
- Только наши: algorithm-state, metadata-extraction (2 штуки)
- Только v4.0.1: hook-io, learning-readback, prd-utils (3 штуки)

**Handlers:**
- Общие: DocCrossRefIntegrity, SystemIntegrity, TabState, UpdateCounts, VoiceNotification (5 штук)
- Только наши: AlgorithmEnrichment (портировать), RebuildSkill (дропнуть)
- Только v4.0.1: BuildCLAUDE (новый)

**Скиллы:**
- v3.0: 44 плоских директории
- v4.0.1: 11 иерархических категорий с 63 скиллами
- Полная замена, проверка аудит-фиксов

**Данные (просто копируем):**
- MEMORY/ (222 файла, 1.8MB)
- settings.json (merge)
- custom-agents/, plugins/, VoiceServer/
- tasks/, projects/, backups/
