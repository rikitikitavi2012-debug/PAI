# PAI Auto Memory

## User Preferences
- Ivan: Russian language for all responses, English only for code/technical terms/git
- Solo entrepreneur mindset - no corporate solutions
- MVP first, iterate by feedback
- Prefers automation over manual instructions
- Values proactive bug detection and fixing

## Architecture (v4.0.3)
- 3-layer mode classification: ModeClassifier hook (regex) -> Complexity Gate (LLM) -> Algorithm file
- Hooks: 29 files (.hook.ts), 23 registered in settings.json, all defensive/fail-open, ALL must have chmod +x
- Memory: MEMORY/ (LEARNING, WISDOM, RELATIONSHIP, WORK, STATE, SECURITY)
- TELOS: PAI/USER/TELOS/ — 23 файла (MISSION, GOALS, CHALLENGES, STRATEGIES, BELIEFS, MODELS, NARRATIVES, PROJECTS, IDEAS, PREDICTIONS, STATUS, WISDOM, FRAMES, BOOKS, MOVIES, LEARNED, TRAUMAS, WRONG, PROBLEMS, README, updates). TELOS.md — только index/шаблон, данные в отдельных файлах!
- Context: loadAtStartup (3 files) + CONTEXT_ROUTING.md (on-demand)
- API keys: ~/.config/PAI/.env (symlinked from ~/.claude/.env)
- Security: patterns.yaml in PAI/USER/PAISECURITYSYSTEM/ (REQUIRED for SecurityValidator)
- Events: events.jsonl append-only log (121+ events from multiple hook sources)
- Tests: hooks/tests/ with harness.ts, 76 tests across 12 suites (local), 18 tests for upstream PR

## Known Issues (resolved)
- ~~Wisdom pipeline disconnected~~ → WisdomSync.hook.ts created, ratings → WISDOM + FRAMES
- ~~RelationshipMemory wrong event~~ → moved from SessionEnd to Stop
- ~~TrendingAnalysis.ts missing~~ → restored from v3 backup to tools/
- ~~.env symlink missing~~ → restored ~/.claude/.env → ~/.config/PAI/.env
- ~~WISDOM/FRAMES/ missing~~ → 5 frames bootstrapped from JSON
- ~~WisdomSync permission denied~~ → chmod +x (2026-03-02)
- ~~PreCompact permission denied~~ → chmod +x (2026-03-02)
- ~~SecurityValidator fail-open~~ → created patterns.yaml (2026-03-02)
- ~~RatingCapture 52% false-positive 5s~~ → prompt fix + data cleanup, 192→92 entries (2026-03-02)
- ~~settings.json in readOnly~~ → moved to confirmWrite in patterns.yaml (2026-03-02)

## Development Patterns (CRITICAL)
- **Always chmod +x** new .hook.ts files — shell executes them directly via shebang
- **Always create patterns.yaml** when setting up SecurityValidator — без него система декоративна
- **Always run `bun test hooks/tests/`** after hook changes — 76 tests across 12 suites verify nervous system
- **getPaiDir()** from lib/paths.ts — canonical way to get PAI base dir. 11 hooks migrated (2026-03-02). Only harness.ts and notifications.ts still use direct env access

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
- **PR #840**: feat/mode-classifier-hook — ModeClassifier hook (OPEN)
- **PR #859**: feat/hook-test-harness — Test harness + patterns.example.yaml (OPEN)
- **PR #860**: fix/rating-false-positives — RatingCapture prompt fix, closes #842 (OPEN)
- **PR #861**: fix/algorithm-stoploop-regex — stopLoop guard + regex escaping (OPEN)

## Lessons Learned (CRITICAL)
- **Директория ≠ один файл**: перед выводом о состоянии директории — ВСЕГДА `ls` сначала. TELOS.md — шаблон, данные в 22 файлах рядом
- **Негативные выводы агентов перепроверять**: "X пустой/отсутствует/не работает" — проверить лично перед передачей Ivan
- **Миграции фиксировать в памяти**: v3→v4 миграция TELOS (commit 74bb626) не была записана → новая сессия не знала

## Session Patterns
- Rating trend: UP (last 7d avg 6.6/10, last 10: 7.4/10)
- Common frustration: English responses when Russian expected
- Common success: parallel agent delegation for audits
