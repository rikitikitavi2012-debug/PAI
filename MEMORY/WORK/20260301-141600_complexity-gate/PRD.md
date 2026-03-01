---
task: "Complexity Gate + conditional Algorithm file read in CLAUDE.md"
slug: "20260301-141600_complexity-gate"
effort: Standard
phase: complete
progress: 12/12
mode: ALGORITHM
started: "2026-03-01T14:16:00Z"
updated: "2026-03-01T14:16:00Z"
---

## Context

ModeClassifier hook (83bf282) routes ALGORITHM vs MINIMAL deterministically.
But ALGORITHM requests still always read PAI/Algorithm/v3.5.0.md — even for simple ones.
The Complexity Gate adds a second evaluation layer INSIDE CLAUDE.md, before file read:
"Does this task actually need the full Algorithm?" If NO → skip file, go NATIVE directly.
Conditional reading: file only loaded on first ALGORITHM turn, not re-read each turn.

Per jlacour analysis: saves ~54,000 tokens over 10-turn session.

### Risks
- Gate instruction is LLM-evaluated — can still be ignored if context is noisy
- "Already in context" check relies on LLM memory — best-effort, not guaranteed
- File must stay ≤ 80 lines

## Criteria

- [x] ISC-1: Complexity Gate section exists in ALGORITHM MODE before any file read instruction
- [x] ISC-2: Gate asks explicitly: "multiple steps, files, investigation, planning, or verification?"
- [x] ISC-3: YES path has voice curl with Russian message "Алгоритм подтверждён"
- [x] ISC-4: YES path has conditional read — "only if not already in context this session"
- [x] ISC-5: YES path preserves "follow that file exactly"
- [x] ISC-6: NO path has voice curl with Russian message "Задача простая"
- [x] ISC-7: NO path says "Output NATIVE format. Do not read the Algorithm file."
- [x] ISC-8: Old "MANDATORY FIRST ACTION: Read..." unconditional instruction removed
- [x] ISC-9: ALGORITHM section still first, all prior structural elements intact
- [x] ISC-10: MINIMAL template intact, Critical Rules intact, Context Routing intact
- [x] ISC-11: File ≤ 80 lines
- [x] ISC-12: Voice ID correct (fTtv3eikoepIosk8dTZ5) in both Gate voice curls

## Decisions

## Verification
