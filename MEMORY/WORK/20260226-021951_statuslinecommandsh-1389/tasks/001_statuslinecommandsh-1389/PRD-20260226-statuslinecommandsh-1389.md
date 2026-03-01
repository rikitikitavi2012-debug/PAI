---
prd: true
id: PRD-20260226-statuslinecommandsh-1389
status: COMPLETE
mode: interactive
effort_level: STANDARD
created: 2026-02-25
updated: 2026-02-26
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: VERIFY
failing_criteria: []
verification_summary: "54/54"
parent: null
children: []
---

# statuslinecommandsh 1389

> _To be populated: what this achieves and why it matters._

## STATUS

| What | State |
|------|-------|
| Progress | 54/54 criteria passing |
| Phase | DRAFT |
| Next action | OBSERVE phase — create ISC |
| Blocked by | nothing |

## CONTEXT

### Problem Space
  Аудит statusline-command.sh (1389 строк) — самый сложный скрипт PAI системы, никогда не проверялся.

  Что нужно:
  1. Прочитать statusline-command.sh и понять архитектуру — какие секции, что показывает
  2. Найти баги: hardcoded значения, мёртвый код, неработающие секции
  3. Найти узкие места: медленные операции, лишние вычисления
  4. Проверить что timezone, voice IDs, counts — всё читается из settings.json корректно
  5. Параллельно: transcript rotation — 118MB в projects/, 1588 JSONL файл

### Key Files
_To be populated during exploration._

### Constraints
_To be populated during OBSERVE/PLAN._

### Decisions Made
_None yet._

## PLAN

_To be populated during PLAN phase._

## IDEAL STATE CRITERIA (Verification Criteria)

- [x] ISC-C1: Weather fallback coordinates are St. Petersburg not San Francisco
- [x] ISC-C2: Comment "Convert to Pacific" removed, reads settings timezone
- [x] ISC-C3: Duplicate dir_name computation on lines 121 and 445 removed
- [x] ISC-C4: Dead functions time_until_reset and reset_clock_time removed
- [x] ISC-C5: Hardcoded fallback counts replaced with zeros in COUNTSEOF
- [x] ISC-C6: Settings.json read consolidated into single jq call where possible
- [x] ISC-C7: Transcript rotation script created and saves old transcripts
- [x] ISC-C8: CORE directory assessed with clear recommendation documented
- [x] ISC-C1: PROJECTS_DIR default matches actual lowercase projects directory path
- [x] ISC-C2: Parallel worker processes all assigned criteria not just first
- [x] ISC-C3: Legacy sla naming documented, no-break decision recorded in assessment
- [x] ISC-C4: All CLI subcommands verified working with actual execution
- [x] ISC-C5: Architecture assessment documented with findings and recommendations
- [x] ISC-C1: All 13 agent voiceId fields contain valid voice IDs not placeholders
- [x] ISC-C2: No agent references outdated paths, models, or deprecated APIs
- [x] ISC-C3: UpdateCounts macOS Keychain call gracefully fails on Linux WSL
- [x] ISC-C4: All seven handlers exit gracefully without throwing on error paths
- [x] ISC-C5: DocCrossRefIntegrity cooldown and throttle work correctly
- [x] ISC-C6: No handler has hardcoded voice IDs, paths, or API keys
- [x] ISC-C1: Statusline full render completes under 500ms with warm cache
- [x] ISC-C2: Statusline cold-start render completes under 2000ms without errors
- [x] ISC-C3: Statusline parallel prefetch jobs all complete without zombie processes
- [x] ISC-C4: Loop mode with -a 2 creates separate agent per criterion
- [x] ISC-C5: All test PRD criteria marked passing after loop mode completes
- [x] ISC-C1: AI Steering Rule enforces agent delegation for 3+ independent tracks
- [x] ISC-C2: Algorithm OBSERVE capability audit enforces minimum agent count by effort
- [x] ISC-C3: Algorithm reflection captures agent delegation metric per session
- [x] ISC-C4: Wisdom frame captures anti-pattern solo-execution-at-scale
- [x] ISC-C1: All hooks/lib/ files have proper error handling with try/catch
- [x] ISC-C2: No hardcoded API keys, voice IDs, or secrets in hooks/lib/
- [x] ISC-C3: No deprecated paths or macOS-only assumptions in hooks/lib/
- [x] ISC-C4: All file I/O in hooks/lib/ uses safe read/write patterns
- [x] ISC-C5: No dead code or unused exports in hooks/lib/ files
- [x] ISC-C6: algorithm-state.ts state machine handles all edge cases correctly
- [x] ISC-C7: change-detection.ts accurately detects file modifications and skill changes
- [x] ISC-C8: All bugs found during audit are documented and fixed
- [x] ISC-C1: All 33 Tools/ files have proper error handling on I/O and JSON.parse
- [x] ISC-C2: No hardcoded API keys, voice IDs, or secrets in Tools/
- [x] ISC-C3: No deprecated paths or macOS-only code without Linux guards
- [x] ISC-C4: Inference.ts JSON parsing handles all edge cases correctly
- [x] ISC-C5: Learning pipeline tools write to correct MEMORY/ subdirectories
- [x] ISC-C6: IntegrityMaintenance.ts handles concurrent execution safely
- [x] ISC-C7: All Inference.ts callers handle timeout and stderr failures gracefully
- [x] ISC-C8: All bugs found during audit are documented and fixed
- [x] ISC-A1: No functionality broken by statusline edits confirmed by test
- [x] ISC-A2: No active features removed, only dead code eliminated
- [x] ISC-A1: No existing working loop mode functionality broken by changes
- [x] ISC-A2: No accidental PRD state mutations from audit testing commands
- [x] ISC-A1: No working handler or agent functionality broken by audit changes
- [x] ISC-A1: No existing PRD files modified or corrupted by test runs
- [x] ISC-A2: No orphaned claude processes after loop mode test completes
- [x] ISC-A1: No existing steering rules or algorithm behavior broken by changes
- [x] ISC-A1: No existing hook functionality broken by any fixes applied
- [x] ISC-A1: No existing tool functionality broken by any applied fixes

## DECISIONS

_Non-obvious technical decisions logged here during BUILD/EXECUTE._

## LOG

_Session entries appended during LEARN phase._
