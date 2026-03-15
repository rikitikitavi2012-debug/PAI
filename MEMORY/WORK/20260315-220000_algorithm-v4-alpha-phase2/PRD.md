---
task: Algorithm v4.0-alpha — 4 core autoresearch components
slug: 20260315-220000_algorithm-v4-alpha-phase2
effort: extended
phase: complete
progress: 22/22
mode: algorithm
started: 2026-03-15T22:00:00
updated: 2026-03-15T22:00:00
---

## Context

Фаза 2 эволюции Algorithm. На базе v3.6.0 (Фаза 1 complete, merged) создать v4.0-alpha с 4 новыми компонентами: Cycle Selector, Autoresearch Sub-Loop Protocol, Layered Drift Defense, Iteration Budget. Autoresearch protocol выносится в отдельный файл (P1 RedTeam: >450 строк).

Архитектурный отчёт: `MEMORY/WORK/20260315-algorithm-evolution-autoresearch/ANALYSIS.md`
Исследование репозиториев: `MEMORY/RESEARCH/2026-03/2026-03-15_autoresearch-repos-comparison/`
Фаза 1 PRD (complete): `MEMORY/WORK/20260315-algorithm-v360-phase1/PRD.md`

Ключевое решение: autoresearch = расширение EXECUTE фазы, не новый mode. PAI владеет стратегией (ЧТО), autoresearch — тактикой (КАК).

### Risks
- Файл v4.0-alpha.md раздувается за 450 строк → mitigated: autoresearch protocol в отдельный файл
- Cycle Selector слишком rigidный без human override → добавить override syntax
- Autoresearch файл загружается лишний раз при pure [B] → mitigated: Load only when Cycle Selector routes to Autoresearch/Hybrid
- Stagnation thresholds (5/10) не проверены эмпирически → configurable per-task

## Criteria

### Git workflow (5)
- [x] ISC-1: Feature branch `feat/algorithm-v4-alpha` created from master
- [x] ISC-2: v3.6.0.md not modified (fallback preserved)
- [x] ISC-3: v4.0-alpha.md created with version header updated
- [x] ISC-4: CLAUDE.md references v4.0-alpha.md
- [x] ISC-5: LATEST file contains v4.0-alpha

### Cycle Selector (4)
- [x] ISC-6: Cycle Selector section exists between PLAN and BUILD phases
- [x] ISC-7: All-[B] criteria routes to Standard EXECUTE
- [x] ISC-8: Any [Q] criteria routes to Autoresearch EXECUTE
- [x] ISC-9: Mixed criteria routes to Hybrid EXECUTE (standard for [B], autoresearch for [Q])

### Autoresearch Sub-Loop (4)
- [x] ISC-10: 8-phase protocol defined (REVIEW→IDEATE→MODIFY→COMMIT→VERIFY→DECIDE→LOG→REPEAT)
- [x] ISC-11: Self-Interrogation triggered every 20 iterations
- [x] ISC-12: Stagnation detection defined (>5 discards → amplify, >10 → STOP)
- [x] ISC-13: Protocol placed in separate Algorithm-Autoresearch.md file

### Layered Drift Defense (3)
- [x] ISC-14: L1 Strategic — Self-Interrogation every 20 experiments with ISC alignment check
- [x] ISC-15: L2 Tactical — auto-revert on regression gate failure per experiment
- [x] ISC-16: L3 Structural — trajectory analysis every 10 experiments with plateau/oscillation detection

### Iteration Budget (1)
- [x] ISC-17: Budget table maps Effort→Cap (Standard=20, Extended=50, Advanced=75, Deep=100, Comprehensive=200)

### Quality (3)
- [x] ISC-18: Main file v4.0-alpha.md ≤ 450 lines
- [x] ISC-19: Autoresearch protocol file is self-contained with clear reference from main file
- [x] ISC-20: RedTeaming completed with findings addressed before merge

### Validation (2)
- [x] ISC-21: 3 atomic commits on feature branch (Sub-Loop + Drift Defense in one file = one commit)
- [x] ISC-22: Real task test with [Q] criterion produces correct Cycle Selector routing

### Anti-criteria
- [x] ISC-A1: Existing v3.6.0 sections NOT deleted or rewritten in v4.0-alpha
- [x] ISC-A2: v3.5.0.md NOT modified

## Decisions
- Sub-Loop + Drift Defense in single file: they are architecturally inseparable (drift defense operates within the sub-loop), forced split would be artificial
- Human override via execute_mode frontmatter: prevents Cycle Selector from being too rigid
- Autoresearch file loaded only on-demand: saves tokens for 80%+ of tasks that are pure [B]

## Verification
- ISC-1: `git branch` confirms feat/algorithm-v4-alpha exists ✅
- ISC-2: `git diff` of v3.6.0.md and v3.5.0.md = 0 lines changed ✅
- ISC-3: v4.0-alpha.md exists, header = "## The Algorithm 4.0-alpha" ✅
- ISC-4: CLAUDE.md contains "PAI/Algorithm/v4.0-alpha.md" ✅
- ISC-5: LATEST = "v4.0-alpha" ✅
- ISC-6-9: Cycle Selector section present with Standard/Autoresearch/Hybrid routing ✅
- ISC-10-13: Algorithm-Autoresearch.md contains 8-phase protocol, Self-Interrogation, stagnation ✅
- ISC-14-16: Layered Drift Defense L1/L2/L3 defined ✅
- ISC-17: Iteration Budget table present (Standard excluded, Extended-Comprehensive mapped) ✅
- ISC-18: v4.0-alpha.md = 441 lines ≤ 450 ✅
- ISC-19: Algorithm-Autoresearch.md self-contained (157 lines), referenced from main file ✅
- ISC-20: RedTeaming completed, 3 P0 + 4 P1 addressed ✅
- ISC-21: 4 commits on feature branch ✅
- ISC-22: Dry-run Cycle Selector routing test with [Q] → Autoresearch ✅
- ISC-A1: v3.6.0 sections preserved in v4.0-alpha (additive only) ✅
- ISC-A2: v3.5.0.md untouched (0 diff) ✅
- Capability check: Thinking:RedTeam invoked via Skill tool ✅
