# Frame: Development Domain

## Meta
- **Domain:** development
- **Confidence:** 85%
- **Observation Count:** 75
- **Last Crystallized:** 2026-03-29
- **Source:** Reflection mining analysis (75 entries, 13 themes)

---

## Core Principles

### Автоматизация (скрипт) > разовое ручное действие — Ivan ценит инструменты [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### When model returns semantic field (sentiment, category) — trust and USE it, don't re-derive from summary text [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### When creating a tool similar to an existing one, read the existing analog FIRST — prevents interface/pattern mismatch bugs [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### Direct Anthropic API (fetch) is 40x faster than claude --print subprocess for background inference — always prefer API when key available [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-25

### Persistence through code, not prompts: when data must survive sessions, automatic hooks are the only reliable mechanism — prompt instructions for disk writes are architecturally unsound [CRYSTAL: 90%]
- **Confirmed:** 6 times (reflections analysis: 5 occurrences across Feb 2026)
- **Since:** 2026-02-25
- **Source:** Reflection mining 2026-03-29 — 75 entries analyzed

### Schema change → test update: при изменении YAML schema, grep тесты на удалённые поля и обновить [CRYSTAL: 85%]
- **Confirmed:** 2 times (ContentAnalysis version, Investigation triggers)
- **Since:** 2026-03-16

### Parallel agents = 3x speedup: 3-4 параллельных агента для batch операций (файлы, аудит, тесты) [CRYSTAL: 90%]
- **Confirmed:** 4 times (skill audit, system improvements, dead capabilities, workflow localization)
- **Since:** 2026-03-16

### JS \b regex doesn't match Cyrillic — use (?:^|\s) for Russian word boundaries [CRYSTAL: 90%]
- **Confirmed:** 1 time (ISCQualityGate)
- **Since:** 2026-03-16

### CLI tools > text edits: ISCManager, LearningRecall = детерминизм, скорость, надёжность [CRYSTAL: 85%]
- **Confirmed:** 2 times (ISCManager dogfooding, LearningRecall in Algorithm)
- **Since:** 2026-03-16

### Double-confirm anti-pattern: не дублировать проверки на разных уровнях (hooks + Claude Code ask) [CRYSTAL: 85%]
- **Confirmed:** 1 time (SecurityValidator confirmWrite + Claude Code ask → hook error)
- **Since:** 2026-03-16

### Test pollution ≠ code bugs: тесты проходят по отдельности, падают вместе = shared state, не regression [CRYSTAL: 85%]
- **Confirmed:** 1 time (76 failures in batch, 0 individual)
- **Since:** 2026-03-16

### Agent-as-Judge находит реальные системные баги при Extended+ верификации [CRYSTAL: 85%]
- **Confirmed:** 1 time (trust_level missing from frontmatter inventory — 3 locations needed update)
- **Since:** 2026-03-16
- **Rule:** Для Extended+ задач спавнить skeptical verification agent на 3-5 критических ISC. Особенно ценно для cross-reference проверок (field inventories, index files, routing tables).

### Parallel execution gate: 3+ независимых подзадачи = spawn parallel agents, не sequential execution [CRYSTAL: 90%]
- **Confirmed:** 12 times (reflections Feb 2026)
- **Since:** 2026-03-29
- **Source:** Reflection mining — most frequent pattern (12 occurrences in 75 entries)
- **Rule:** В PLAN phase: если ISC содержит 3+ независимых verify/build шага — auto-group в parallel batches. Для research: pre-load все search queries.

### Test with realistic conditions FIRST, not minimal/ideal inputs [CRYSTAL: 85%]
- **Confirmed:** 5 times (reflections Feb 2026)
- **Since:** 2026-03-29
- **Source:** Reflection mining — iterative debugging wastes 2-3x cycles
- **Rule:** В OBSERVE phase: mandatory REALISTIC_TEST requirement. Timeouts: measure at real load, set to 3x. Parsing: test with real-world output, not sanitized examples.

### Evidence-first ISC creation: build criteria from grep/read data, not prior session claims [CRYSTAL: 85%]
- **Confirmed:** 6 times (reflections Feb 2026)
- **Since:** 2026-03-29
- **Source:** Reflection mining — prevents chasing phantom bugs
- **Rule:** Before ISC creation: run broad grep/read sweep of target area. ISC criteria must cite exact file:line or grep output. Prior session bug lists = hypotheses until re-verified.

### Fix generators, not generated output: when auditing generated files, fix the script not the output [CRYSTAL: 85%]
- **Confirmed:** 5 times (reflections Feb 2026)
- **Since:** 2026-03-29
- **Source:** Reflection mining — bugs recur when generator is not fixed
- **Rule:** Add generator-detection gate: if file has generator comment or known generator script → flag and prioritize fixing generator. Audit checklist must include 'check template/generators'.

---

## Contextual Rules

- Ivan работает соло — корпоративные решения (Jenkins, Kubernetes) не предлагать (learned 2026-02-22)
- systemd user timers more reliable than cron for WSL2 periodic tasks (learned 2026-02-22)
- Ivan prefers comprehensive testing: loop mode + multi-agent + parallel workflows + commit results together (learned 2026-02-27)

---

## Predictive Model

| Request Pattern | Predicted Want | Confidence |
|----------------|---------------|------------|
| When finding one JSON parsing bug in Inference.ts, Ivan audits all 4 dependent tools (TELOSTracker, FailureCapture, WisdomExtractor, IntegrityMaintenance) | To be refined | 60% |
| After fixing templating bugs, Ivan asks to audit adjacent systems (e.g., after ComposeAgent.ts fix → checked DynamicAgent.hbs for same issues) | To be refined | 60% |
| After fixing one subsystem bug, Ivan requests comprehensive cross-reference checks (e.g., voice_id consistency across YAML) | To be refined | 60% |
| After completing a fix round, Ivan commits changes and explicitly requests a continuation prompt documenting remaining work items | To be refined | 60% |
| After completing a skill audit, Ivan immediately asks about upstream contribution — will likely follow fix-then-upstream workflow pattern | To be refined | 60% |
| After fixing phantom refs/placeholders, Ivan will ask for reflection on system improvements and gap analysis before next phase | To be refined | 60% |
| After creating migration plans, Ivan asks Navi to update all downstream artifacts (PRD, prompts, docs) to maintain consistency | To be refined | 60% |

---

## Anti-Patterns (from observations)

### Ivan silently ignores stderr in fire-and-forget processes — bugs hide for months; always surface raw output first
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-25

### Agents produce false alarms when given only line numbers—require exact code snippets in audit report format to reduce verification overhead
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26


---

## Cross-Frame Connections

*To be discovered through cross-frame synthesis.*

---

## Evolution Log
- 2026-03-01: Frame created from development.json (17 observations)
- 2026-03-29: Added 4 new core principles from reflection mining (75 entries, 13 themes analyzed)
  - Parallel execution gate (12 occurrences)
  - Test with realistic conditions first (5 occurrences)
  - Evidence-first ISC creation (6 occurrences)
  - Fix generators, not generated output (5 occurrences)
  - Updated "Persistence through code" confidence 85% → 90%


- 2026-03-06: [anti-pattern] Mixed feedback — appreciates progress but frustrated with bugs
- 2026-03-10: [anti-pattern] Frustrated — multiple critical bugs in navigator after merge
- 2026-03-14: [anti-pattern] Frustrated — new pages deployed but not accessible/visible
- 2026-03-14: [anti-pattern] Dissatisfied — promised updates not visible after deployment
- 2026-03-14: [anti-pattern] Frustrated — red errors appeared after deployment
- 2026-03-15: [anti-pattern] Frustrated by repeated hook errors after fixes
- 2026-03-15: [anti-pattern] Frustrated — hook errors persist despite claimed fix
- 2026-03-15: [anti-pattern] Correction: audit failed due to missing files
- 2026-03-16: [anti-pattern] Frustrated by repeated failure on persistent hook error
- 2026-03-16: [principle] Satisfied with Navi's debugging work, engaged and moving forward