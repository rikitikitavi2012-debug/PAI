## Reflections
- 188 MB from 40 failures in 15 days = 3.6 TB/year was critical — gzip alone saved 54%
- transcript.jsonl is write-only data — CONTEXT.md has 95% of value, transcripts are forensic backup
- gzip -9 in-place is the simplest compression: 1 line change, no temp files, auto-deletes original

## Patterns
- Raw copies of large files (copyFileSync) need immediate compression — never store uncompressed
- Rotation needs rate-limiting (once/day) to avoid repeated work on every session start
- "Preserve behavioral rules forever, rotate raw data" is the right retention policy

## Actions
- FailureCapture.ts: gzip on write (1 line: spawnSync gzip -9)
- FailureRotation.ts: new tool with compress/delete/preserve lifecycle
- LoadContext: wired rotation with 24h rate-limit
- Cleaned 188→87 MB immediately
