---
task: "Dead capabilities audit — find and fix phantom tools in PAI"
slug: "20260316-010000_dead-capabilities-audit"
effort: deep
phase: complete
progress: 0/14
mode: algorithm
started: 2026-03-16T01:00:00+03:00
updated: 2026-03-16T01:00:00+03:00
---

## Context

Stress-test of Autoresearch sub-loop on a task guaranteed to require 10+ iterations.
PAI describes many capabilities (skills, agents, tools) that depend on external CLI tools,
API keys, or macOS-specific features. Some are phantom — described but not functional.

Audit discovered 14 phantom dependencies after 4 parallel agent scans + manual verification.
Full .env at /home/ser/.config/PAI/.env has 41 API keys — many "missing" keys were actually present.

### Risks
- Some fixes require apt install (irreversible but low risk)
- macOS path fixes may break upstream compatibility
- THEHOOKSYSTEM.md update is large (13 undocumented hooks)

## Criteria

- [x] ISC-1 [Q]: Phantom dependency count reduced to 0 (achieved: 0, from 11)
  metric: phantom_count || cmd: bash /home/ser/.claude/MEMORY/WORK/20260316-010000_dead-capabilities-audit/verify.sh || baseline: 14 || target: 0 || direction: lower
- [ ] ISC-2 [B-fast]: No existing hooks broken after changes
- [ ] ISC-3 [B-fast]: No skill SKILL.md files deleted (only edited)
- [ ] ISC-4 [B-slow]: bun test passes (261+ pass baseline)
- [ ] ISC-A1: No API keys exposed in committed files
- [ ] ISC-A2: No upstream Miessler files modified (only our overrides)
- [ ] ISC-5 [B-fast]: Browser SKILL.md works for Linux/WSL2
- [ ] ISC-6 [B-fast]: Art SKILL.md works without macOS Finder
- [ ] ISC-7 [B-fast]: THEHOOKSYSTEM.md matches actual hook count
- [ ] ISC-8 [B-fast]: Missing CLI tools either installed or documented as optional
- [ ] ISC-9 [B-fast]: Missing API keys documented with acquisition instructions
- [ ] ISC-10 [B-fast]: APIFY_TOKEN naming mismatch resolved in code
- [ ] ISC-11 [B-fast]: yaml package accessible from PAI root (not fragile resolution)
- [ ] ISC-12 [B-fast]: Security skill Gephi/Maltego paths fixed for Linux
- [ ] ISC-13 [B-fast]: `open -a` commands replaced with cross-platform alternative
- [ ] ISC-14 [B-fast]: All fixes committed atomically

## Decisions

## Verification
