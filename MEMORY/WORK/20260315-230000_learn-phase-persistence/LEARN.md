## Reflections
- PreToolUse hooks can **block** operations; PostToolUse can only warn. This architectural distinction is critical when designing enforcement gates. Always choose PreToolUse for mandatory gates.
- The "only if cross-domain applicable" wording was a rationalization escape hatch. Soft conditional instructions in LLM prompts are unreliable — they need deterministic enforcement via hooks.
- FirstPrinciples skill was the right choice — it decomposed 4 independent root causes (soft instruction, context loss, no verification, wrong SessionEnd captures) that each needed addressing.

## Patterns
- **Prompt + Hook = Closed Loop**: Prompt provides intent and template; hook provides enforcement. Neither alone is sufficient. Prompt-only degrades after compaction. Hook-only can't ensure quality. Together they form a gate.
- **Meta-testing**: This LEARN phase is the first one enforced by the LearnGate hook it created — a self-referential test that proves the mechanism works.
- **Measurement before optimization**: Baseline was 0/60 (0%). Without measuring first, we couldn't know the scale of the problem or set a meaningful target.

## Actions
- Created: `hooks/LearnGate.hook.ts` — PreToolUse gate that blocks `phase: complete` without LEARN.md
- Modified: `PAI/Algorithm/v4.0-alpha.md` — LEARN phase now mandates LEARN.md with template
- Modified: `settings.json` — LearnGate added to PreToolUse Edit/Write matchers
- Created: `measure-learn-rate.sh` — measurement script for tracking persistence rate over time
- No Wisdom Frame created — this is the first data point; cross-domain pattern will emerge after 5+ sessions confirm the gate works
