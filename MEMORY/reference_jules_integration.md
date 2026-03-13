---
name: Jules Integration Architecture
description: Схема интеграции Google Jules с PAI — AGENTS.md, API, AutoMerge, настройки, ограничения языка
type: reference
---

# Jules Integration Architecture (2026-03-13)

## Коммуникация

**API:** `bun skills/Utilities/Jules/Tools/JulesAPI.ts` (REST, julius.googleapis.com/v1alpha)
**Auth:** `JULIUS_API_KEY` в `~/.config/PAI/.env`
**Gemini CLI:** `/julius` extension
**AutoMerge:** `bun PAI/Tools/JulesAutoMerge.ts merge`

## Единственный рычаг контекста: AGENTS.md

Jules читает `AGENTS.md` из корня репо **перед каждой задачей**. Не CLAUDE.md, не JULES.md.

| Репо | AGENTS.md | Статус |
|------|-----------|--------|
| PAI-personal (~/.claude) | ✅ Есть + Russian language instruction | Обновлён 2026-03-13 |
| timber-frame-site | ✅ Создан с нуля | Stack, domain expertise, Russian |
| agent-zero-custom | ❌ Нет | TODO |

## Русский язык

**Официально не поддерживается.** Нет настройки языка ни в UI, ни в API.
**Workaround:** Инструкция в AGENTS.md: "Всегда пиши на русском: PR descriptions, plan summaries, commit body."
Jules работает на Gemini Pro — понимает русский. Compliance не гарантирован но должен работать.

## Что можно настроить (UI/API)

| Настройка | Где | Значение |
|-----------|-----|----------|
| Commit Authoring | Settings | Jules / Co-authored / User |
| Memory per repo | Repo Settings > Knowledge | On/Off |
| Environment Script | Configuration > Environment | bash перед задачей |
| Environment Variables | Repo Settings | key=value |
| Scheduled Tasks | Repo > Scheduled | Daily/Weekly + prompt |
| MCP интеграции | Settings > MCP | Linear, Supabase, Neon... |

## Что НЕЛЬЗЯ настроить

- Язык UI/ответов (только через AGENTS.md)
- Модель (авто по тарифу: Pro = Gemini 3 Pro)
- System instructions
- Temperature, persona

## AutoMerge Pipeline

```
Jules PR → JulesAutoMerge.ts:
  1. Тесты в изолированном worktree
  2. A0 code review (120s)
  3. Z.AI code review (30s)
  4. Merge если всё ОК
```

Репо: private (autoMerge=true), a0custom (autoMerge=true), origin (review-only)

## Лимиты (Pro план)

- 100 задач/день, 15 параллельных
- Gemini 3 Pro модель

## Связанные файлы

- `skills/Utilities/Jules/Tools/JulesAPI.ts` — API клиент
- `PAI/Tools/JulesAutoMerge.ts` — auto-merge pipeline
- `~/.gemini/extensions/gemini-cli-julius/` — Gemini CLI extension
- `AGENTS.md` — инструкции для Jules (корень репо)
- `~/projects/timber-frame-site/AGENTS.md` — инструкции для TF сайта
