# Jules Auto-Merge Pipeline

## Context
Navi вручную мержит каждый PR от Jules: fetch → review diff → cherry-pick → fix conflicts → fix tests → push. На каждый PR уходит 5-10 минут. При 3-6 PR за ночь это 30-60 минут ручной работы. Автоматизация превратит это в: Jules сделал → тесты прошли → смержено → Ivan утром видит результат.

## Что создаём

**1 новый файл:** `PAI/Tools/JulesAutoMerge.ts` (~250 строк)

### CLI Интерфейс
```
bun PAI/Tools/JulesAutoMerge.ts check                # показать готовые PR
bun PAI/Tools/JulesAutoMerge.ts merge                # автомерж если тесты ОК
bun PAI/Tools/JulesAutoMerge.ts merge --dry-run      # показать что будет (без действий)
bun PAI/Tools/JulesAutoMerge.ts merge --repo private  # только PAI-personal
bun PAI/Tools/JulesAutoMerge.ts status               # статистика
```

### Пайплайн для каждого PR
1. Jules API: найти COMPLETED сессии с PR
2. gh CLI: проверить что PR open и mergeable
3. Safety: baseRef === целевая ветка (master/main)
4. `git fetch` + `git worktree add /tmp/jules-test-*` — изоляция
5. `bun test hooks/tests/` в worktree (timeout 120s)
6. Если тесты прошли → `gh pr merge --squash --delete-branch`
7. `git pull private master` — синхронизация
8. Лог в events.jsonl, обновление state файла
9. Cleanup worktree

### State
Файл: `MEMORY/STATE/jules-automerge.json`
- processedSessions[] — какие сессии уже обработаны (идемпотентность)
- stats — totalMerged/Failed/Skipped
- lastCheck — timestamp

### Safety Rules
- НИКОГДА не мержить если тесты провалены
- НИКОГДА не мержить в неправильную ветку
- Worktree cleanup ВСЕГДА в finally
- State сохраняется после КАЖДОГО PR (crash-safe)
- Повторный запуск безопасен (isAlreadyProcessed check)

### Репозитории
| Ключ | Remote | Repo | Branch |
|------|--------|------|--------|
| private | private | rikitikitavi2012-debug/PAI-personal | master |
| origin | origin | rikitikitavi2012-debug/PAI | main |

## Ключевые файлы для реализации
- `skills/Utilities/Jules/Tools/JulesAPI.ts` — Jules API паттерн (apiCall, auth)
- `PAI/Tools/EventStats.ts` — CLI tool pattern (args, output, state)
- `PAI/Tools/CommunityCheck.ts` — state management (loadState/saveState)
- `hooks/WorktreeCreate.hook.ts` — worktree creation via Bun.spawn
- `hooks/lib/event-emitter.ts` — appendEvent() для логирования

## Верификация
1. `bun PAI/Tools/JulesAutoMerge.ts check` — показывает готовые PR
2. `bun PAI/Tools/JulesAutoMerge.ts merge --dry-run` — показывает что будет без действий
3. `bun PAI/Tools/JulesAutoMerge.ts merge` — реальный мерж 1 PR
4. `bun test hooks/tests/` — все 163+ теста проходят после мержа
5. `git log -3` — видим squash-коммит от Jules
