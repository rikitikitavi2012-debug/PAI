# PAI Auto Memory

## User Preferences
- Ivan: Russian language for all responses, English only for code/technical terms/git
- Solo entrepreneur mindset - no corporate solutions
- MVP first, iterate by feedback
- Prefers automation over manual instructions
- Values proactive bug detection and fixing

## Architecture (v4.0.1)
- 3-layer mode classification: ModeClassifier hook (regex) -> Complexity Gate (LLM) -> Algorithm file
- Hooks: 25 active, all defensive/fail-open
- Memory: MEMORY/ (LEARNING, WISDOM, RELATIONSHIP, WORK, STATE, RESEARCH)
- Context: loadAtStartup (3 files) + CONTEXT_ROUTING.md (on-demand)
- API keys: ~/.config/PAI/.env (symlinked from ~/.claude/.env)

## Known Issues
- Wisdom extraction pipeline disconnected (ratings flow but don't update WISDOM/*.json)
- RelationshipMemory moved from SessionEnd to Stop event (2026-03-01)

## Session Patterns
- Rating trend: UP (last 7d avg 6.6/10, last 10: 7.4/10)
- Common frustration: English responses when Russian expected
- Common success: parallel agent delegation for audits
