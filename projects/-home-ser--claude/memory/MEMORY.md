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

## Known Issues (resolved 2026-03-01)
- ~~Wisdom pipeline disconnected~~ → WisdomSync.hook.ts created, ratings → WISDOM + FRAMES
- ~~RelationshipMemory wrong event~~ → moved from SessionEnd to Stop
- ~~TrendingAnalysis.ts missing~~ → restored from v3 backup to tools/
- ~~.env symlink missing~~ → restored ~/.claude/.env → ~/.config/PAI/.env
- ~~WISDOM/FRAMES/ missing~~ → 5 frames bootstrapped from JSON

## Git & Community (CRITICAL — always follow)
- **Всегда коммитить** изменения при работе над PAI
- **Вносить вклад в сообщество**: баги, фичи → PR/issues в upstream PAI repo
- **Следить за сообществом**: проверять PRs, issues, discussions в PAI repo и anthropics/claude-code
- **GitHub account**: rikitikitavi2012-debug, gh auth active
- **Repo structure** (настроена 2026-03-01):
  - Remote: origin → github.com/rikitikitavi2012-debug/PAI (public)
  - `main` branch — tracks origin/main (community, 552 commits)
  - `master` branch — локальная конфигурация (25 commits, НЕ пушить — personal data)
  - PRs: feature branches от main через worktree (git worktree add)
  - NEVER push MEMORY/, USER/, WISDOM/ to public repo
- **PR #1**: feat/mode-classifier-hook — ModeClassifier hook (OPEN)

## Session Patterns
- Rating trend: UP (last 7d avg 6.6/10, last 10: 7.4/10)
- Common frustration: English responses when Russian expected
- Common success: parallel agent delegation for audits
