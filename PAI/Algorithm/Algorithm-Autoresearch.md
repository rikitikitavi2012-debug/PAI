## Autoresearch Sub-Loop Protocol

Referenced from `v4.0-alpha.md` EXECUTE phase. Loaded only when Cycle Selector routes to Autoresearch or Hybrid EXECUTE.

### Prerequisites

Before starting the sub-loop, **Verification Rehearsal** (defined in v4.0-alpha.md EXECUTE section) MUST complete for each `[Q]` metric. This validates that the metric command produces reliable measurements. Run once per `[Q]` criterion, not once per iteration.

**Noise calibration (part of Rehearsal):** Run the metric command 3× on unchanged code. Compute variance. If σ > 2% of baseline value, the metric is noisy — widen regression tolerance to `max(5%, 2×σ)` for this criterion and log: `# noise_tolerance: X%` in experiments.tsv header. This prevents false positives on inherently noisy metrics (Lighthouse, network-dependent measurements). Deterministic metrics (test count, file size) will show σ=0 — no tolerance change needed.

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

**Pareto deadlock resolution:** When conflict detected (5+ consecutive regressions of prior [Q]):
1. **Measure** both metrics at current state → present exact numbers
2. **Present tradeoff** via AskUserQuestion with concrete options: (a) relax prior [Q] tolerance to X%, (b) lower current [Q] target, (c) accept PARTIAL on current [Q], (d) re-think approach in THINK phase
3. **User decides** — never auto-resolve Pareto conflicts. The algorithm optimizes, humans make value tradeoffs.
4. If 3+ [Q] create circular conflicts (improving any one regresses another), mark ALL conflicting [Q] as `[~] PARTIAL` with achieved values and document the Pareto frontier in LEARN Track 3.

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
  - Run metric command → record new value
    **Timeout protocol (60s):** Run via `timeout 60 <cmd>`. If exit code 124 (timeout): (1) kill child tree: `kill -- -$$` or `pkill -P $PID`, (2) log `status=timeout` in experiments.tsv, (3) treat as crash (fix attempt max 3, then SKIP). If metric command spawns children (e.g., Lighthouse → Chrome), use `timeout --kill-after=5 60 <cmd>` to ensure cleanup. Resume at Phase 2 (IDEATE) after timeout — the iteration is lost, not the session.
    **Metric freshness:** If the metric depends on external state (deploy, CDN cache, API), validate staleness: compare two runs 5s apart. If identical despite a known code change → metric is stale, flag and pause until fresh. Real-time metrics only for Autoresearch.
  - Run regression gates: fast gates every iteration, slow gates per schedule (see Regression Gates)
  - Run anti-criteria check: no ISC-A violations

Phase 6: DECIDE
  - Metric improved AND gates pass → KEEP
  - Metric same or worse → REVERT (git revert)
  - Metric improved BUT gate broken → REVERT (gate > metric)
  - Anti-criteria violated → REVERT + ALERT
  - Crash/error → fix attempt (max 3) → if still broken, SKIP
  **Revert method:** Use `git reset --hard HEAD~1` (not `git revert`) — keeps history clean. The discarded commit is already logged in experiments.tsv with `commit=-`. For amplified multi-commit changes, use `git reset --hard <pre-experiment-hash>`. This maintains bisectable history — no noise from revert commits.

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

**Re-entry limit:** Maximum **2** re-entries to THINK from autoresearch stagnation or drift. On third stagnation, STOP and present results as-is. This prevents infinite re-planning loops. Track re-entry count in experiments.tsv header comment: `# think_reentries: N`. **Initialize to 0** when creating experiments.tsv. Counter is **per-[Q]** — reset to 0 when starting a new `[Q]` criterion's sub-loop.

### Context Recovery (during Autoresearch)

After context compaction, recover sub-loop state by reading experiments.tsv:
- **Iteration count:** number of data rows in experiments.tsv
- **Current metric:** last `keep` or `baseline` row's metric value
- **Re-entry count:** `# think_reentries: N` header comment
- **Consecutive discards:** count trailing `discard` rows from bottom of file
- **Change amplitude:** `# amplitude: normal|amplified|reduced` header comment (updated by L3 decisions)

**Mid-iteration recovery:** After compaction or crash, check `git status`. If uncommitted changes exist:
- Changes look coherent and compilable (files complete, no syntax errors) → assume COMMIT stage was reached: `git commit -m "exp(N): recovered mid-iteration"`, resume at VERIFY
- Changes are broken, partial, or unclear → assume mid-MODIFY: `git checkout -- .` (discard), resume at IDEATE (Phase 2)
- **Heuristic:** run a quick sanity check (lint, type-check, or `bun build --dry-run`) to decide. If it passes → commit path. If it fails → discard path.

For main Algorithm state, also read the PRD (see v4.0-alpha.md Context Recovery section).

**Pause/resume (deliberate interruption):** If resuming after a deliberate pause (hours/days, not crash):
1. Re-run the baseline metric command → compare with experiments.tsv baseline. If changed >5%, record new baseline and note: `# baseline_recalibrated: old → new (reason: external changes)`
2. Check `git log --oneline` for commits not in experiments.tsv → if others pushed changes, the codebase state has diverged. Acknowledge in LOG.
3. Resume at Phase 1 (REVIEW) with fresh metric, not mid-iteration. Consecutive discard counter carries over from experiments.tsv.
4. Do NOT re-run Verification Rehearsal unless baseline recalibrated by >20%.

### Stagnation Detection

Track consecutive non-improvement results ("consecutive" = immediately sequential discard rows in experiments.tsv, any `keep` resets the counter to 0):

**Priority:** Stagnation Detection runs BEFORE L3 Structural analysis on applicable iterations (e.g., iteration 10 checks stagnation first, then L3).

| Consecutive Discards | Action |
|---------------------|--------|
| 5 | **Amplify**: switch to amplified amplitude (see below) |
| 10 | **STOP**: increment think_reentries, return to PAI THINK with trajectory data |

**Domain-aware override:** If discards are caused by regression gate failures (not metric non-improvement), the domain may be constraint-heavy rather than stagnant. Check: are discards failing gates or failing to improve the metric? If >80% of discards are gate failures → the problem is gate compatibility, not stagnation. In this case: do NOT amplify (amplifying in constrained domains is dangerous). Instead, at 5 discards: narrow scope (smaller changes that are less likely to break gates). At 10: STOP and present constraint analysis — "these gates conflict with this metric" — so user can relax a gate or accept PARTIAL.

**Change amplitude definitions:**
- **Normal** (default): one element changed per iteration (single function, single CSS rule, single config value). "One element" = one logical concern: removing a library is one element (even if it touches 3 import sites). Refactoring a function is one element if the API stays the same, multiple if callers change behavior. Rule of thumb: if you can describe it in 8 words without "and", it's one element.
- **Amplified**: multiple elements changed per iteration, or structural changes (rewrite a module, change data structure, switch library). Caution: attribution breaks — you won't know which sub-change caused the metric movement. Use only after stagnation signals.
- **Reduced**: point edits only (tweak a constant, adjust a threshold, rename a variable). One line, one file. Use after oscillation signals.

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

**Cost model validation (before first iteration):** Estimate total gate cost: `(slow_gate_count × avg_slow_time × iterations/5) + (fast_gate_count × avg_fast_time × iterations)`. If estimated gate cost > 30% of iteration budget time, either: (a) reduce slow gate frequency (every 10 instead of 5), (b) convert some slow gates to fast via parallelization, or (c) reduce iteration cap. Log the cost estimate in experiments.tsv header: `# gate_cost_estimate: Xs per iteration`. This prevents the scenario where 12 slow gates at 8s each consume 100% of budget.

- Before DECIDE, verify **fast gates** on every iteration
- Run **slow gates** every 5 iterations, or after a `keep` decision (but only if ≥2 iterations since last slow gate run — prevents cascading when keeps cluster)
- Gate failure → automatic REVERT, regardless of metric improvement
- This prevents Goodhart's Law: metric goes up but quality goes down

`ISC-A` anti-criteria serve as hard stops:
- Anti-criteria violation → REVERT + halt loop + return to PAI THINK
- These represent constraints that must never be broken (budget limits, safety rules, etc.)
- If the same ISC-A is violated twice across re-entries → STOP entirely, present results as-is
- **Structural violations:** If the anti-criteria violation is structural (same root cause, different manifestation — e.g., API keys leaking from logging, not from code), Autoresearch cannot fix it. On second violation of same ISC-A: STOP, flag as "structural constraint — requires dedicated refactoring outside Autoresearch scope", present to user with root cause analysis. Do NOT re-enter THINK for the same structural issue — THINK re-planning won't fix an architectural problem.

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

**Source of truth hierarchy:** For `[Q]` criteria state: experiments.tsv (empirical record) > PRD checkboxes (summary). If they conflict after recovery, trust experiments.tsv — it has commit hashes and metric values. PRD checkboxes are convenience markers, experiments.tsv is the audit trail.

**Revisited tasks (PRD iteration 2+):** If a PRD is reopened for continued optimization, append a new section to experiments.tsv with a separator: `# --- Iteration 2 (YYYY-MM-DD) ---`. Reset iteration counter to 0 within the new section. Previous section's best value becomes the new baseline. Do NOT overwrite previous experiment data — it's the historical record.

**Joint re-check (multiple [Q] only):** After ALL `[Q]` criteria are optimized, re-measure every `[Q]` metric. If a later `[Q]`'s changes accidentally improved an earlier one beyond its original result, record the improved value. If a later `[Q]` regressed an earlier one within tolerance, note it in LEARN. This catches cross-metric interactions that sequential optimization misses — a lightweight Pareto check without parallel complexity.

**Partial success:** If the re-entry limit (2) is exhausted without reaching the target, mark the `[Q]` criterion as `PARTIAL` in the PRD: `- [~] ISC-N [Q]: description (achieved: X, target: Y)`. Record the best achieved value. LEARN Track 3 must analyze why the target wasn't reached and whether the target was realistic. Partial success is better than no record — the achieved improvement is preserved.

**PARTIAL as regression gate:** When a `[Q]` reaches PARTIAL status, its best achieved value still becomes a regression gate for subsequent `[Q]` criteria (same 5% relative tolerance). The fact that the target wasn't reached doesn't exempt the achieved gains from protection.

---

## Threshold Rationale

All thresholds are v4.0-alpha starting points. Calibrate by production data in LEARN Track 3.

| Threshold | Value | Why this value |
|-----------|-------|----------------|
| Re-entry limit | 2 | 3+ creates infinite re-planning loops observed in v3.x; 1 is too brittle for genuinely hard problems; 2 gives one course-correction opportunity |
| Regression tolerance | 5% relative | Statistical convention for "practically significant" change; tighter (3%) triggers false positives on noisy metrics; looser (10%) allows meaningful regression. **Discrete metrics (integers):** use `max(5%, 1/baseline)` — ensures at least 1 unit tolerance. E.g., baseline 12 test failures → tolerance = max(5%, 1/12) = max(5%, 8.3%) = 8.3% → gate triggers at >13. For continuous metrics, 5% is fine. Noisy metrics: see noise calibration in Prerequisites. |
| Stagnation → Amplify | 5 discards | Balances patience vs waste; 3 is too aggressive (false positives on stochastic metrics); 10 wastes half the budget before reacting |
| Stagnation → STOP | 10 discards | 5 normal + 5 amplified = exhausted both amplitude levels; continuing past this is pure randomness |
| Fast/slow gate boundary | 5s | Practical: grep/lint/type-check < 1s, full test suites > 10s; 5s splits cleanly between instant checks and heavy runners |
| Slow gate schedule | every 5 iters | At 100-iteration budget, 20 slow gate runs is 20% overhead — acceptable; every-iteration would be 100% overhead |
| Conflict detection | 5 attempts | Same rationale as stagnation amplify — balances signal vs waste |
| Self-interrogation | every 20 iters | ~20% of typical Extended budget (50 iterations); frequent enough to catch drift, rare enough to not dominate runtime |
| ISC floors (8/16/24/40/64) | ~2× per tier | Derived from ISC Range column in Effort Levels; floor = minimum of range for each tier |

**Override any threshold** via PRD frontmatter comment: `# threshold_name: value`. Document why in the criterion's rationale.
