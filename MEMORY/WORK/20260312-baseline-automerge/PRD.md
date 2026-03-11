---
task: "Доработать JulesAutoMerge: baseline test comparison"
slug: 20260312-baseline-automerge
effort: Standard
phase: execute
progress: 0/6
mode: algorithm
started: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:00:00Z
---

## Context
JulesAutoMerge прогоняет `bun test hooks/tests/` на PR branch. Если хоть один тест фейлит — PR rejected. Но на master уже 13 failing тестов (от прошлых Jules PR). Результат: ни один новый PR не мержится — замкнутый круг.

## Criteria
- [ ] ISC-1: Baseline — прогнать тесты на master (или base branch) и запомнить число fails
- [ ] ISC-2: PR branch — прогнать тесты на PR branch, посчитать число fails
- [ ] ISC-3: Сравнение — PR проходит если число fails <= baseline fails (не добавил новых)
- [ ] ISC-4: Логирование — показывать в output: "Baseline: N fails, PR: M fails, delta: +/-K"
- [ ] ISC-5: Кеш baseline — не прогонять baseline для каждого PR, кешировать на время batch run
- [ ] ISC-6: Тесты проходят — существующие тесты JulesAutoMerge.test.ts не сломаны

## Decisions
- Baseline считается один раз per repo per batch run, не per PR
- Если baseline run фейлит полностью (bun crash) — fallback на старое поведение (pass/fail)
