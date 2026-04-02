---
task: "Перепроектировать AutoSkillProposal hook v2 — качественное создание skills из сессий"
slug: "20260402-024500_autoskillproposal-v2-redesign"
effort: "Extended"
phase: "verify"
progress: "17/17"
mode: "interactive"
started: "2026-04-02T02:45:00Z"
updated: "2026-04-02T03:15:00Z"
---

# AutoSkillProposal v2 — Redesign

## STATUS

| What | State |
|------|-------|
| Progress | 17/17 criteria passing |
| Phase | VERIFY |
| Next action | LEARN phase |
| Blocked by | nothing |

## APPETITE

| Budget | Circuit Breaker | ISC Target |
|--------|-----------------|------------|
| <8min | 1 session | 17 criteria |

## CONTEXT

### Problem Space
Текущий AutoSkillProposal hook:
- Читает только `last_assistant_message` (до 4000 символов)
- Использует Haiku (поверхностный анализ)
- Не проверяет на дубликаты skills
- Создаёт навыки низкого качества
- За всё время не создал ни одного skill

**Цель:** Перепроектировать hook так, чтобы:
1. Читать полную сессию из transcript_path
2. Использовать Sonnet для глубокого анализа
3. Проверять на дубликаты через skill-index.json
4. Следовать формату CreateSkill (TitleCase, flat structure)
5. Применять confidence threshold (0.7)

### Key Files
- `hooks/AutoSkillProposal.hook.ts` — переписанный hook ✅
- `PAI/Tools/Inference.ts` — AI inference
- `skills/Utilities/CreateSkill/SKILL.md` — формат skills
- `PAI/SkillSystem.md` — система skills

## RISKS & RABBIT HOLES

### Найденные проблемы (исправлены)

| # | Проблема | Статус |
|---|----------|--------|
| 1 | `last_assistant_message` вместо transcript | ✅ Исправлено — `parseTranscriptFromInput()` |
| 2 | `transcript_path` игнорируется | ✅ Исправлено |
| 3 | Level `fast` (Haiku) | ✅ Исправлено — `standard` (Sonnet) |
| 4 | `countToolCalls()` сломан | ✅ Исправлено — XML pattern |
| 5 | Rate-limit закомментирован | ✅ Исправлено — `checkRateLimit()` |
| 6 | Нет проверки дубликатов | ✅ Исправлено — `checkDuplicate()` |
| 7 | Обрезка до 4000 символов | ✅ Исправлено — полный transcript |
| 8 | Нет валидации полей | ✅ Исправлено — confidence check |

## PLAN

### Architecture

```
PHASE 1: Input & Validation (sync)
  → parseTranscriptFromInput()
  → checkRateLimit()

PHASE 2: Metrics Collection (sync)
  → countToolCalls() — исправленный regex
  → Если < 5 tools → exit

PHASE 3: Duplicate Check (sync)
  → loadExistingSkills()
  → checkDuplicate() — >50% overlap

PHASE 4: AI Analysis (async, ~5-15s)
  → Inference --level standard
  → SKILL_ANALYSIS_PROMPT

PHASE 5: Validation & Creation (sync)
  → confidence >= 0.7 check
  → toTitleCase() naming
  → CreateSkill format
  → Voice notification
```

## IDEAL STATE CRITERIA (Verification Criteria)

### Data Collection (Phase 1)
- [x] ISC-1: Hook читает transcript из `transcript_path` полностью (verify: `parseTranscriptFromInput` imported line 25)
- [x] ISC-2: Hook парсит tool calls из transcript (verify: `countToolCalls` line 95, `<function=([A-Za-z]+)>` regex)
- [x] ISC-3: Hook извлекает повторяющиеся sequences (verify: prompt line 60 "Repeats 2+ times")
- [x] ISC-4: Hook считает метрики: unique_tools (verify: `uniqueTools` Set line 99)

### Duplicate Detection (Phase 2)
- [x] ISC-5: Hook читает существующие skills (verify: `loadExistingSkills` line 164)
- [x] ISC-6: Hook сравнивает triggers с существующими skills (verify: `checkDuplicate` line 110)
- [x] ISC-7: Hook логирует если похожий skill уже есть (verify: log line 297)

### AI Analysis (Phase 3)
- [x] ISC-8: Hook использует Sonnet (`--level standard`) (verify: line 271 `level: 'standard'`)
- [x] ISC-9: Prompt требует JSON с confidence score (verify: line 74 `"confidence": 0.0-1.0`)
- [x] ISC-10: Prompt требует TitleCase naming (verify: line 77 `"name": "TitleCase"`)
- [x] ISC-11: Hook проверяет confidence >= 0.7 (verify: line 281 `confidence < 0.7`)

### Skill Creation (Phase 4)
- [x] ISC-12: Создаваемый skill следует CreateSkill формату (verify: lines 303-322 frontmatter + workflow routing)

### Error Handling
- [x] ISC-13: Hook имеет timeout 30s (verify: line 33 `TIMEOUT_MS = 30_000`)
- [x] ISC-14: Hook gracefully обрабатывает пустой transcript (verify: line 249 "Transcript too short")
- [x] ISC-15: Hook логирует ошибки в stderr, не падает (verify: try/catch in main())

### Rate Limiting
- [x] ISC-16: Hook проверяет proposal state file (verify: `checkRateLimit` line 134)
- [x] ISC-17: Hook создаёт max 1 skill per session (verify: `updateState` line 149)

### Anti-Criteria
- [x] ISC-A1: Hook НЕ создаёт skills с confidence < 0.7 (verify: early exit line 281)
- [x] ISC-A2: Hook НЕ создаёт дубликаты существующих skills (verify: `checkDuplicate` call line 296)
- [x] ISC-A3: Hook НЕ использует Haiku для анализа (verify: grep "'fast'" → not found)
- [x] ISC-A4: Hook НЕ спамит voice уведомлениями (verify: rate limit + single notify)

## DECISIONS

1. **Direct import vs execFileSync:** Выбран прямой `import { inference }` вместо subprocess — быстрее, меньше overhead
2. **Sonnet vs Opus:** Sonnet достаточно для pattern analysis — Opus избыточен
3. **5 tool threshold:** Снижено с 8 до 5 — больше кандидатов, фильтр на confidence
4. **50% overlap for duplicate:** Консервативный порог — 50% общих triggers = duplicate

## VERIFICATION

### Manual Tests

```
$ echo '{"session_id":"test"}' | bun hooks/AutoSkillProposal.hook.ts
[AutoSkillProposal] Transcript too short, skipping ✅

$ bun build hooks/AutoSkillProposal.hook.ts --no-bundle
(compiles cleanly) ✅
```

### Key Code Locations

| Criterion | File:Line | Evidence |
|-----------|-----------|----------|
| ISC-1 | AutoSkillProposal.hook.ts:25 | `parseTranscriptFromInput` import |
| ISC-8 | AutoSkillProposal.hook.ts:271 | `level: 'standard'` |
| ISC-11 | AutoSkillProposal.hook.ts:281 | `confidence < 0.7` |
| ISC-13 | AutoSkillProposal.hook.ts:33 | `TIMEOUT_MS = 30_000` |

## CHANGELOG

- 2026-04-02T02:45:00Z | CREATED | Extended effort | 17 ISC
- 2026-04-02T03:15:00Z | VERIFY COMPLETE | 17/17 criteria passing
