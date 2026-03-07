---
name: the-algorithm
title: "TheAlgorithm v3.0"
description: "Systematic 7-phase problem-solving framework adapted from Daniel Miessler's TheAlgorithm v1.4.0. Transforms any task into OBSERVE-THINK-PLAN-BUILD-EXECUTE-VERIFY-LEARN cycle with ISC, Quality Gates, and Capability Audits."
version: "3.0.0"
author: "Community (based on Daniel Miessler's TheAlgorithm)"
tags: [algorithm, methodology, systematic, problem-solving, ISC, quality-gate, PRD]
trigger_patterns: ["algorithm", "systematic", "methodology", "ISC", "ideal state", "quality gate", "PRD", "7-phase", "the algorithm"]
allowed_tools: [code_execution_tool, memory_save, memory_load, response, call_subordinate]
---

# TheAlgorithm v3.0 for Agent Zero

Systematic 7-phase hill-climbing framework: **CURRENT STATE → IDEAL STATE** through verifiable Ideal State Criteria (ISC).

## Quick Start

### Step 1: Analyze Complexity (NEW v3.0)
```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode auto-effort --task "TASK_DESCRIPTION"
```
Returns recommended effort level with signal breakdown.

### Step 2: Initialize
```bash
# Full 7-phase mode
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode init --task "TASK" --effort LEVEL

# Lite 3-phase mode (OBSERVE → BUILD → VERIFY) for medium tasks
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode init --task "TASK" --effort LEVEL --lite
```

### Step 3: Work Through Phases
```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode phase --action advance
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode guide
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode dashboard
```

## New in v3.0 (PAI v3.0 Algorithm v1.4.0 Compliance)

Version 3.0 introduces 7 new mechanisms that strengthen the framework's self-correction, traceability, and anti-drift capabilities.

### Constraint Extraction Protocol

Extracts rules, thresholds, and prohibitions from source material. Use during the **OBSERVE** phase to capture hard constraints before defining ISC.

```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode constraints --source-text "Must handle errors. Timeout 30s. Never expose credentials."
```

The extracted constraints are stored in the PRD and referenced throughout subsequent phases.

### Self-Interrogation (5 Questions)

Auto-triggered when entering the **BUILD** phase. Poses 5 structured blind-spot questions to surface hidden assumptions before implementation begins.

```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode interrogate --answers "A1|A2|A3|A4|A5"
```

Answers are recorded in the PRD under `self_interrogation` for audit trail.

### Build Drift Prevention

Two-step guard ensuring artifacts stay aligned with ISC:
- **PRE-CHECK** re-reads ISC criteria before building an artifact.
- **POST-CHECK** scans the artifact against anti-criteria.

```bash
# PRE-CHECK before building
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode drift --artifact "component.py" --action pre

# POST-CHECK after building
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode drift --artifact "component.py" --action post
```

### Verification Rehearsal

Auto-triggered before the **VERIFY** phase. Simulates CRITICAL violations to confirm that the detection pipeline catches real failures.

```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode rehearsal
```

Outputs a rehearsal report with simulated violation results.

### Self-Upgrade Loop (JSONL Reflections)

Writes structured JSONL entries to `data/reflections/reflections.jsonl` with three reflection questions (Q1: mistakes, Q2: fixes, Q3: gaps) and sentiment analysis.

```bash
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode reflect --q1 "mistakes" --q2 "fixes" --q3 "gaps"
```

Reflections accumulate across runs, enabling longitudinal self-improvement tracking.

### ISC Dependency Graph

Adds `blocked_by` and `blocks` relationships between ISC criteria, enabling topological sort into parallel execution waves.

```bash
# Add criterion with dependencies
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode isc --action add --criterion "..." --blocked-by ISC-C1,ISC-C2 --blocks ISC-C5

# View execution waves
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode waves
```

Waves show which criteria can be verified in parallel and which must wait for dependencies.

### Loop Mode Effort Decay

Integrated automatically into loop mode iterations. Late iterations with high pass rates reduce effort level to avoid diminishing returns:
- **>66% ISC passed** → effort drops by 1 level
- **>85% ISC passed** → effort drops by 2 levels

No CLI flag required — decay activates transparently during `--effort loop` runs.

## The 7 Phases

| # | Phase | What to Do | Key Tool |
|---|-------|-----------|----------|
| 1 | **OBSERVE** | Reverse-engineer intent, create ISC, capability audit, quality gate | `--mode reverse`, `--mode isc`, `--mode gate` |
| 2 | **THINK** | Pressure-test ISC, pre-mortem, double-loop check | Review + update ISC |
| 3 | **PLAN** | Prerequisites, strategy, file manifest, parallel tracks | `--mode log --decision` |
| 4 | **BUILD** | Create artifacts, code, content (don't execute yet) | code_execution_tool |
| 5 | **EXECUTE** | Run artifacts, deploy, apply changes | code_execution_tool |
| 6 | **VERIFY** | Test EACH criterion with evidence | `--mode verify --isc-id X --status pass/fail` |
| 7 | **LEARN** | Reflect, log improvements, save to memory | `--mode learn-save` |

**Lite Mode** skips phases 2, 3, 5, 7 → only OBSERVE → BUILD → VERIFY.

## All 22 Modes

| Mode | Description | Example |
|------|-------------|--------|
| `init` | Create PRD | `--mode init --task "..." --effort standard [--lite]` |
| `auto-effort` | Analyze complexity | `--mode auto-effort --task "..."` |
| `isc` | Manage criteria | `--mode isc --action add --criterion "..." [--anti] [--confidence E/I/R] [--verify-method CLI/Test/Static/Browser/Grep/Read/Custom] [--blocked-by ISC-C1] [--blocks ISC-C5]` |
| `gate` | Quality gate (6 checks) | `--mode gate` |
| `phase` | Advance/check phase | `--mode phase --action advance` |
| `verify` | Verify criterion | `--mode verify --isc-id ISC-C1 --status pass --evidence "..."` |
| `report` | Full text report | `--mode report` |
| `dashboard` | ASCII progress viz | `--mode dashboard` |
| `guide` | Phase instructions | `--mode guide` |
| `caps` | Capability audit | `--mode caps [--use 1,3 --decline 9]` |
| `reverse` | Reverse engineering | `--mode reverse --explicit-wants "..."` |
| `log` | Log entries/decisions | `--mode log --entry "..."` / `--decision "..."` |
| `learn-save` | Export for memory | `--mode learn-save` |
| `list` | List all PRDs | `--mode list` |
| `status` | Quick status | `--mode status` |
| `migrate` | Migrate old PRDs | `--mode migrate` |
| `constraints` | Extract constraints from text | `--mode constraints --source-text "..."` |
| `interrogate` | Self-interrogation (5 questions) | `--mode interrogate --answers "A1\|A2\|A3\|A4\|A5"` |
| `drift` | Build drift prevention | `--mode drift --artifact "file" --action pre/post` |
| `rehearsal` | Verification rehearsal | `--mode rehearsal` |
| `reflect` | Self-upgrade loop (JSONL) | `--mode reflect --q1 "..." --q2 "..." --q3 "..."` |
| `waves` | ISC execution waves | `--mode waves` |

## ISC Criteria Rules
- **8-12 words** each
- **State-based** (not action-based): "JWT tokens validated with RS256" ✓, "Validate JWT tokens" ✗
- **Binary testable**: clear pass/fail
- **Confidence tags**: [E]xplicit, [I]nferred, [R]everse-engineered
- **Anti-criteria**: what must NOT happen (at least 1 required)

## Quality Gate (6 Checks)
| Check | What |
|-------|------|
| QG1_Count | Minimum criteria per effort level |
| QG2_Length | All criteria 8-12 words |
| QG3_State | No action-verb starts |
| QG4_Testable | No vague words (properly, correctly, etc.) |
| QG5_Anti | At least 1 anti-criterion |
| QG6_Coverage | Explicit requirements covered |

## Effort Levels
| Level | Budget | Min ISC | Planning | Reflection |
|-------|--------|---------|----------|------------|
| instant | <10s | 4 | No | No |
| fast | <1min | 4 | No | No |
| standard | <2min | 4 | No | Yes |
| extended | <8min | 8 | Yes | Yes |
| advanced | <16min | 12 | Yes | Yes |
| deep | <32min | 16 | Yes | Yes |
| comprehensive | <120m | 20 | Yes | Yes |
| loop | unbounded | 8 | Yes | Yes |

## 25 Agent Zero Capabilities

Use `--mode caps` to see all. Key mappings:
- **#1 ISC Tracking** → the_algorithm.py
- **#3 Code Execution** → code_execution_tool
- **#8 Research** → exa-synergy / search_engine
- **#9-12 Agents** → call_subordinate (developer/researcher/hacker)
- **#15 Browser** → browser_agent
- **#17-20 Skills** → doc-forge, chart-architect, ops-commander, replicate-studio
- **#21-23 Testing** → code_execution_tool (pytest/lint/curl)
- **#24 Memory** → memory_save / memory_load

## Workflow for Agent Zero

### Standard Task
```
1. auto-effort → get recommended effort
2. init → create PRD
3. phase advance → enter OBSERVE
4. reverse → analyze requirements
5. isc add (×N) → define criteria + anti-criteria
6. gate → validate criteria quality
7. phase advance → THINK (pressure-test)
8. phase advance → PLAN (strategy)
9. phase advance → BUILD (create artifacts)
10. phase advance → EXECUTE (run)
11. phase advance → VERIFY
12. verify (×N) → test each criterion with evidence
13. phase advance → LEARN
14. learn-save → pipe output to memory_save
15. dashboard → final visualization
```

### Lite Task (--lite)
```
1. init --lite → create PRD (3-phase)
2. phase advance → OBSERVE
3. isc + gate → define & validate criteria
4. phase advance → BUILD (skips THINK, PLAN)
5. phase advance → VERIFY (skips EXECUTE)
6. verify (×N) → test criteria
7. dashboard → done
```

## Saving Learnings to Memory
```bash
# Generate formatted output
python /a0/usr/skills/the-algorithm/scripts/the_algorithm.py --mode learn-save
# Agent pipes this to memory_save tool
```

## Templates
- ISC examples by domain: `/a0/usr/skills/the-algorithm/templates/isc_examples.md`
- Quick start template: `/a0/usr/skills/the-algorithm/templates/quick_start.md`

## Configuration
Edit `/a0/usr/skills/the-algorithm/config/settings.json` to customize:
- Auto-advisor threshold and keywords
- Lite mode phases
- Storage paths

## File Tree
```
/a0/usr/skills/the-algorithm/
├── SKILL.md
├── install.sh
├── uninstall.sh
├── config/
│   └── settings.json
├── data/
│   ├── prd/
│   └── reflections/
├── extensions/
│   └── _50_algorithm_advisor.py
├── scripts/
│   └── the_algorithm.py
└── templates/
    ├── isc_examples.md
    └── quick_start.md
```

## Installation
```bash
bash /a0/usr/skills/the-algorithm/install.sh
```

## ISC — Ideal State Criteria (Критерии Идеального Состояния)

Каждая задача раскладывается на верифицируемые критерии ПЕРЕД выполнением.

### Формат ISC
- 8-12 слов каждый критерий
- Boolean: PASS или FAIL, без "частично"
- Пример хороший: "Health check endpoint возвращает 200 и uptime >99%"
- Пример плохой: "Система работает стабильно"

### Процесс
1. OBSERVE — понять текущее состояние
2. THINK — выделить разрыв между current и ideal
3. PLAN — составить ISC (список критериев)
4. BUILD — реализовать
5. EXECUTE — запустить
6. VERIFY — проверить каждый ISC критерий (PASS/FAIL)
7. LEARN — зафиксировать что сработало, что нет

## Flywheel MO13 (обязательный LEARN после каждого цикла)

Каждая завершённая задача = один оборот маховика:
- DO → выполнил задачу
- LEARN → что сработало? что сломалось? что узнал?
- FIX → обновить память/поведение на основе урока
- Следующий цикл начинается с обновлённого контекста

Пропуск LEARN = разомкнутая петля = линейный рост вместо экспоненциального.

> "Experiential learning trusts integration to luck, chance and time. Algorithmic learning makes integration explicit." — Daniel Miessler
> "Each turn of the flywheel builds upon work done earlier, compounding your investment of effort." — Jim Collins
