# Cloud Claude Review — Algorithm v4.0-alpha + Autoresearch

9 findings, prioritized. Source: external Claude review of v4.0-alpha.md + Algorithm-Autoresearch.md.

## Critical
- **Bug 4**: Multiple [Q] criteria conflict — no guidance for sequential/parallel, metric collision in experiments.tsv
- **Bug 1**: L3 STOP doesn't increment think_reentries — ambiguous re-entry counting

## Medium
- **Bug 3**: Expensive regression gates — [B] checks on every iteration can take hours at 100 iterations
- **Bug 7**: No verify command timeout — can hang forever
- **Bug 6**: Recovery mid-iteration — compaction during MODIFY leaves uncommitted changes

## Low
- **Bug 5**: No partial success after re-entry limit — stops at 78% with target 90%, no guidance
- **Bug 2**: Amplify undefined — "try bolder changes" is vague
- **Bug 9**: Subjective Cycle Selector heuristic — "<3 approaches" is agent-subjective
- **Bug 8**: ISC floor for simple tasks — 8 criteria for "rename variable" is overhead
