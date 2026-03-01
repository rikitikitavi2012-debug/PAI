---
task: "Build ModeClassifier hook for PAI 4.0.1"
slug: "20260301-140358_mode-classifier-hook"
effort: Advanced
phase: complete
progress: 24/24
mode: ALGORITHM
started: "2026-03-01T14:03:58Z"
updated: "2026-03-01T14:03:58Z"
---

## Context

PAI v4.0 has a critical regression: Algorithm mode activates only ~9% of the time.
Root cause (per discussion #828 + jlacour-git analysis): template attraction bias in CLAUDE.md
causes LLM to pattern-match to NATIVE format over semantic instructions. MIT 2025 research confirms:
LLMs follow in-context format patterns over semantic instructions.

**Solution**: ModeClassifier hook on UserPromptSubmit. Deterministic regex — no LLM inference.
- Greetings / ratings / thanks / acks (EN + RU) → MINIMAL
- Everything else → ALGORITHM enforcement via additionalContext injection

Our version differs from jlacour's: full Russian/Cyrillic pattern coverage, PAI 4.0.1 structure,
uses our hook infrastructure patterns (Bun TS, lib/identity, stderr logging).

### Risks
- Pattern false positives: "ок, сделай X" must route to ALGORITHM (not ACK)
- UserPromptSubmit hook order matters: ModeClassifier must fire, RatingCapture still captures
- Length threshold: prompts starting with greeting but containing task → ALGORITHM
- additionalContext injection must produce valid JSON at all times

## Criteria

- [x] ISC-1: File `ModeClassifier.hook.ts` exists at `~/.claude/hooks/`
- [x] ISC-2: File is executable (chmod +x applied)
- [x] ISC-3: Hook registered in settings.json UserPromptSubmit (position 0, before others)
- [x] ISC-4: Hook exits 0 for malformed/empty JSON input (never crashes)
- [x] ISC-5: Empty or whitespace-only prompt → exits 0, no additionalContext output
- [x] ISC-6: English greetings (hi, hello, hey, gm, sup) → MINIMAL injection
- [x] ISC-7: Russian greetings (привет, здравствуй, добрый день) → MINIMAL injection
- [x] ISC-8: Explicit numeric ratings (9, 10, 9/10, 10/10) → MINIMAL injection
- [x] ISC-9: Russian rated comments (9/10 — отлично, 8 - хорошо) → MINIMAL injection
- [x] ISC-10: English thanks (thanks, thx, ty, cheers) → MINIMAL injection
- [x] ISC-11: Russian thanks (спасибо, спс, благодарю, пасиба) → MINIMAL injection
- [x] ISC-12: Russian acks (ок, понял, ясно, хорошо) → MINIMAL injection
- [x] ISC-13: English acks (ok, got it, sure, noted, cool) → MINIMAL injection
- [x] ISC-14: Prompt > 100 chars → always ALGORITHM regardless of content
- [x] ISC-15: "ок, сделай X" (ack + task) → ALGORITHM (not caught by ACK pattern)
- [x] ISC-16: Regular RU task request → ALGORITHM enforcement in additionalContext
- [x] ISC-17: Regular EN task request → ALGORITHM enforcement in additionalContext
- [x] ISC-18: additionalContext for ALGORITHM contains "You MUST use ALGORITHM mode"
- [x] ISC-19: additionalContext for MINIMAL contains "You MUST use MINIMAL mode"
- [x] ISC-20: additionalContext output is valid JSON (parseable)
- [x] ISC-21: Every classification logged to stderr (MINIMAL/ALGORITHM + matched pattern)
- [x] ISC-22: No API inference calls — pure regex, deterministic, executes <50ms
- [x] ISC-23: Hook does not block/suppress user prompt (exit 0 always)
- [x] ISC-24: Smoke test: 10 test inputs produce correct routing

## Decisions

## Verification
