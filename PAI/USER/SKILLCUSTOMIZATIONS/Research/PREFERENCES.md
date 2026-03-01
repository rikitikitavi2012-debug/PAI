# Research Skill Customizations

## Language

- **Default response language: Russian (русский)**
- All agent prompts MUST include: `"Respond in Russian (русский язык). Use English only for technical terms, code, and proper nouns."`
- Synthesis and final reports — in Russian
- Source citations and URLs — keep original language

## Agent Prompt Injection

When spawning any research agent (ClaudeResearcher, GeminiResearcher, PerplexityResearcher, GrokResearcher), append to every prompt:

```
IMPORTANT: Respond in Russian (русский язык). Technical terms and proper nouns may remain in English. All analysis, summaries, and conclusions must be in Russian.
```

## Persistence

- ALL research workflows (Quick, Standard, Extensive) MUST save results to disk
- Path: `~/.claude/MEMORY/RESEARCH/YYYY-MM/YYYY-MM-DD_{topic-slug}/RESEARCH_REPORT.md`
- Save BEFORE returning results to user
- This ensures statusbar research count stays accurate
