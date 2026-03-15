## Reflections
- Write:Read ratio 94,000:1 was hidden in plain sight — nobody audited learning consumption until now
- Readback functions are trivial code (17ms, ~50 lines each) — the hard part was knowing WHAT to read
- Active Retrieval as spec rule (not hook) is the right abstraction — agent judgment > deterministic parsing

## Patterns
- "Persistence through code, not prompts" (Wisdom Frame) confirmed again — readback MUST be hook-based to be reliable
- Write-only systems feel productive but don't compound — consumption = the actual learning, not recording
- 4000 char context budget is tight but forces prioritization — better than dumping everything
- Performance trend + failure correlation gives actionable insight, not just a number

## Actions
- learning-readback.ts: +2 exported functions (loadLearnInsights, loadExperimentPatterns)
- LoadContext.hook.ts: wired both new functions into session start
- v4.0-alpha.md: Active Retrieval rule added to OBSERVE phase
- loadSignalTrends: enhanced with failure pattern when trend is down
