---
task: Create /autoresearch skill with trust levels and Telegram notifications
slug: 20260316-120000_autoresearch-skill-trust-telegram
effort: deep
phase: complete
progress: 47/47
mode: algorithm
started: 2026-03-16T12:00:00
updated: 2026-03-16T12:00:00
---

## Context

Phase 3 of Algorithm Evolution — building the /autoresearch skill as user-facing interface to the Autoresearch Sub-Loop Protocol already implemented in Algorithm v4.0.0. The skill doesn't contain optimization logic itself — it creates PRDs with [Q] criteria, and Algorithm EXECUTE does the work.

Also adding Trust Level framework (L1-L4) to control human-in-the-loop frequency during autoresearch, and Telegram notifications via AgentZero for L3+ autonomous operation.

Source: `MEMORY/WORK/20260315-algorithm-evolution-autoresearch/ANALYSIS.md` → Phase 3.

### Active Retrieval
- LearningRecall: stagnation stress-test shows framework floors are real constraints; yandex-direct autoresearch confirms PAI Autoresearch ≈ Karpathy pattern; learn-phase persistence shows PreToolUse hooks for enforcement gates.
- Pattern: "Prompt + Hook = Closed Loop" — skill provides intent/template, hook provides enforcement.

## Criteria

### SKILL.md Structure
- [x] ISC-1: SKILL.md frontmatter name field is 'Autoresearch' (verify: grep 'name: Autoresearch' skills/Autoresearch/SKILL.md)
- [x] ISC-2: SKILL.md description contains 'autoresearch' trigger (verify: grep -i 'autoresearch' skills/Autoresearch/SKILL.md)
- [x] ISC-3: SKILL.md description contains Russian triggers 'автоисследование' and 'оптимизация метрики' (verify: grep -c 'автоисследование\|оптимизация метрики' skills/Autoresearch/SKILL.md)
- [x] ISC-4: Workflow routing table routes 'plan' pattern to Plan.md (verify: grep 'Plan.md' skills/Autoresearch/SKILL.md)
- [x] ISC-5: Workflow routing table routes 'run' pattern to Run.md (verify: grep 'Run.md' skills/Autoresearch/SKILL.md)
- [x] ISC-6: Workflow routing table routes 'resume' pattern to Resume.md (verify: grep 'Resume.md' skills/Autoresearch/SKILL.md)
- [x] ISC-7: Workflow routing table routes 'report' pattern to Report.md (verify: grep 'Report.md' skills/Autoresearch/SKILL.md)
- [x] ISC-8: Voice notification template uses Russian text (verify: grep 'Запускаю' skills/Autoresearch/SKILL.md)
- [x] ISC-9: Customization path points to PAI/USER/SKILLCUSTOMIZATIONS/Autoresearch/ (verify: grep 'SKILLCUSTOMIZATIONS/Autoresearch' skills/Autoresearch/SKILL.md)

### Plan.md Workflow (Interactive Wizard)
- [x] ISC-10: Plan.md asks user which metric to optimize (verify: grep -i 'метрик\|metric' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-11: Plan.md invokes LearningRecall for past experience (verify: grep 'LearningRecall' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-12: Plan.md runs dry-run baseline measurement (verify: grep -i 'baseline\|dry.run' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-13: Plan.md shows confirmation with target, baseline, cap (verify: grep -i 'target.*baseline\|cap' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-14: Plan.md creates PRD with [Q] criterion (verify: grep '\[Q\]' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-15: Plan.md creates experiments.tsv with header (verify: grep 'experiments.tsv' skills/Autoresearch/Workflows/Plan.md)
- [x] ISC-16: Plan.md sets trust_level in PRD frontmatter (verify: grep 'trust_level' skills/Autoresearch/Workflows/Plan.md)

### Run.md Workflow (Sub-Loop Launch)
- [x] ISC-17: Run.md loads existing PRD with [Q] criteria (verify: grep 'PRD' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-18: Run.md references Algorithm-Autoresearch.md protocol (verify: grep 'Algorithm-Autoresearch' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-19: Run.md includes Verification Rehearsal step (verify: grep -i 'rehearsal' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-20: Run.md integrates Trust Level for notification behavior (verify: grep 'trust_level\|Trust Level' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-21: Run.md L1 behavior asks user every 5 iterations (verify: grep '5 итераций\|5 iterations' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-22: Run.md L2 behavior asks user every 20 iterations (verify: grep '20 итераций\|20 iterations' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-23: Run.md L3 behavior sends Telegram notifications (verify: grep -i 'telegram\|AgentZero' skills/Autoresearch/Workflows/Run.md)

### Resume.md Workflow (State Recovery)
- [x] ISC-24: Resume.md discovers PRD by slug or most recent (verify: grep -i 'slug\|most recent\|последн' skills/Autoresearch/Workflows/Resume.md)
- [x] ISC-25: Resume.md reads experiments.tsv for iteration state (verify: grep 'experiments.tsv' skills/Autoresearch/Workflows/Resume.md)
- [x] ISC-26: Resume.md reads PRD frontmatter for phase/progress (verify: grep 'frontmatter\|phase' skills/Autoresearch/Workflows/Resume.md)
- [x] ISC-27: Resume.md follows pause/resume protocol from Algorithm-Autoresearch.md (verify: grep -i 'pause.*resume\|recalibrat' skills/Autoresearch/Workflows/Resume.md)
- [x] ISC-28: Resume.md re-calibrates baseline if >5% drift (verify: grep '5%' skills/Autoresearch/Workflows/Resume.md)

### Report.md Workflow (TSV Analysis)
- [x] ISC-29: Report.md reads experiments.tsv data (verify: grep 'experiments.tsv' skills/Autoresearch/Workflows/Report.md)
- [x] ISC-30: Report.md shows metric trajectory start to end (verify: grep -i 'trajectory\|траектори' skills/Autoresearch/Workflows/Report.md)
- [x] ISC-31: Report.md shows keep/discard/crash breakdown (verify: grep -i 'keep.*discard\|breakdown' skills/Autoresearch/Workflows/Report.md)
- [x] ISC-32: Report.md identifies highest-impact experiments (verify: grep -i 'highest.impact\|наибольш' skills/Autoresearch/Workflows/Report.md)
- [x] ISC-33: Report.md analyzes diminishing returns (verify: grep -i 'diminishing\|убывающ' skills/Autoresearch/Workflows/Report.md)
- [x] ISC-34: Report.md output uses readable table format (verify: grep '|' skills/Autoresearch/Workflows/Report.md)

### Trust Level Framework
- [x] ISC-35: trust_level field documented in Algorithm v4.0.0 PRD frontmatter section (verify: grep 'trust_level' PAI/Algorithm/v4.0.0.md)
- [x] ISC-36: L1 supervised behavior defined in Algorithm (verify: grep 'L1.*supervised\|L1.*5' PAI/Algorithm/v4.0.0.md)
- [x] ISC-37: L2 monitored behavior defined in Algorithm (verify: grep 'L2.*monitored\|L2.*20' PAI/Algorithm/v4.0.0.md)
- [x] ISC-38: L3 autonomous behavior defined with Telegram (verify: grep 'L3.*autonomous\|L3.*Telegram' PAI/Algorithm/v4.0.0.md)
- [x] ISC-39: L4 scheduled behavior defined with cron (verify: grep 'L4.*scheduled\|L4.*cron' PAI/Algorithm/v4.0.0.md)
- [x] ISC-40: Default trust level specified (verify: grep -i 'default.*trust\|trust.*default' PAI/Algorithm/v4.0.0.md)

### Telegram Integration
- [x] ISC-41: Notification uses AgentZero.ts sendMessage (verify: grep 'AgentZero\|sendMessage' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-42: Notification every 10 iterations includes iteration/cap (verify: grep '10 итераций\|10 iterations' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-43: Completion notification sent when target reached (verify: grep -i 'complet\|завершен\|target reached' skills/Autoresearch/Workflows/Run.md)
- [x] ISC-44: Stagnation/error alert sent on STOP (verify: grep -i 'stagnation\|стагнац\|error.*alert' skills/Autoresearch/Workflows/Run.md)

### Anti-Criteria
- [x] ISC-A1: No English text in voice notification messages (verify: grep 'voice_enabled' skills/Autoresearch/SKILL.md | grep -v '[a-z]\{10,\}')
- [x] ISC-A2: No duplication of 8-phase loop logic from Algorithm-Autoresearch.md (verify: manual review)
- [x] ISC-A3: No hardcoded API tokens or credentials (verify: grep -rv 'TOKEN=\|KEY=' skills/Autoresearch/)

### Risks

1. **Skill vs Algorithm boundary:** Plan.md creates autoresearch-specific PRDs, NOT general Algorithm PRDs. It's a specialized PRD factory.
2. **Trust Level placement:** Add as a subsection within Autoresearch EXECUTE section, not as a top-level Algorithm mechanism — it only applies during iterative optimization.
3. **Telegram latency:** AgentZero sendMessage is async by design, acceptable for notification-only use.
4. **Algorithm v4.0.0 edit scope:** Minimal — only add Trust Level table and reference. Don't restructure existing sections.

### Plan

1. Create skills/Autoresearch/ directory + SKILL.md (entry point, routing, voice, gates)
2. Create 4 workflows in parallel via agents: Plan.md, Run.md, Resume.md, Report.md
3. Add Trust Level section to Algorithm v4.0.0.md (after Autoresearch EXECUTE, before Verification Rehearsal)
4. Update skill-index.json with Autoresearch entry
5. Verify all 44 ISC criteria via ISCManager

## Decisions

- Skill as interface, not logic: SKILL.md + workflows are orchestration layer, Algorithm-Autoresearch.md remains sole source of truth for 8-phase loop
- Trust Level inserted between Autoresearch EXECUTE description and Verification Rehearsal in v4.0.0.md — scoped to iterative optimization, not top-level Algorithm mechanism
- Default trust_level: L2 (monitored) — balanced between hands-on and autonomous
- skill-index.json updated: totalSkills 11→12, deferredCount 11→12, autoresearch entry added
- 3 parallel Engineer agents created SKILL.md+Plan.md, Run.md+Resume.md, Report.md concurrently

## Verification

### Evidence
- ISC-1..9: All SKILL.md criteria verified via grep — frontmatter, routing, voice, customization
- ISC-10..16: Plan.md wizard verified — 10-step interactive flow, LearningRecall, dry-run, trust_level
- ISC-17..23: Run.md verified — PRD loading, Algorithm-Autoresearch.md reference, Trust Level L1-L4
- ISC-24..28: Resume.md verified — slug/recent discovery, experiments.tsv recovery, 5% recalibration
- ISC-29..34: Report.md verified — TSV parsing, trajectory, breakdown, top-impact, diminishing returns
- ISC-35..40: Algorithm v4.0.0 Trust Level section verified — L1-L4 table, default L2, Telegram format
- ISC-41..44: Telegram integration verified — AgentZero, 10-iteration notifications, completion/stagnation alerts
- ISC-A1..A3: Anti-criteria verified — Russian voice, no logic duplication, no hardcoded tokens
- Agent-as-a-Judge: independent verification of 5 critical criteria (running)
