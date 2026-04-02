---
name: AutoSkillProposal v2 Learnings
description: Ключевые уроки из перепроектирования AutoSkillProposal hook
type: learning
created: 2026-04-02
---

# AutoSkillProposal v2 Learnings

## Critical Problems Found in v1

| Problem | Impact | Fix |
|---------|--------|-----|
| Analyzed `last_assistant_message` | No patterns visible | Use `parseTranscriptFromInput()` |
| Haiku for strategic analysis | Poor quality | Sonnet (`--level standard`) |
| `countToolCalls()` broken | Never triggered | Fix regex to match `<function=Name>` |
| No duplicate check | Spam skills | 50% trigger overlap detection |
| 4000 char truncation | Lost context | Full transcript |

## Key Decisions

1. **Direct import > execFileSync** — faster, less overhead
2. **Sonnet > Haiku** — pattern analysis needs reasoning
3. **5 tools threshold (was 8)** — more candidates, filter on confidence
4. **0.7 confidence threshold** — quality over quantity

## Hook Best Practices

```
✅ Timeout guard (30s)
✅ Rate limiting (1/session, 5min cooldown)
✅ Graceful degradation (exit 0 on all errors)
✅ stderr for logs (not stdout)
✅ State file for tracking
```

## Transcript Analysis Pattern

```typescript
// ALWAYS use parseTranscriptFromInput, not last_assistant_message
const transcript = await parseTranscriptFromInput(input);

// Tool calls are in XML format, not function()
const toolPattern = /<function=([A-Za-z]+)>/g;
```
