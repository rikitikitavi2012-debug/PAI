---
task: "Close the Feedback Loop — make failures actionable"
slug: "20260302-feedback-loop"
effort: advanced
phase: complete
progress: 9/9
mode: algorithm
started: "2026-03-02T10:00:00-08:00"
updated: "2026-03-02T10:00:00-08:00"
---

## Context

L7 Feedback Loop scored 6/10 in audit — the weakest layer. The pipeline EXISTS (ratings → WisdomSync → FAILURES → LoadContext readback) but has 3 defects that make it decorative, not functional:

1. FailureCapture creates DESCRIPTIVE analysis ("what happened") but no PRESCRIPTIVE rules ("what to do differently")
2. loadFailurePatterns reads only dirname slugs, ignoring rich CONTEXT.md content
3. Threshold ≤3 means only 5 of 19 negative ratings trigger FailureCapture (rating 4 = 13 entries lost)

### Risks
- Adding inference call to FailureCapture adds latency — combine with existing description call
- Lowering threshold increases capture volume — FailureCapture already copies full transcript

## Criteria

- [x] ISC-1: FailureCapture generates AVOID/INSTEAD via single generateFailureAnalysis() inference call
- [x] ISC-2: CONTEXT.md includes "## Behavioral Rules" with AVOID + INSTEAD
- [x] ISC-3: FailureCapture threshold ≤3 → ≤4 (captures 4x more failures)
- [x] ISC-4: RatingCapture threshold ≤3 → ≤4 (both explicit line 402 and implicit line 520)
- [x] ISC-5: loadFailurePatterns reads AVOID/INSTEAD from CONTEXT.md
- [x] ISC-6: Injected format: "[date] AVOID: X → INSTEAD: Y"
- [x] ISC-7: Legacy captures fallback to slug format — tested with 2 existing captures
- [x] ISC-8: All 3 files pass bun build + HookHealthCheck 28/28 PASS
- [x] ISC-9: Existing 2 failure captures read correctly with slug fallback
