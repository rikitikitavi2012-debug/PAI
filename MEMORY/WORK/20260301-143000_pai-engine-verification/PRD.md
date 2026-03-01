---
task: Verify PAI 4.0.1 3-layer engine and analyze weak points
slug: 20260301-143000_pai-engine-verification
effort: extended
phase: complete
progress: 18/18
mode: algorithm
started: 2026-03-01T14:30:00+03:00
updated: 2026-03-01T14:30:00+03:00
---

## Context

PAI 4.0.1 introduced a 3-layer mode classification engine to fix the Algorithm activation regression
described in discussion #828 (Algorithm mode activated only ~9% of the time in v4.0 due to 75%
reduction in reinforcement density after compression from v3.0's 1,334-line SKILL.md to v4.0's 480 lines).

**Layer 1 — ModeClassifier.hook.ts:** Deterministic regex (UserPromptSubmit, position 0). Routes
greetings/ratings/thanks/acks → MINIMAL, everything else → ALGORITHM. Pure regex, <20ms, zero LLM.

**Layer 2 — Complexity Gate (CLAUDE.md lines 19-30):** LLM evaluates task complexity with full context.
YES (multi-step) → load Algorithm file. NO (simple) → downshift to NATIVE directly.

**Layer 3 — PAI/Algorithm/v3.5.0.md:** Loaded only on first ALGORITHM turn per session. ~54k token
savings over 10-turn session.

### Risks
- Complexity Gate is LLM-interpreted — can still misjudge (the exact problem #828 described)
- ModeClassifier patterns may miss edge cases (e.g., "привет, сделай X" with comma)
- ALGORITHM context injection text may not be strong enough to override template attraction bias
- Conditional Algorithm file loading ("only if not already in context") relies on LLM memory

## Criteria

- [x] ISC-1: ModeClassifier hook registered first in UserPromptSubmit array
- [x] ISC-2: ModeClassifier routes "привет" to MINIMAL mode
- [x] ISC-3: ModeClassifier routes "hello" to MINIMAL mode
- [x] ISC-4: ModeClassifier routes "9/10" to MINIMAL mode
- [x] ISC-5: ModeClassifier routes "спасибо" to MINIMAL mode
- [x] ISC-6: ModeClassifier routes "ok" to MINIMAL mode
- [x] ISC-7: ModeClassifier routes "отлично" to MINIMAL mode
- [x] ISC-8: ModeClassifier routes complex prompts to ALGORITHM mode
- [x] ISC-9: ModeClassifier does NOT route "ок, сделай X" as MINIMAL
- [x] ISC-10: ModeClassifier does NOT route "hello, please fix the bug" as MINIMAL
- [x] ISC-11: ALGORITHM context injection contains mandatory phase structure text
- [x] ISC-12: MINIMAL context injection contains explicit "MUST use MINIMAL" directive
- [x] ISC-13: Hook gracefully handles empty/malformed stdin without crashing
- [x] ISC-14: CLAUDE.md Complexity Gate section references correct Algorithm file path
- [x] ISC-15: CLAUDE.md conditional loading instruction present for Algorithm file
- [x] ISC-16: No other UserPromptSubmit hook can override ModeClassifier classification
- [x] ISC-17: Discussion #828 problem hypothesis matches our solution architecture
- [x] ISC-18: Pattern gap analysis identifies at least 3 untested edge cases

## Decisions

- Rating pattern misses space-only separator ("7/10 норм") — this is a BUG worth fixing
- 13 missing RU slang/informal patterns default safely to ALGORITHM — conservative by design
- Complexity Gate (Layer 2) is architecturally the same LLM-judgment problem #828 identified — potential future migration to deterministic heuristics in the hook

## Verification

### Test Matrix: 47/49 passed (95.9%)

**2 Bugs Found:**
1. `RATING_PATTERN` misses ratings with space-only comment separator: "7/10 норм", "8/10 хорошо", "9/10 great work" → classified ALGORITHM instead of MINIMAL. Root cause: regex requires `[–\-—:]` separator before comment text, but space-only comments are common.
2. `RATING_PATTERN` misses 3-digit numbers ("100") — `\d{1,2}` only matches 1-2 digits. Minor — "100" as standalone input is rare.

**13 Pattern Gaps Identified (safe — all default to ALGORITHM):**
- RU greetings: здарова, дратути, йо, доброй ночи, приветствую
- RU acks: лан, ладушки, годится, збс, пон
- RU thanks: сенк, благодарочка
- Note: these miss but classify as ALGORITHM which is safe (false negative not false positive)

### Architectural Analysis (First Principles):
- Layer 1 (ModeClassifier): Deterministic, reliable, solves #828 root cause ✅
- Layer 2 (Complexity Gate): Still LLM-interpreted — same class of problem as #828 but lower risk (downshift from ALGORITHM to NATIVE is less harmful than wrong mode selection)
- Layer 3 (Algorithm file): Conditional loading works but relies on LLM memory which degrades after /compact
- Key insight: Complexity Gate could be migrated to deterministic heuristics in the hook (word count, keyword detection, multi-sentence detection) for full determinism

### Static Analysis:
- Hook registration: position 0 in UserPromptSubmit ✅
- No competing mode injectors in other hooks ✅
- Graceful error handling: exit(0) on all failure paths ✅
- CLAUDE.md references correct Algorithm file path ✅
- Conditional loading instruction present ✅
