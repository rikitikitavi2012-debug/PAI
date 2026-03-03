---
task: "Hook ROI audit — identify and act on low-value hooks"
slug: 20260302-233000_hook-roi-audit
effort: standard
phase: verify
progress: 8/8
mode: interactive
started: 2026-03-02T23:30:00Z
updated: 2026-03-02T23:35:00Z
---

## Context

Audit of all 30 PAI hooks to determine which provide real workflow value vs cosmetic polish. Triggered by previous session noting 30 hooks is substantial maintenance surface.

### Findings

**Event distribution (273 total events):**
- PRDSync: 113 (41%) — NOW FIXED with change detection
- VoiceCompletion: 56 (20%) — legitimate voice events
- WorktreeCreate: 41 (15%) — legitimate agent spawns
- PostCompactRecovery: 28 (10%) — legitimate context recovery
- EventLogger: 18 (7%) — agent lifecycle tracking
- SessionCleanup: 8 (3%) — session lifecycle
- Other: 9 (4%) — ratings, compaction, etc.

**Hook tiers by value:**
- CRITICAL (6): WorktreeCreate, WorktreeRemove, LoadContext, ModeClassifier, SecurityValidator, AutoWorkCreation
- HIGH (5): UpdateTabTitle, AlgorithmTracker, PRDSync, VoiceCompletion, PostCompactRecovery
- MEDIUM (10): EventLogger, SessionAutoName, RatingCapture, KittyEnvPersist, LastResponseCache, PreCompact, SessionCleanup, WisdomSync, WorkCompletionLearning, AgentExecutionGuard
- LOW (6): SkillGuard, UpdateCounts, RelationshipMemory, StartupGreeting, DocIntegrity, IntegrityCheck
- COSMETIC (3): ResponseTabReset, SetQuestionTab, QuestionAnswered

**Cosmetic tab-state hooks (SAFE to remove):**
- ResponseTabReset — resets tab title at Stop. Without it: stale title, no data loss.
- SetQuestionTab — teal tab on AskUserQuestion. Without it: no visual signal, questions still work.
- QuestionAnswered — restores tab from teal. Without it: tab stays teal, cosmetic only.

**Cost of keeping all 3:** <20ms combined per session. Zero persistent data.
**Cost of removing all 3:** Lose tab state machine (working→question→working→done).

### Risks
- Removing tab hooks changes familiar visual feedback pattern
- 3 hooks at <20ms is negligible overhead

## Criteria

- [x] ISC-1: All 30 hooks categorized by value tier
- [x] ISC-2: Event frequency analyzed per source
- [x] ISC-3: Removal risk assessed for each hook
- [x] ISC-4: Cosmetic hooks identified with evidence
- [x] ISC-5: No duplicated functionality found between hooks
- [x] ISC-6: EventLogger consolidation verified efficient
- [x] ISC-7: Critical hooks identified and marked as untouchable
- [x] ISC-8: Actionable recommendation provided

## Decisions

- 2026-03-02: All 30 hooks justified. 3 cosmetic tab hooks are only candidates for removal but cost is negligible.

## Verification

- ISC-1: 5-tier classification (CRITICAL/HIGH/MEDIUM/LOW/COSMETIC) applied to all 30 hooks
- ISC-2: events.jsonl parsed — 273 events across 9 active sources, 23 hooks silent (work by design)
- ISC-3: Remove risk rated SAFE/LOW/MEDIUM/HIGH/CRITICAL for each hook
- ISC-4: ResponseTabReset, SetQuestionTab, QuestionAnswered — zero persistent data, <20ms each
- ISC-5: Tab hooks handle different states (not duplicates). Learning pipeline is sequential (not redundant).
- ISC-6: EventLogger routing table (3 handlers, 27 lines) confirmed efficient vs 3 separate hooks
- ISC-7: 6 CRITICAL hooks marked — removal would break agent spawning, context, security, mode routing
- ISC-8: Recommendation: keep all 30, no action needed
