---
task: "Close the learning loop — active retrieval + LEARN.md readback + experiments aggregation"
slug: "20260316-043000_close-learning-loop"
effort: extended
phase: complete
progress: 20/20
mode: algorithm
started: 2026-03-16T04:30:00+03:00
updated: 2026-03-16T04:35:00+03:00
---

## Context

PAI generates 189 MB of learning data (LEARN.md, experiments.tsv, FAILURES, WISDOM) but consumes
only ~2 KB per session. Write:Read ratio is 94,000:1. Core problem: write-heavy, read-light.

Three disconnected data sources:
1. LEARN.md — enforced by LearnGate but content never read by any hook (8 files exist)
2. experiments.tsv — created during Autoresearch but orphaned, no consumer (4 files exist)
3. Algorithm OBSERVE — no rule to search for similar past PRDs before planning

Fix: close the loop by adding readback functions + active retrieval rule.

### Risks
- Context bloat: too much readback text eats context window
- Stale learnings: old LEARN.md insights may be outdated
- Performance: reading 200+ PRDs at session start = slow
- Over-engineering: complex aggregation vs simple readback

## Criteria

### Track 1 — LEARN.md Readback
- [x] ISC-1 [B]: loadLearnInsights() function exists in learning-readback.ts
- [x] ISC-2 [B]: Reads LEARN.md from 5 most recent PRDs with phase:complete
- [x] ISC-3 [B]: Extracts ## Reflections and ## Patterns sections only (not Actions)
- [x] ISC-4 [B]: Output compact: max 500 chars total, truncates per-file (actual: 428)
- [x] ISC-5 [B]: Returns null if no LEARN.md files found

### Track 2 — experiments.tsv Readback
- [x] ISC-6 [B]: loadExperimentPatterns() function exists in learning-readback.ts
- [x] ISC-7 [B]: Scans PRD dirs for experiments.tsv files
- [x] ISC-8 [B]: Extracts: total experiments, keep rate, best delta types
- [x] ISC-9 [B]: Output compact: max 300 chars, aggregated not per-file (actual: 271)
- [x] ISC-10 [B]: Returns null if no experiments.tsv found

### Track 3 — Wire into LoadContext
- [x] ISC-11 [B]: LoadContext calls loadLearnInsights() in learning readback section
- [x] ISC-12 [B]: LoadContext calls loadExperimentPatterns() in learning readback section
- [x] ISC-13 [B]: Both outputs appear in session start system-reminder
- [x] ISC-14 [B-fast]: LoadContext still executes under 500ms total (actual: 2ms for new functions)

### Track 4 — Active Retrieval in Algorithm OBSERVE
- [x] ISC-15 [B]: v4.0-alpha.md OBSERVE has rule: "search MEMORY/WORK for similar past PRDs"
- [x] ISC-16 [B]: Rule specifies: read LEARN.md of similar PRDs, apply insights to current planning
- [x] ISC-17 [B]: Rule is mechanical: keyword match on task description, not LLM judgment

### Track 5 — Performance Trend Feedback
- [x] ISC-18 [B]: When performance trend is "down", loadSignalTrends adds top failure pattern
- [x] ISC-19 [B]: Connects signal trend to failure patterns: "declining because: X"

### Anti-criteria
- [x] ISC-A1: No new npm dependencies added
- [x] ISC-A2: LoadContext total context injection stays under 4000 chars (actual: 3712)

## Decisions
- Read 5 most recent completed PRDs, not all 200+ — balances freshness vs completeness
- Aggregate experiments.tsv across all PRDs (not filtered) — 4 files is manageable
- Active retrieval is spec rule, not hook — agent does the search at OBSERVE time
- Performance decline correlation: show most recent FAILURES pattern, not computed correlation

## Verification
- All 20 ISC passed via automated test script
- New functions: 2ms combined (17ms cold start)
- Total learning context: 3712 chars (under 4000 limit)
- LEARN.md now consumed: 2 files read, insights injected
- experiments.tsv now consumed: 24 experiments, 42% keep rate visible
- Performance trend shows failure correlation when declining
