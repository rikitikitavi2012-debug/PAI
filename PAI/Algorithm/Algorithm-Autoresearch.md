## Autoresearch Sub-Loop Protocol

Referenced from `v4.0-alpha.md` EXECUTE phase. Loaded only when Cycle Selector routes to Autoresearch or Hybrid EXECUTE.

### Prerequisites

Before starting the sub-loop, **Verification Rehearsal** (defined in v4.0-alpha.md EXECUTE section) MUST complete for each `[Q]` metric. This validates that the metric command produces reliable measurements. Run once per `[Q]` criterion, not once per iteration.

### Multiple [Q] Criteria

When a PRD has 2+ `[Q]` criteria, optimize them **sequentially** — complete one before starting the next. Each `[Q]` gets its own experiments.tsv section, separated by a header comment:
```
# [Q] ISC-5: Lighthouse performance > 90
# metric_direction: higher_is_better
# target: 90
iteration	commit	metric	delta	status	description
...

# [Q] ISC-8: Time to Interactive < 2s
# metric_direction: lower_is_better
# target: 2.0
iteration	commit	metric	delta	status	description
...
```

After completing `[Q]-1`, its best achieved value becomes a regression gate for subsequent `[Q]` optimizations (tolerance: 5% relative — `best × 0.95` for higher-is-better, `best × 1.05` for lower-is-better). If optimizing `[Q]-N` conflicts with a previous `[Q]` (5+ consecutive iterations regress the prior metric beyond tolerance), STOP and present the tradeoff to the user.

### 8-Phase Iteration Cycle

Each iteration = one atomic experiment. Goal: improve a `[Q]` metric while preserving all `[B]` regression gates.

```
Phase 1: REVIEW
  - Read current metric value, experiments.tsv, recent git log
  - Note which approaches have been tried and their deltas

Phase 2: IDEATE
  - Choose ONE focused change to try next
  - Prefer unexplored directions over variations of failed approaches
  - Consider: what has the highest expected delta per effort?

Phase 3: MODIFY
  - Make ONE focused change (atomic — single concern)
  - Keep changes small: easier to attribute metric movement to cause

Phase 4: COMMIT
  - git commit BEFORE verification (enables clean revert)
  - Message format: "exp(N): description" where N = iteration number

Phase 5: VERIFY
  - Run metric command → record new value (timeout: 60s — if not returned, kill process, log status=timeout in experiments.tsv, treat as crash)
  - Run regression gates: fast gates every iteration, slow gates per schedule (see Regression Gates)
  - Run anti-criteria check: no ISC-A violations

Phase 6: DECIDE
  - Metric improved AND gates pass → KEEP
  - Metric same or worse → REVERT (git revert)
  - Metric improved BUT gate broken → REVERT (gate > metric)
  - Anti-criteria violated → REVERT + ALERT
  - Crash/error → fix attempt (max 3) → if still broken, SKIP

Phase 7: LOG
  - Append row to experiments.tsv:
    iteration | commit | metric | delta | status | description
  - commit = "-" for discarded/reverted changes
  - delta = change from most recent keep/baseline (ignore discard/crash/skip)
  - If L3 changed amplitude, update header: `# amplitude: normal|amplified|reduced`

Phase 8: REPEAT
  - Continue if: budget remaining AND target not reached AND not stagnating
  - Stop if: iteration cap reached OR target achieved OR stagnation detected
```

### Self-Interrogation Checkpoint

Every **20 iterations**, pause the loop and answer:

1. Is the metric still measuring what the ISC criterion actually describes? (Goodhart check)
2. Am I optimizing the right thing, or have I drifted to a proxy?
3. Are the regression gates still meaningful, or have they become trivially satisfied?
4. What category of changes has produced the best deltas? Should I focus there?
5. Is continued iteration likely to reach the target, or should I re-enter THINK?

If answers suggest drift or futility → STOP loop, return to PAI THINK phase with findings.

**Re-entry limit:** Maximum **2** re-entries to THINK from autoresearch stagnation or drift. On third stagnation, STOP and present results as-is. This prevents infinite re-planning loops. Track re-entry count in experiments.tsv header comment: `# think_reentries: N`.

### Context Recovery (during Autoresearch)

After context compaction, recover sub-loop state by reading experiments.tsv:
- **Iteration count:** number of data rows in experiments.tsv
- **Current metric:** last `keep` or `baseline` row's metric value
- **Re-entry count:** `# think_reentries: N` header comment
- **Consecutive discards:** count trailing `discard` rows from bottom of file
- **Change amplitude:** `# amplitude: normal|amplified|reduced` header comment (updated by L3 decisions)

**Mid-iteration recovery:** After compaction or crash, check `git status`. If uncommitted changes exist:
- Changes are in MODIFY/COMMIT stage → `git commit -m "exp(N): recovered mid-iteration"`, then resume at VERIFY
- Changes are unclear or broken → `git checkout -- .` (discard), then resume at IDEATE (Phase 2)
- **Never resume mid-MODIFY.** Either commit what's there (resume VERIFY) or discard (resume IDEATE).

For main Algorithm state, also read the PRD (see v4.0-alpha.md Context Recovery section).

### Stagnation Detection

Track consecutive non-improvement results ("consecutive" = immediately sequential discard rows in experiments.tsv, any `keep` resets the counter to 0):

**Priority:** Stagnation Detection runs BEFORE L3 Structural analysis on applicable iterations (e.g., iteration 10 checks stagnation first, then L3).

| Consecutive Discards | Action |
|---------------------|--------|
| 5 | **Amplify**: switch to amplified amplitude (see below) |
| 10 | **STOP**: increment think_reentries, return to PAI THINK with trajectory data |

**Change amplitude definitions:**
- **Normal** (default): one element changed per iteration (single function, single CSS rule, single config value)
- **Amplified**: multiple elements changed per iteration, or structural changes (rewrite a module, change data structure, switch library)
- **Reduced**: point edits only (tweak a constant, adjust a threshold, rename a variable)

**Amplify does NOT reset the consecutive discard counter.** The counter continues from its current value. If experiments 5-10 after Amplify are all discards, STOP triggers at 10 total.

**Additional signals:**
- Revert rate > 50% over last 20 experiments → STOP, re-enter THINK (counts toward re-entry limit)
- Oscillation: σ of last 10 keep-values > 2× net improvement over same 10 iterations → reduce change amplitude
- Plateau: delta < 1% of remaining gap for 10 iterations → amplify or STOP

**All STOP destinations route to THINK** (not PLAN). THINK re-evaluates ISC and risks, then flows through PLAN → Cycle Selector naturally. **ALL STOP events (Stagnation AND L3 Structural) increment `think_reentries` and respect the 2 re-entry limit.** On third STOP from any source, halt and present results as-is.

### Regression Gates

`[B]` criteria from the PRD serve as regression gates during the sub-loop. Split into two tiers to manage cost:

**Fast gates** (run every iteration, <5s each): grep, lint, type-check, file-exists, simple assertions. Mark in PRD with `[B-fast]` if needed.

**Slow gates** (run every 5 iterations or after each `keep`): full test suites, build, browser tests, anything >5s. Mark in PRD with `[B-slow]` if needed.

If no explicit `[B-fast]`/`[B-slow]` tagging: gates that complete in <5s are fast, others are slow. When in doubt, run as fast gate.

- Before DECIDE, verify **fast gates** on every iteration
- Run **slow gates** every 5 iterations, or after a `keep` decision (but only if ≥2 iterations since last slow gate run — prevents cascading when keeps cluster)
- Gate failure → automatic REVERT, regardless of metric improvement
- This prevents Goodhart's Law: metric goes up but quality goes down

`ISC-A` anti-criteria serve as hard stops:
- Anti-criteria violation → REVERT + halt loop + return to PAI THINK
- These represent constraints that must never be broken (budget limits, safety rules, etc.)
- If the same ISC-A is violated twice across re-entries → STOP entirely, present results as-is

---

## Layered Drift Defense

Three layers operate at different frequencies to catch different types of drift.

### L1: Strategic (every 20 iterations — Self-Interrogation Checkpoint)

**Trigger:** Every 20th iteration (same as Self-Interrogation above — they are the same mechanism).

**Purpose:** Catch drift between what the metric measures and what the ISC actually wants.

**Actions:**
- Run the 5 Self-Interrogation questions
- Compare current optimization direction with original ISC intent
- If misaligned → STOP, re-enter THINK with evidence (subject to re-entry limit)

### L2: Tactical (every experiment)

**Trigger:** VERIFY phase of each iteration.

**Purpose:** Catch individual experiments that break existing functionality.

**Actions:**
- Run regression gates (`[B]` criteria check)
- Run anti-criteria check
- Auto-revert on any failure — no human judgment needed

### L3: Structural (every 10 experiments)

**Trigger:** After LOG phase, every 10th iteration.

**Purpose:** Catch trajectory-level problems (plateau, oscillation, diminishing returns).

**Analysis:**
- **Trend**: compute slope of metric over last 10 experiments (keep-only values)
- **Revert rate**: discards / total over last 10
- **Oscillation**: standard deviation of metric values over last 10 vs net change

**Decision matrix:**

| Signal | Threshold | Action |
|--------|-----------|--------|
| Positive trend, low revert rate | slope > 0, reverts < 30% | Continue — healthy |
| Positive trend, high revert rate | slope > 0, reverts 30-50% | Continue cautiously — reduce change amplitude |
| Flat trend | slope ≈ 0 for 10 iterations | Amplify — try bolder changes or new categories |
| Negative trend | slope < 0 | STOP — increment think_reentries, re-enter THINK |
| High oscillation | σ > 2× net change | Reduce amplitude — changes are too volatile |
| Positive trend, critical revert rate | slope > 0, reverts > 50% | STOP — increment think_reentries, improvements fragile |
| Revert rate critical | slope ≤ 0, reverts > 50% | STOP — increment think_reentries, re-enter THINK |

---

## Integration with PAI Algorithm

This protocol operates WITHIN the EXECUTE phase. PAI Algorithm phases wrap it:

```
OBSERVE → THINK → PLAN → CYCLE SELECTOR → BUILD →
  EXECUTE:
    [Standard: direct work on [B] criteria]
    [Autoresearch: this sub-loop for [Q] criteria]
    [Hybrid: Standard first, then this sub-loop]
→ VERIFY → LEARN
```

After the sub-loop completes (target reached, budget exhausted, or stopped), control returns to the main Algorithm flow at VERIFY. The experiments.tsv data feeds into LEARN Track 2 (Empirical) and Track 3 (Synthesis).

**Partial success:** If the re-entry limit (2) is exhausted without reaching the target, mark the `[Q]` criterion as `PARTIAL` in the PRD: `- [~] ISC-N [Q]: description (achieved: X, target: Y)`. Record the best achieved value. LEARN Track 3 must analyze why the target wasn't reached and whether the target was realistic. Partial success is better than no record — the achieved improvement is preserved.
