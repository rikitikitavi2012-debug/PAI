---
name: Autoresearch
description: Automated metric optimization via iterative experimentation — creates PRDs with [Q] criteria, manages experiment lifecycle, tracks results in experiments.tsv. USE WHEN автоисследование, оптимизация метрики, оптимизируй CPA, ночная оптимизация, optimize metric, CPA optimization, lighthouse score, performance optimization, autoresearch, bundle size optimization, reduce latency, improve score, метрика, эксперименты, итеративная оптимизация.
context: fork
---

# Autoresearch

Interface to the Autoresearch Sub-Loop Protocol (`PAI/Algorithm/Algorithm-Autoresearch.md`).

This skill does NOT contain optimization logic. It creates PRDs with `[Q]` criteria and `experiments.tsv` scaffolding. The Algorithm EXECUTE phase (via Cycle Selector) runs the actual 8-phase iteration cycle.

**Role separation:**
- **This skill** = setup, configuration, resumption, reporting
- **Algorithm Autoresearch Protocol** = execution engine (8-phase loop, stagnation detection, drift defense)

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Autoresearch/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле Autoresearch для ACTION", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Запускаю **WorkflowName** в скилле **Autoresearch** для ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

## MANDATORY: Load Knowledge Base

**Before ANY autoresearch operation, read these files in order:**

1. `~/.claude/PAI/Algorithm/Algorithm-Autoresearch.md` — Sub-Loop Protocol (8-phase cycle, stagnation, drift defense)
2. `~/.claude/PAI/Algorithm/v4.0.0.md` — Effort Levels, Iteration Budget table, Cycle Selector
3. Target PRD and `experiments.tsv` (if resuming existing optimization)

**Do NOT start optimization without reading Algorithm-Autoresearch.md first.**

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| plan, setup, configure metric, настрой метрику | `Workflows/Plan.md` |
| run, start, launch, optimize, запусти, оптимизируй | `Workflows/Run.md` |
| resume, continue, возобнови, продолжи | `Workflows/Resume.md` |
| report, results, отчёт, результаты | `Workflows/Report.md` |

## Quality Gates (MANDATORY)

### Gate 1: Metric Safety
- [ ] Verify command tested (dry-run produces numeric output)
- [ ] Baseline measurement recorded before any modifications
- [ ] Noise calibration completed (3x runs, variance computed)
- [ ] Timeout protocol configured (60s default)
- [ ] Metric direction explicitly set (higher_is_better / lower_is_better)

### Gate 2: PRD Integrity
- [ ] `[Q]` criterion has metric definition with cmd, baseline, target, direction
- [ ] `[B]` regression gates defined (at minimum: tests pass, build succeeds)
- [ ] `experiments.tsv` created with correct header comments
- [ ] `think_reentries: 0` initialized in experiments.tsv header
- [ ] `iteration_cap` set in PRD frontmatter

### Gate 3: Trust Level Validation
- [ ] Trust level explicitly chosen by user (default L2 if not specified)
- [ ] L1 (supervised): max 5 iterations per approval cycle
- [ ] L2 (monitored): max 20 iterations, progress updates every 5
- [ ] L3 (autonomous): Telegram notifications on STOP/PARTIAL/complete
- [ ] L4 (scheduled): cron job configured, results posted to Telegram

### Gate 4: Regression Protection
- [ ] Fast gates identified (<5s each: lint, type-check, grep)
- [ ] Slow gates identified (>5s: test suites, build, browser tests)
- [ ] Gate cost estimate logged: total cost < 30% of iteration budget
- [ ] Anti-criteria (`[ISC-A]`) defined if applicable

## Iteration Budget Reference

| Effort Tier | Default Cap | Configurable Range |
|---|---|---|
| Extended | 50 | 30-80 |
| Advanced | 75 | 50-120 |
| Deep | 100 | 80-200 |
| Comprehensive | 200 | 150-500 |

Standard tier always routes to Standard EXECUTE (no Autoresearch).

## Examples

### Example 1: Настройка оптимизации Lighthouse
```
User: Оптимизируй Lighthouse performance score
-> Route: Plan workflow (первый запуск — нужна настройка)
-> Action: Интерактивный визард — метрика, команда, цель, бюджет
-> Output: PRD с [Q] критерием + experiments.tsv + инструкция для запуска
```

### Example 2: Запуск оптимизации
```
User: Запусти autoresearch для bundle size
-> Route: Run workflow
-> Action: Валидация PRD, Verification Rehearsal, запуск 8-phase loop
-> Output: Algorithm EXECUTE с Autoresearch sub-loop
```

### Example 3: Возобновление после паузы
```
User: Возобнови оптимизацию CPA
-> Route: Resume workflow
-> Action: Чтение experiments.tsv, рекалибровка baseline, продолжение с Phase 1
-> Output: Восстановленный контекст + продолжение sub-loop
```

### Example 4: Отчёт по результатам
```
User: Отчёт по autoresearch
-> Route: Report workflow
-> Action: Парсинг experiments.tsv, метрики, trajectory analysis
-> Output: Baseline -> текущее значение, keep/discard ratio, рекомендации
```
