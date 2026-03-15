---
task: "FAILURES rotation — compress transcripts, rotate old, clean existing 188 MB"
slug: "20260316-050000_failures-rotation-cleanup"
effort: extended
phase: observe
progress: 0/18
mode: algorithm
started: 2026-03-16T05:00:00+03:00
updated: 2026-03-16T05:00:00+03:00
---

## Context

FAILURES directory: 188 MB from 40 failures in 15 days. Growth: 12.5 MB/day = 3.6 TB/year.
Root cause: transcript.jsonl copied raw (181 MB). CONTEXT.md has 95% of value (~5 KB each).
Rating threshold expanded ≤3 → ≤4, doubling capture volume.

### Risks
- Compressing transcripts could break readback (if anything reads .jsonl directly)
- Rotation could delete still-useful failure data
- Existing 188 MB cleanup needs to preserve CONTEXT.md + sentiment.json

## Criteria

### Fix 1 — Compress on Write
- [ ] ISC-1 [B]: FailureCapture.ts gzips transcript.jsonl → transcript.jsonl.gz after copy
- [ ] ISC-2 [B]: Original .jsonl deleted after successful gzip
- [ ] ISC-3 [B]: New failure capture produces .gz file (verified)
- [ ] ISC-4 [B]: CONTEXT.md, sentiment.json, tool-calls.json remain uncompressed

### Fix 2 — Rotation Script
- [ ] ISC-5 [B]: Script exists: PAI/Tools/FailureRotation.ts
- [ ] ISC-6 [B]: Compresses uncompressed transcript.jsonl files older than 7 days
- [ ] ISC-7 [B]: Deletes transcript files (gz or raw) older than 60 days
- [ ] ISC-8 [B]: Preserves CONTEXT.md + sentiment.json forever (behavioral rules)
- [ ] ISC-9 [B]: Logs rotation: X compressed, Y deleted, Z MB freed
- [ ] ISC-10 [B]: Can run as CLI: `bun FailureRotation.ts`

### Fix 3 — Clean Existing Bloat
- [ ] ISC-11 [B]: All existing transcript.jsonl files compressed to .gz
- [ ] ISC-12 [B]: Size reduced by >50% (188 MB → <94 MB)
- [ ] ISC-13 [B]: All CONTEXT.md files preserved intact

### Fix 4 — Wire Rotation to Cron
- [ ] ISC-14 [B]: LoadContext or existing cron calls FailureRotation on schedule
- [ ] ISC-15 [B]: Rotation runs max once per day (not every session)

### Fix 5 — Readback Compatibility
- [ ] ISC-16 [B]: loadFailurePatterns() still works (reads CONTEXT.md, not transcripts)
- [ ] ISC-17 [B]: LoadContext learning readback unaffected

### Anti-criteria
- [ ] ISC-A1: No CONTEXT.md files deleted or modified

## Decisions

## Verification
