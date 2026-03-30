---
task: Auto-skill creation hook для PAI
slug: 20260330-150000_auto-skill-creation-hook
effort: Extended
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-30T15:00:00Z
updated: 2026-03-30T15:00:00Z
---

# Auto-skill Creation Hook

## Context

Создать hook, который автоматически анализирует завершённые сессии и предлагает создание skill для повторяющихся паттернов.

**Источники:**
- Hermes Agent analysis (2026-03-30) — auto-skill creation pattern
- Пользователь запросил реализацию сейчас

**Требования:**
- Триггер: Stop event
- Анализ сессии через last_assistant_message или transcript
- Предложение skill через voice + text
- Хранение в skills/auto/

**Анти-критерии:**
- НЕ создавать skills для тривиальных паттернов
- НЕ спамить пользователя предложениями
- НЕ требовать ручного review каждой сессии

## Criteria

### Trigger & Input
- [x] ISC-1: Hook триггерится на Stop event (verify: grep settings.json "Stop")
- [x] ISC-2: Hook читает last_assistant_message из stdin (verify: grep hook "last_assistant_message")
- [x] ISC-3: Hook имеет timeout на stdin (verify: grep "timeout" hook)

### Pattern Detection
- [x] ISC-4: Hook определяет "сложность" сессии (tool calls, duration) (verify: grep "complexity\|duration\|tool_calls" hook)
- [x] ISC-5: Hook фильтрует тривиальные сессии (<5 tool calls) (verify: grep "5\|MIN_TOOL" hook)
- [x] ISC-6: Hook использует LLM для анализа паттернов (verify: import inference или API call)

### Skill Proposal
- [x] ISC-7: Hook отправляет voice уведомление "Заметил паттерн" (verify: grep "notify\|voice" hook)
- [x] ISC-8: Hook выводит текстовое предложение skill (verify: grep "create.*skill\|предлагаю" hook)
- [x] ISC-9: Hook ждёт подтверждения через AskUserQuestion (verify: grep "AskUserQuestion" hook)

### Skill Creation
- [x] ISC-10: Skill создаётся в skills/auto/ директории (verify: ls skills/auto/ после создания)

## Decisions

### Technical Approach

1. **Hook File:** `hooks/AutoSkillProposal.hook.ts`
   - Trigger: Stop event
   - Input: last_assistant_message from stdin
   - Output: Voice notification + AskUserQuestion

2. **Pattern Detection:**
   - Use Inference.ts (fast level) для анализа
   - System prompt: "Analyze this session for reusable patterns"
   - Filter: session must have >10 tool calls OR >3min duration

3. **Skill Storage:**
   - Directory: `skills/auto/`
   - Format: Same as hand-crafted skills (SKILL.md)
   - Filename: kebab-case from detected pattern name

4. **Rate Limiting:**
   - Max 1 proposal per session
   - Cooldown: 5 minutes between proposals (state file)

### Key Decisions

- **LLM vs Regex:** Выбран LLM через Inference.ts — паттерны сложные, regex недостаточно
- **Fast vs Standard level:** Fast (haiku) — достаточно для pattern detection, экономия токенов
- **AskUserQuestion vs Auto-create:** AskUserQuestion — пользователь контролирует создание

## Verification

- [x] ISC-1: Hook зарегистрирован в settings.json (grep -c "AutoSkillProposal" settings.json → 1)
- [x] ISC-10: skills/auto/ директория создана (ls skills/auto/ → exists)
- [x] Build успешен (bun build hooks/AutoSkillProposal.hook.ts → 20.11 KB)
