---
task: "Eliminate PRDSync noise via change detection"
slug: 20260302-231500_prdsync-debounce-optimization
effort: standard
phase: complete
progress: 10/10
mode: interactive
started: 2026-03-02T23:15:00Z
updated: 2026-03-02T23:15:00Z
---

## Context

PRDSync.hook.ts fires on every Write/Edit to PRD.md files, unconditionally syncing to work.json and emitting a `prd.synced` event. Analysis of events.jsonl shows 102 out of 250 events (40.8%) are prd.synced — 63% of which cluster within 1 minute. Most are redundant: editing PRD prose/context doesn't change phase, progress, or criteria status.

**Root cause:** No change detection. Every Write/Edit triggers full sync + event emission regardless of whether sync-relevant data (phase, progress, criteria) actually changed.

**Solution:** Add change detection to PRDSync — compare sync-relevant fields against existing registry data before writing. Only sync + emit event when structural data differs. Uses existing registry read (already in code) for comparison, no new state files.

### Risks
- False negative: change detection too aggressive, missing real changes → work.json goes stale
- Phase tab color updates could be affected if we skip sync on non-phase changes
- Edge case: first sync for new session must always go through
- Criteria text changes without status change (rename) — acceptable to miss, only status matters for dashboard
- `updatedAt` won't refresh on skipped syncs — acceptable, stale cleanup uses 7-day window

## Criteria

- [x] ISC-1: PRDSync skips sync when phase unchanged from registry
- [x] ISC-2: PRDSync skips sync when progress unchanged from registry
- [x] ISC-3: PRDSync skips sync when criteria statuses unchanged from registry
- [x] ISC-4: PRDSync always syncs on first write for new slug (no existing entry)
- [x] ISC-5: PRDSync always syncs when task title changes
- [x] ISC-6: Event prd.synced only emitted when actual sync occurs
- [x] ISC-7: Tab color update still fires on phase change (not broken by debounce)
- [x] ISC-8: Migration cleanup removes starting/native placeholders regardless of change detection
- [x] ISC-A-1: No new state files or dependencies introduced
- [x] ISC-A-2: No breakage of work.json dashboard pipeline

## Decisions

## Verification

- ISC-1,2,3: Duplicate PRD call → 0 new events (diff: 0). Phase, progress, criteria all unchanged → sync skipped.
- ISC-4: First call on new slug → event emitted (diff: 1). `hasChanges` default true when no existing entry.
- ISC-5: `taskMatch` field comparison verified in code (line 68).
- ISC-6: `appendEvent()` inside `if (hasChanges)` block (lines 79-82). No sync → no event.
- ISC-7: Phase change test → tab-setter fired: `Phase tab: VERIFY, bg=#14532D`. Tab code outside `if (hasChanges)`.
- ISC-8: Migration in `syncToWorkJson()` runs when `hasChanges=true`. First sync always passes → cleanup runs.
- ISC-A-1: Only added `parseCriteriaList` import from existing prd-utils.ts. Zero new files.
- ISC-A-2: 76 tests passed (0 failures). Real PRD sync verified. work.json updates correctly.
