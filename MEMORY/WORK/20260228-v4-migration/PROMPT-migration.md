# Промпт для миграции PAI v3.0 → v4.0.1

Копируй и вставляй:

---

Выполни миграцию PAI v3.0 → v4.0.1 по PRD:
`~/.claude/MEMORY/WORK/20260228-v4-migration/PRD-20260228-v4-migration.md`

**Режим:** Loop mode, Advanced effort level.

**Что делать:**
1. Прочитай PRD полностью — там 7 батчей, 18 ISC + 3 anti-criteria
2. Начни с Batch 1 (бэкап + скачивание v4.0.1)
3. Для каждого батча:
   - Выполни все шаги
   - Верифицируй ISC критерии этого батча
   - Обнови PRD: checkboxes, STATUS, LOG
4. Ключевые ограничения:
   - MEMORY/ только КОПИРОВАТЬ, никогда не модифицировать
   - settings.json МЕРЖИТЬ, не заменять
   - Работать в ~/.claude-v4-staging/, НЕ в ~/.claude/
   - Финальный swap (Batch 7) — ТОЛЬКО после полной верификации и AskUserQuestion подтверждения
5. При ошибках — СТОП, не продолжать вслепую

**Верифицированная совместимость (из кода v4.0.1, 28 фев 2026):**
- `hooks/lib/paths.ts` — API идентичен нашему (7 экспортов совпадают)
- `hooks/lib/tab-setter.ts` — API идентичен (7 экспортов)
- `hooks/lib/identity.ts` — расширен но обратно совместим

**КРИТИЧЕСКИЙ ПУТЬ — PAI/Tools/:**
v4.0.1 хуки (VoiceCompletion, LastResponseCache, DocIntegrity, ResponseTabReset) через `hook-io.ts` импортируют `../../PAI/Tools/TranscriptParser`. Директория `PAI/Tools/` ОБЯЗАТЕЛЬНА — без неё 4 хука не запустятся. Копируй всю `PAI/` директорию в Batch 2 вместе с данными.

**Batch 4 (хуки) — детальная карта замен:**

ПОРТ (2 хука — наши уникальные, перенести as-is, проверить импорты):
- `AlgorithmTracker.hook.ts` + `lib/algorithm-state.ts` + `lib/metadata-extraction.ts` + `handlers/AlgorithmEnrichment.ts`
- `PostCompactRecovery.hook.ts` (SessionStart/compact)

МЕРЖ (2 — нужен анализ при портировании):
- StartupGreeting + KittyEnvPersist → оставить ОБА, StartupGreeting после KittyEnvPersist в SessionStart
- ConfigChange/SecurityValidator → проверить нужна ли эта защита в v4.0.1

ДРОП (5 — заменены в v4.0.1):
- `VoiceGate.hook.ts` → v4.0.1 использует CLAUDE_CODE_AGENT_TASK_ID в VoiceCompletion
- `ISCSyncHook.hook.ts` → заменён на PRDSync.hook.ts (PostToolUse/Write,Edit)
- `SessionSummary.hook.ts` → заменён на SessionCleanup.hook.ts (делает то же + чистит tab, work state)
- `CheckVersion.hook.ts` → заменён на BuildCLAUDE.ts при SessionStart
- `StopOrchestrator.hook.ts` → v4.0.1 разбил на 4 отдельных Stop хука (VoiceCompletion, ResponseTabReset, LastResponseCache, DocIntegrity)

БЕРЁМ ОТ v4.0.1 (7 новых хуков):
- `KittyEnvPersist.hook.ts` (SessionStart) — persist Kitty env + tab reset
- `DocIntegrity.hook.ts` (Stop) — целостность документов
- `LastResponseCache.hook.ts` (Stop) — кэш последнего ответа
- `PRDSync.hook.ts` (PostToolUse/Write,Edit) — синхронизация PRD
- `ResponseTabReset.hook.ts` (Stop) — сброс табов при завершении
- `SessionCleanup.hook.ts` (SessionEnd) — финализация сессии
- `VoiceCompletion.hook.ts` (Stop) — голосовое завершение

НОВЫЕ lib/handlers от v4.0.1:
- `lib/hook-io.ts` — КРИТИЧНО, stdin reader для Stop хуков
- `lib/learning-readback.ts` — чтение рефлексий
- `lib/prd-utils.ts` — PRD утилиты
- `handlers/BuildCLAUDE.ts` — генерация CLAUDE.md из template

**settings.json merge стратегия:**
Наш settings.json: 23 top-level ключа. v4.0.1: 27 ключей.
- СОХРАНИТЬ наши: daidentity, principal, permissions, env, mcpServers, statusLine, spinnerVerbs, counts, notifications, techStack, feedbackSurveyState, max_tokens
- ВЗЯТЬ от v4.0.1: hooks (новая структура), preferences (новое), dynamicContext (новое), loadAtStartup (новое), spinnerTipsOverride (новое), _contextFiles_docs (новое)
- МЕРЖИТЬ hooks: взять v4.0.1 как базу, ДОБАВИТЬ наши портированные хуки (AlgorithmTracker matchers, AutoWorkCreation, StartupGreeting, PostCompactRecovery)

---
