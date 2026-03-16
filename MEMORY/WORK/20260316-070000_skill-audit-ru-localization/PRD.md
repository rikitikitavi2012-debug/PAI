---
task: "Audit 10 skills add Russian triggers and voice"
slug: 20260316-070000_skill-audit-ru-localization
effort: advanced
phase: execute
progress: 28/29
mode: interactive
started: 2026-03-16T07:00:00Z
updated: 2026-03-16T07:00:00Z
---

## Context

Ivan wants a full audit of all PAI skills for G10 (Аудит 11 скиллов по структуре v4). Key problems:
1. All skill triggers are English-only — Ivan communicates in Russian, skills may not activate
2. Voice notifications in 4 skills use English text — Ivan hears English
3. 6 skills missing voice notification sections entirely (v4 structure violation)
4. 2 skills have old-format `triggers:` YAML arrays (canonicalization needed)
5. No skills instruct subagents to respond in Russian

Additionally: stress-test Algorithm v4.0-alpha, identify bottlenecks and improvements.

### Risks
- Utilities description already 2020 chars (2x documented limit) — adding Russian makes it worse. Likely limit not enforced for skills (system prompt shows full text).
- Changing YAML frontmatter could break skill loading if formatting wrong
- Need to verify skills still activate after changes
- stdin sharing violations in UserPromptSubmit/SessionEnd/Stop — known issue, separate task
- ContentAnalysis and Investigation have old triggers: YAML arrays — must remove during canonicalization

## Criteria

### Domain A: Russian Triggers (10 skills)
- [x] ISC-1: Research description contains Russian trigger keywords
- [x] ISC-2: Thinking description contains Russian trigger keywords
- [x] ISC-3: ContentAnalysis description contains Russian trigger keywords
- [x] ISC-4: TFContent description contains Russian trigger keywords
- [x] ISC-5: YandexDirect description contains Russian trigger keywords
- [x] ISC-6: Media description contains Russian trigger keywords
- [x] ISC-7: Telos description contains Russian trigger keywords
- [x] ISC-8: Utilities description contains Russian trigger keywords
- [x] ISC-9: Investigation description contains Russian trigger keywords
- [x] ISC-10: Agents description contains Russian trigger keywords

### Domain B: Existing Voice → Russian (4 skills)
- [x] ISC-11: Research voice notification message is Russian
- [x] ISC-12: YandexDirect voice notification message is Russian
- [x] ISC-13: Telos voice notification message is Russian
- [x] ISC-14: Agents voice notification message is Russian

### Domain C: Missing Voice Sections Added (6 skills)
- [x] ISC-15: Thinking SKILL.md has Russian voice notification section
- [x] ISC-16: ContentAnalysis SKILL.md has Russian voice notification section
- [x] ISC-17: TFContent SKILL.md has Russian voice notification section
- [x] ISC-18: Media SKILL.md has Russian voice notification section
- [x] ISC-19: Utilities SKILL.md has Russian voice notification section
- [x] ISC-20: Investigation SKILL.md has Russian voice notification section

### Domain D: Canonicalization (2 skills)
- [x] ISC-21: ContentAnalysis YAML has no separate triggers array
- [x] ISC-22: Investigation YAML has no separate triggers array

### Domain E: Subagent Language Instructions
- [x] ISC-23: Research workflows instruct agents to respond in Russian
- [x] ISC-24: Agents ComposeAgent template includes Russian language instruction

### Domain F: System Checks
- [x] ISC-25: settings.json skill matchers reference valid skill paths
- [ ] ISC-26: No hooks stdin sharing violations detected (FAILED — see Verification)
- [x] ISC-27: All skill descriptions under 1024 character limit

### Anti-criteria
- [x] ISC-A-1: Anti: No existing English triggers removed from any skill
- [x] ISC-A-2: Anti: No skill functionality broken by changes

## Decisions

## Verification
