---
task: First-principles prioritization of post-MVP feature roadmap
slug: 20260309-fp-post-mvp-roadmap
effort: standard
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-09
updated: 2026-03-09
---

## Context

Ivan needs to prioritize 6 post-MVP features for the Timber Frame site. Constraints: solo entrepreneur, evening-only work during construction season (Apr-Nov), partner Viktor Schultz (TF master, SketchUp). Primary goal: convert site visitors into qualified leads. Current MVP: 6 pages + calculator with AI recommendation.

### Risks
- Building features that generate traffic but not leads (blog before capture)
- Spending limited evening hours on the configurator when calculator already works
- Missing the pre-season window (Mar-Apr) when buyers research
- Portfolio without sorted photos = worse than no portfolio

### Plan
First-principles decomposition of conversion equation: CONVERSION = Traffic x Trust x Capture. Map each feature to these fundamentals, identify hard constraints (capture mechanism, seasonal timing), reconstruct optimal sequence.

## Criteria

- [x] ISC-1: Each feature decomposed to fundamental purpose (traffic/trust/capture)
- [x] ISC-2: Hard vs soft constraints classified for each feature (7 constraints mapped)
- [x] ISC-3: Dependencies between features identified and mapped (dependency graph)
- [x] ISC-4: Each feature scored on conversion impact (zero-to-possible through low-incremental)
- [x] ISC-5: Each feature scored on implementation effort (1-2 evenings through 15-25 evenings)
- [x] ISC-6: Seasonal timing factored into priority (pre-season Mar-Apr window drives P1-P3)
- [x] ISC-7: Final priority sequence with rationale for each position (6 priorities with why)
- [x] ISC-8: Quick wins explicitly identified (4 items, 30min-2hrs each)
- [x] ISC-9: Persona alignment verified per feature (Andrey/Elena/Sergey mapped)
- [x] ISC-10: Anti-recommendations stated (3 things NOT to build next with reasons)

## Decisions

1. Contact Form + WhatsApp is Priority 1 because without capture, conversion = 0 (hard constraint)
2. Configurator is Priority 6 (last) because calculator already exists -- configurator is enhancement, not foundation
3. Blog ranked below SEO because blog without SEO prep won't rank
4. Portfolio depends on Ivan sorting photos -- non-dev prerequisite identified

## Verification

All 10 ISC criteria verified against the analysis output:
- ISC-1: Features mapped to Traffic/Trust/Capture table
- ISC-2: 7 constraints classified as Hard/Soft/Assumption with evidence
- ISC-3: Dependency map with arrows showing prerequisites
- ISC-4: Conversion impact rated per feature (infinity through low-incremental)
- ISC-5: Effort estimated in evenings per feature
- ISC-6: P1-P3 designed to ship within Mar-Apr pre-season window
- ISC-7: 6 priorities with "Why X" rationale blocks
- ISC-8: 4 quick wins identified (WhatsApp 30min, tap-to-call 15min, meta 2hrs, Schema 1hr)
- ISC-9: Each priority states which personas it serves
- ISC-10: 3 anti-recommendations with reasoning
