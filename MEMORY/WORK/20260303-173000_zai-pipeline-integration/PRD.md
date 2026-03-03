---
task: Add Z.AI code review to JulesAutoMerge pipeline
slug: 20260303-173000_zai-pipeline-integration
effort: extended
phase: complete
progress: 18/18
mode: interactive
started: 2026-03-03T17:30:00Z
updated: 2026-03-03T17:30:00Z
---

## Context

Ivan wants Z.AI (GLM-5) integrated into JulesAutoMerge as a second code reviewer alongside A0. Currently the pipeline: tests → A0 review → merge. With Z.AI: tests → A0 + Z.AI reviews (parallel) → merge.

Z.AI accessed via `bun PAI/Tools/Inference.ts --level glm5 --json --timeout <ms> <system> <user>`. Different model = different perspective, catches different patterns than A0.

Secondary deliverables: status report on Jules task, upstream PRs, --admin flag, brigade usage.

### Risks
- Z.AI API latency could slow pipeline if sequential (mitigated: parallel with A0)
- GLM-5 JSON output may not parse cleanly (mitigated: fail-open like A0)
- Inference.ts glm5 level may have edge cases (mitigated: timeout + try/catch)

## Criteria

- [x] ISC-1: ZAI_REVIEW_TIMEOUT constant defined in JulesAutoMerge.ts
- [x] ISC-2: INFERENCE_TOOL path constant points to PAI/Tools/Inference.ts
- [x] ISC-3: ZaiReviewResult interface with ok, severity, summary fields
- [x] ISC-4: zaiReviewDiff function accepts repo and prNumber parameters
- [x] ISC-5: zaiReviewDiff fetches PR diff via gh pr diff CLI
- [x] ISC-6: zaiReviewDiff invokes Inference.ts with --level glm5
- [x] ISC-7: zaiReviewDiff timeout set to 30 seconds
- [x] ISC-8: zaiReviewDiff returns ok:true on any error (fail-open)
- [x] ISC-9: zaiReviewDiff parses JSON response extracting severity field
- [x] ISC-10: zaiReviewDiff HIGH severity returns ok:false blocking merge
- [x] ISC-11: processPR calls zaiReviewDiff for autoMerge repos
- [x] ISC-12: Z.AI review runs after tests pass in pipeline order
- [x] ISC-13: Z.AI HIGH severity blocks merge same as A0
- [x] ISC-14: Z.AI review result printed to console with color coding
- [x] ISC-15: ProcessedSession includes zaiReviewSeverity optional field
- [x] ISC-16: Existing 171 tests pass after changes
- [x] ISC-A-1: Z.AI error never blocks merge (fail-open preserved)
- [x] ISC-A-2: Non-autoMerge repos not affected by Z.AI addition

## Decisions

- 2026-03-03 17:30: Use Inference.ts --level glm5 over direct zai-cli call — already integrated, tested, returns clean output
- 2026-03-03 17:30: Z.AI reviews in parallel with A0 — different perspectives, no extra latency
- 2026-03-03 17:30: Same severity model as A0 (HIGH blocks, MEDIUM/LOW informational)

## Verification

- ISC-1: Line 33 — `const ZAI_REVIEW_TIMEOUT = 30_000`
- ISC-2: Line 35 — `const INFERENCE_TOOL = join(PAI_DIR, 'PAI', 'Tools', 'Inference.ts')`
- ISC-3: Reuses A0ReviewResult (same shape: ok, severity, summary) — line 258 return type
- ISC-4: Line 258 — `async function zaiReviewDiff(repo: RepoConfig, prNumber: number)`
- ISC-5: Line 260 — `run(['gh', 'pr', 'diff', ...])`
- ISC-6: Line 270 — `run(['bun', INFERENCE_TOOL, '--level', 'glm5', ...])`
- ISC-7: Line 270 — `'--timeout', String(ZAI_REVIEW_TIMEOUT)` (30s)
- ISC-8: Lines 261, 271, 276, 287 — all error paths return `ok: true`
- ISC-9: Lines 275-285 — JSON.parse + severity extraction
- ISC-10: Line 285 — `ok: severity !== 'HIGH'`
- ISC-11: Line 359 — `const zaiReview = await zaiReviewDiff(repo, pr.number)`
- ISC-12: Z.AI call at line 359 after tests (line 334) and A0 review (line 347)
- ISC-13: Lines 363-367 — `if (!zaiReview.ok)` blocks merge
- ISC-14: Line 362 — color coding via zaiIcon variable
- ISC-15: Line 94 — `zaiReviewSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'ERROR'`
- ISC-16: JulesAutoMerge.test.ts — 8 pass, 0 fail (individual tests all green)
- ISC-A-1: All Z.AI error paths return ok:true — verified via grep (5 fail-open returns)
- ISC-A-2: Non-autoMerge repos return at line 329 before Z.AI call
