## Reflections
- "Find real problems" prompt to Explore agent produces better gap analysis than "review for quality"
- Inline spec additions (3-8 lines each) avoid cognitive overload — no new sections needed
- 17 fixes in one pass is efficient for spec work — linear scaling, no diminishing returns

## Patterns
- Gap analysis → hardening cycle: stress-test first, catalog gaps, batch-fix specs
- Noise calibration and discrete tolerance are complementary, not conflicting — different formulas for different metric types
- Domain-aware stagnation prevents dangerous amplification in constraint-heavy domains

## Actions
- v4.0-alpha.md: 5 additions (Cycle Selector parsing, PARTIAL classification, THINK futility, Splitting Test exception, noise calibration ref)
- Algorithm-Autoresearch.md: 12 additions (timeout, noise, Pareto, stagnation, amplitude, cost model, anti-criteria, pause/resume, discrete tolerance, versioning, source of truth, revert method)
- Total: ~120 lines added across 2 files — concise, no bloat
