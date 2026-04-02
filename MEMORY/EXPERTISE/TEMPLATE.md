# Expertise Template

Every agent has a dedicated expertise file in `MEMORY/EXPERTISE/{agent-type}.md`.

## File Naming

- `{agent-type}.md` — matches subagent_type from Agent tool
- Examples: `Explore.md`, `Plan.md`, `Engineer.md`, `general-purpose.md`

## Format

```markdown
---
agent: {agent-type}
domains: [domain1, domain2]
lines: {current_lines}/{max_lines}
updated: {timestamp}
---

# {Agent Name} Expertise

## Domain Knowledge
- Pattern 1 discovered from N sessions
- Pattern 2 discovered from N sessions
- Anti-pattern to avoid (learned from failure X)

## Codebase Insights
- Key file: `path/to/important/file.ts` — purpose
- Configuration: `config.json → section` — behavior
- Gotcha: `module/X` requires Y before Z

## Tool Preferences
- Prefer: Grep over Bash for file searches
- Avoid: Edit for large rewrites — use Write instead
- Pattern: Read before Edit — always verify content first

## Failure Patterns
- 2026-04-02: Task X failed because Y — fix: Z
- 2026-03-28: Agent returned stale line numbers — fix: request code snippets

## Cross-Domain Insights
- From {other-agent}: shared pattern description
```

## Auto-Update Rules

1. **Max 10,000 lines** — oldest entries pruned when exceeded
2. **Merge duplicates** — same pattern from multiple sessions → single entry with count
3. **Promote to Wisdom Frames** — patterns appearing in 3+ expertise files → MEMORY/WISDOM/FRAMES/

## Hook Integration

`ExpertiseCapture.hook.ts` runs on PostToolUse (Agent completion) and:
1. Reads agent output for learned patterns
2. Merges into expertise file
3. Checks for cross-domain patterns → Wisdom Frame candidates
