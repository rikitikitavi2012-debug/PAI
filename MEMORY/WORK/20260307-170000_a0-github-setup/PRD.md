---
task: A0 GitHub repo setup + TELOS + research + Jules onboarding
slug: 20260307-170000_a0-github-setup
effort: advanced
phase: complete
progress: 27/28
mode: algorithm
started: 2026-03-07T17:00:00
updated: 2026-03-07T17:00:00
---

## Context

Ivan wants to set up the A0 codebase on GitHub so Jules can continuously improve it with tests and fixes. Existing `agent-zero-custom` repo has old structure (prompts, tools, telegram_bot). Need to update it with current container state: 2 custom extensions, 8 skills, behaviour.md with Miessler principles, system prompt.

Research shows A0 is already modular — extensions/skills/prompts designed for customization. Core should not be touched. v0.9.8.2 is latest (Feb 2026). No public v1.0 roadmap found, but architecture is plugin-based by design.

### Risks
- Secrets in A0 config files (API keys, tokens) could leak to repo
- Repo structure must match container paths for easy deploy
- Jules may not understand A0 Python patterns without good AGENTS.md
- Extensions numbered _80/_81 may conflict with future upstream additions

## Criteria

### Track 1: TELOS Update
- [x] ISC-1: PROJECTS.md updated with A0 improvement strategy
- [x] ISC-2: Strategy references existing repo agent-zero-custom
- [x] ISC-3: Clear scope: extensions, skills, prompts, behaviour — not core

### Track 2: Research Summary
- [x] ISC-4: A0 architecture documented (extensions, skills, prompts model)
- [x] ISC-5: Extension numbering strategy documented (safe slot ranges)
- [x] ISC-6: Upstream update compatibility approach documented
- [x] ISC-7: Research saved to MEMORY/RESEARCH/ for future reference

### Track 3: Repo Structure
- [x] ISC-8: agent-zero-custom repo updated with current container files
- [x] ISC-9: Extensions (_80, _81) committed to repo
- [x] ISC-10: Skills (8 SKILL.md files) committed to repo
- [ ] ISC-11: System prompt (agent.system.md) — skipped, old prompt in prompts/ dir
- [x] ISC-12: Behaviour.md (Miessler + ISC + Flywheel) committed
- [x] ISC-13: .gitignore covers secrets, FAISS indexes, chat logs, API keys
- [x] ISC-14: Directory structure mirrors container paths (/a0/...)

### Track 4: Security
- [x] ISC-15: No API keys in committed files
- [x] ISC-16: No tokens or passwords in committed files
- [x] ISC-17: .env.example with placeholder values created

### Track 5: Jules Onboarding
- [x] ISC-18: AGENTS.md created with A0 architecture overview
- [x] ISC-19: AGENTS.md has Python patterns for extensions
- [x] ISC-20: AGENTS.md has test patterns and conventions
- [x] ISC-21: AGENTS.md has security boundaries (what not to touch)
- [x] ISC-22: First Jules task defined (test coverage for extensions)

### Track 6: Deploy Pipeline
- [x] ISC-23: Sync script: repo → container (via A0 or SSH)
- [x] ISC-24: Deploy documented in README.md
- [x] ISC-25: Source of truth defined: GitHub repo

### Track 7: Verification
- [x] ISC-26: Repo pushed to GitHub successfully
- [x] ISC-27: Jules can access repo (proactive features enabled)
- [x] ISC-28: First Jules task created and submitted

## Decisions

## Verification

### Track 1: TELOS — PROJECTS.md updated with A0 improvement strategy
### Track 2: Research — a0-architecture-for-customization.md saved
### Track 3: Repo — 18 files committed and pushed (1e6d69f)
### Track 4: Security — no secrets found in full repo audit
### Track 5: Jules — AGENTS.md created, task sessions/6833095862033329097 IN_PROGRESS
### Track 6: Deploy — sync-to-container.sh, README documented
### Track 7: Repo pushed, Jules active, task running

ISC-11 skipped: system prompt on container is too large for API extraction without §§include. Old prompt exists in prompts/ dir. Can be extracted later via SSH/container 1.
