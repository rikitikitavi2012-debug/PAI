# Z.AI Pipeline Integration + CommunityWatcher — Resume Prompt

**Статус:** Готово к старту
**Дата:** 2026-03-03
**Фаза:** A (заточка инструментов, до ~10 марта)

---

## Контекст

PAI v4.0.3. Бригада: Navi (архитектор) + Jules (async-кодер) + A0 (ревьюер, VPS 24/7) + Z.AI (Zhipu GLM-5, подписка) + Gemini (второе мнение).

**Проблема:** Z.AI почти не используется — Ivan платит подписку, а нагрузка 5%. A0 используется на 20%.

**CommunityWatcher.ts** уже создан (`PAI/Tools/CommunityWatcher.ts`) — мониторит upstream PRs/Issues через `gh` CLI. Работает, отчёт в `MEMORY/STATE/community-report.json`.

---

## Задачи этой сессии

### 1. Z.AI как second reviewer в JulesAutoMerge

**Текущий pipeline:** Jules PR → тесты в worktree → A0 code review → merge
**Целевой pipeline:** Jules PR → тесты → A0 review + Z.AI review (параллельно) → merge

**Где код:**
- `PAI/Tools/JulesAutoMerge.ts` — основной pipeline
- `PAI/Tools/Inference.ts --level glm5` — Z.AI endpoint
- Z.AI API: `https://api.z.ai/api/coding/paas/v4/chat/completions` (coding plan subscription)
- API key: ZAI_API_KEY в `~/.config/PAI/.env`

**Что делать:**
1. Прочитать JulesAutoMerge.ts — найти где вызывается A0 review
2. Добавить Z.AI review параллельно с A0 (Promise.all)
3. Z.AI получает diff и возвращает: quality score, issues, рекомендации
4. Если A0 HIGH severity ИЛИ Z.AI critical — блокировать merge
5. Оба review логируются в events.jsonl

**Промпт для Z.AI review:**
```
Review this code diff from a Jules PR. Focus on:
1. Security issues (injection, path traversal, secrets)
2. Logic errors and edge cases
3. TypeScript type safety
4. Patterns that violate: determinism > AI, fail-open for hooks, defensive coding
Return JSON: { score: 1-10, severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", issues: [...], summary: string }
```

### 2. Где ещё использовать Z.AI (подумать и предложить)

Идеи для обсуждения с Ivan:
- **Vision для UI проверок** — zai-cli vision анализирует скриншоты Kitty/Dashboard
- **Web search в Research skill** — zai-cli search как дополнительный поисковик
- **Code analysis** — второе мнение по архитектурным решениям (рядом с A0)
- **Repo analysis** — zai-cli repo для анализа структуры кодовых баз перед рефакторингом
- **Doc reader** — zai-cli read для парсинга web-контента

### 3. CommunityWatcher в LoadContext hook

**Текущее:** CommunityWatcher.ts запускается вручную.
**Целевое:** При старте сессии автоматически:
1. `bun CommunityWatcher.ts --brief` (10 сек, одна строка)
2. Если есть действия (reviews, комментарии) — добавить в dynamic context
3. Полный отчёт (`--full`) — по запросу или раз в сутки

**Где код:** `hooks/LoadContext.hook.ts` — уже загружает dynamic context при старте.

**Архитектура "как отчёт попадает к Navi":**
- CommunityWatcher.ts = локальный, `gh` CLI, детерминизм (принцип #2)
- A0 = по запросу для глубокого анализа (browser agent, cross-referencing)
- Отчёт сохраняется в `MEMORY/STATE/community-report.json`
- LoadContext.hook.ts читает отчёт и инжектирует если есть action items

### 4. Security fixes (новый Jules task)

PR #14 был закрыт (конфликты). Создать новый Jules task:
- fetch timeouts для всех хуков (MED-05)
- top-level catch для хуков без него
- БЕЗ переформатирования кавычек (это было причиной конфликтов)

```bash
JULES_REPO=sources/github/rikitikitavi2012-debug/PAI-personal JULES_BRANCH=master bun skills/Utilities/Jules/Tools/JulesAPI.ts create "Coding Plan: Add fetch timeouts and top-level catches to hooks.

Add AbortSignal.timeout(3000) to ALL fetch() calls in hooks that don't have it yet.
Add top-level main().catch() to hooks that are missing it.

DO NOT change formatting (quotes, semicolons, spacing).
DO NOT modify files that were recently changed by PR #16 (vocabulary-loader).

Files to check: all hooks/*.hook.ts files.
Run: bun test hooks/tests/ — all tests must pass.
DO NOT modify MEMORY/, USER/, .env, settings.json."
```

---

## Критерии завершения

- [ ] Z.AI review работает в JulesAutoMerge (параллельно с A0)
- [ ] CommunityWatcher brief в LoadContext hook
- [ ] Новый Jules task на security fixes (без форматирования)
- [ ] Предложения по Z.AI использованию обсуждены с Ivan
- [ ] Коммит и push в private/master

---

## Промпт для копирования

```
Фаза A, задача 2: Z.AI pipeline integration. Прочитай ~/.claude/MEMORY/WORK/20260303-zai-pipeline/RESUME.md и выполни задачи 1-4. Контекст: добавляем Z.AI как second reviewer в JulesAutoMerge, интегрируем CommunityWatcher в LoadContext, создаём новый Jules task на security fixes.
```
