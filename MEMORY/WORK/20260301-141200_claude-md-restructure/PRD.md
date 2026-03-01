---
task: "Restructure CLAUDE.md — ALGORITHM first, remove NATIVE default"
slug: "20260301-141200_claude-md-restructure"
effort: Standard
phase: complete
progress: 10/10
mode: ALGORITHM
started: "2026-03-01T14:12:00Z"
updated: "2026-03-01T14:12:00Z"
---

## Context

CLAUDE.md currently lists NATIVE mode first → template attraction bias (MIT 2025).
LLM pattern-matches to whichever format appears first in context.
ModeClassifier hook (just built) now handles deterministic classification.
CLAUDE.md needs to reflect this: ALGORITHM is primary, NATIVE is downshift only.

### Risks
- Removing classify logic from CLAUDE.md could confuse subagents — must keep note
- File must stay < 80 lines (PAI best practice)

## Criteria

- [x] ISC-1: ALGORITHM section appears first (before NATIVE) in the document
- [x] ISC-2: ALGORITHM labeled "DEFAULT" in heading or FOR line
- [x] ISC-3: NATIVE labeled "DOWNSHIFT ONLY" — not the default
- [x] ISC-4: Opening paragraph acknowledges ModeClassifier hook handles classification
- [x] ISC-5: "classify and select a mode" language removed — hook does this now
- [x] ISC-6: Complexity Gate mentioned as the NATIVE downshift mechanism
- [x] ISC-7: Subagents → NATIVE directive preserved
- [x] ISC-8: MINIMAL section preserved with its template intact
- [x] ISC-9: Critical Rules section preserved
- [x] ISC-10: File is ≤ 80 lines

## Decisions

## Verification
