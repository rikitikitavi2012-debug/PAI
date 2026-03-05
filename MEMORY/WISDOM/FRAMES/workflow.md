# Frame: Workflow Domain

## Meta
- **Domain:** workflow
- **Confidence:** 75%
- **Observation Count:** 26
- **Last Crystallized:** 2026-03-05
- **Source:** Converted from workflow.json

---

## Core Principles

### Ivan предпочитает MVP сначала, идеальное потом — YAGNI принцип активен [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

---

## Contextual Rules

- Задачи в конце дня нужно батчить — не прерывать deep work мелочами (learned 2026-02-22)
- Ivan uses autonomous loop mode with explicit verification criteria (EXISTS, grep, wc) — prefers measurable, checkable outcomes over subjective validation (learned 2026-02-25)
- Ivan cross-references upstream repos (Daniel Miessler's PAI) to distinguish own bugs vs. community issues before committing fixes (learned 2026-02-25)
- Ivan prefers automatic pattern detection over manual selection — dislikes remembering tool names/options, wants PAI to infer context and apply solutions natively (learned 2026-02-26)
- Ivan delegates audits to 3-4 parallel agents by functional/dependency domain, then consolidates and verifies findings before fixing (learned 2026-02-26)
- Ivan systematically audits subsystems he identifies as problematic — finds one issue, then audits entire subsystem for related problems (learned 2026-02-26)
- Ivan conducts multi-pass audits with explicit criteria checklists (ISC) — verifies each criteria with grep/spot-checks before considering work complete (learned 2026-02-26)
- Ivan audits parallel code paths (template vs function) by building diffs immediately—catches bugs others miss (learned 2026-02-26)
- Ivan compresses PAI phases when time-budgeted—combines THINK+PLAN, uses inline scripts for rapid data validation (learned 2026-02-26)
- Ivan prefers parallel task execution — asks Navi to launch multiple independent agents simultaneously rather than sequential fixes (learned 2026-02-27)
- Ivan plans multi-phase validation: combat test skill → audit related skill (Telos) → fix issues → update documentation, not just point fixes (learned 2026-02-27)
- Ivan asks 'what did this give us' after major audit cycles — wants concrete impact assessment, not just completion (learned 2026-02-27)

---

## Predictive Model

| Request Pattern | Predicted Want | Confidence |
|----------------|---------------|------------|
| After completing a multi-level audit, Ivan will ask 'should we commit now or is there more work for next session?' to close the loop | To be refined | 60% |
| After fixing bugs in one skill (Telos), Ivan immediately asks to audit all other skills for similar issues | To be refined | 60% |

---

## Anti-Patterns (from observations)

### When Ivan brings data from previous sessions — verify against current state FIRST before acting, old analyses can be stale
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### Выполнение 3+ независимых задач последовательно вместо параллельного делегирования агентам — потеря времени в 3-5x. Всегда спавнить агентов для параллельной работы.
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26

### Ivan struggles with visual/interactive features (image insertion, text pasting in Kitty) — prefers text-based CLI explanations over live demos
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26

### Ivan discovers phantom file references through systematic audits, then maps them to real equivalents—reverse-engineer intent before deleting
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-27

### Parallel worktree agents on dirty main tree create reconciliation overhead — needs explicit merge strategy before spawning agents
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-27

### Ivan verifies Navi's research thoroughly before proceeding — catches incomplete data gathering (e.g., 'did you read the actual code?')
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-28


---

## Cross-Frame Connections

*To be discovered through cross-frame synthesis.*

---

## Evolution Log
- 2026-03-01: Frame created from workflow.json (21 observations)


- 2026-03-05: [anti-pattern] Frustrated with repeated index.lock failures
- 2026-03-05: [anti-pattern] Frustration over repeated failed attempts on same issue
- 2026-03-05: [anti-pattern] Frustrated by repeated failed attempts across sessions
- 2026-03-05: [anti-pattern] Frustrated — expected live event display not visible
- 2026-03-05: [principle] Strong approval — concise satisfaction with completed work