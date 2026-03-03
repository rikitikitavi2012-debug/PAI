# PAI Auto Memory

## User Preferences
- Ivan: Russian language for all responses, English only for code/technical terms/git
- Solo entrepreneur mindset - no corporate solutions
- MVP first, iterate by feedback
- Prefers automation over manual instructions
- Values proactive bug detection and fixing

## Architecture (v4.0.3)
- 3-layer mode classification: ModeClassifier hook (regex) -> Complexity Gate (LLM) -> Algorithm file
- Hooks: 30 files (.hook.ts), all defensive/fail-open, ALL must have chmod +x. EventLogger.hook.ts handles SubagentStart/SubagentStop/TaskCompleted via routing table
- Memory: MEMORY/ (LEARNING, WISDOM, RELATIONSHIP, WORK, STATE, SECURITY)
- TELOS: PAI/USER/TELOS/ — 23 файла (MISSION, GOALS, CHALLENGES, STRATEGIES, BELIEFS, MODELS, NARRATIVES, PROJECTS, IDEAS, PREDICTIONS, STATUS, WISDOM, FRAMES, BOOKS, MOVIES, LEARNED, TRAUMAS, WRONG, PROBLEMS, README, updates). TELOS.md — только index/шаблон, данные в отдельных файлах!
- Context: loadAtStartup (3 files) + CONTEXT_ROUTING.md (on-demand)
- API keys: ~/.config/PAI/.env (symlinked from ~/.claude/.env)
- Security: patterns.yaml in PAI/USER/PAISECURITYSYSTEM/ (REQUIRED for SecurityValidator)
- Events: events.jsonl append-only log (270+ events, 12 types). Consumer: `bun PAI/Tools/EventStats.ts` (types/daily/sources/recent/overview). PRDSync has change detection — only emits on real structural changes (phase/progress/task/effort/criteria)
- Inference: 5 providers via `bun PAI/Tools/Inference.ts --level <fast|standard|smart|gemini|glm5>` (3 companies: Anthropic, Google, Zhipu AI)
- Tests: hooks/tests/ with harness.ts, 171 tests across 34 suites (84 original + 52 from Jules batch 1-3 + 17 tool tests + 8 PR#6 + 10 EventRotation)
- JulesAutoMerge: `bun PAI/Tools/JulesAutoMerge.ts check|merge|status` — auto-tests in worktree, merges passing PRs

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
- ~~PRDSync 40% event noise~~ → change detection added, only syncs on structural changes (2026-03-02, 037c79d)
- ~~CRIT-01: SecurityValidator triple fail-open~~ → hardcoded fallback blocks, timeout 500ms (2026-03-03, b8d9551)
- ~~CRIT-02: WorktreeRemove path traversal~~ → resolve() + trailing slash (2026-03-03, b8d9551)
- ~~HIGH-01: LoadContext 20s blocking~~ → timeout 20s→5s, ghQuery 15s→4s (2026-03-03, 8d95338)
- ~~HIGH-03: Silent catch blocks~~ → Jules PR #11 добавил error logging (2026-03-03)

## Development Patterns (CRITICAL)
- **Always chmod +x** new .hook.ts files — shell executes them directly via shebang
- **Always create patterns.yaml** when setting up SecurityValidator — без него система декоративна
- **Always run `bun test hooks/tests/`** after hook changes — 171 tests across 34 suites verify nervous system
- **getPaiDir()** from lib/paths.ts — canonical way to get PAI base dir. 11 hooks migrated (2026-03-02). Only harness.ts and notifications.ts still use direct env access
- **WorktreeCreate/Remove — FUNCTIONAL hooks** (не notification!). WorktreeCreate ЗАМЕНЯЕТ встроенный git worktree add. ОБЯЗАН: создать worktree + вывести путь на stdout. Пустой stdout = agent spawn failure. Починено 2026-03-02 (d376658)
- **Pure event-only hooks → EventLogger**: Хуки которые ТОЛЬКО логируют в events.jsonl должны быть handlers в EventLogger.hook.ts, а не отдельные файлы. Routing table pattern: HANDLERS[hook_event_name] → handler function
- **PostToolUseFailure НЕ существует** как Claude Code hook event. Tool failures обрабатываются через PostToolUse (2026-03-02)

## Jules Integration (Google AI Coding Agent)
- **API**: REST API at jules.googleapis.com/v1alpha/, key in JULES_API_KEY (.env)
- **Repos**: PAI-personal (private, master), PAI (public, main), Construction-Orchestrator, Obsidian
- **Workflow**: Navi (architect, complex) → Jules (async worker, tests/bugs/deps/TODOs) → PR → Navi reviews via gh CLI
- **CLI tool**: `bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts` (sources|sessions|create|status|approve|message)
- **AGENTS.md**: Created in repo root — tells Jules about Bun, hooks, test patterns, security boundaries
- **Proactive features**: Enabled on PAI-personal (1/5 repos) — auto-finds TODOs, performance issues, security issues
- **Limits**: Pro plan = 100 tasks/day, 15 concurrent. Failed tasks consume quota.
- **Best for**: Writing tests (18 hooks uncovered), dependency updates, TODO resolution, security/performance scans
- **NOT for**: Architecture, complex refactoring, MEMORY/USER files, settings.json, .env
- **PR management**: `gh pr list/diff/merge --repo rikitikitavi2012-debug/PAI-personal`
- **Can use on ANY repo**: `JULES_REPO=sources/github/rikitikitavi2012-debug/REPO JULES_BRANCH=main bun JulesAPI.ts create "prompt"` (full source path required!)
- **JulesAutoMerge**: `bun PAI/Tools/JulesAutoMerge.ts check|merge|status` — tests → A0 review → merge. isProcessed() only skips merged/skipped, failed_* are retryable
- **HealthMonitor**: `bun PAI/Tools/HealthMonitor.ts` — checks A0, VoiceServer, gh CLI → MEMORY/STATE/health-report.json

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
- **PR #864**: fix/PAIUpgrade — hardcoded skill path after v3→v4 migration (OPEN)
- **PR #882**: fix(hooks) — UTF-16 surrogate pair splitting in RatingCapture (OPEN)
- **PR #883**: docs — fix dead references in CONTEXT_ROUTING.md (OPEN)
- **JulesAutoMerge --admin**: Required for PAI-personal repo — нужно добавить флаг в pipeline
- **Jules Coding Plan task** (sessions/16877413060062799985): MEDIUM fixes MED-03/05/10 — IN_PROGRESS

## Lessons Learned (CRITICAL)
- **Директория ≠ один файл**: перед выводом о состоянии директории — ВСЕГДА `ls` сначала. TELOS.md — шаблон, данные в 22 файлах рядом
- **Негативные выводы агентов перепроверять**: "X пустой/отсутствует/не работает" — проверить лично перед передачей Ivan
- **Миграции фиксировать в памяти**: v3→v4 миграция TELOS (commit 74bb626) не была записана → новая сессия не знала
- **Agent Zero research = 10min timeout**: Research tasks with browser+search take 2-5min. Default 5min timeout too short. Increased to 10min (600000ms)
- **JulesAutoMerge outputs[] bug**: Jules API returns PR in outputs[1] (not [0]). outputs[0]=changeSet, outputs[1]=pullRequest. Always search all outputs.
- **Jules creates PRs as user**: Author is user account (rikitikitavi2012-debug), NOT app/jules-google. Don't filter by author.
- **gh pr merge --admin**: Required for PAI-personal repo (personal access token lacks merge permissions without --admin)
- **A0 Integration plan**: MEMORY/RESEARCH/2026-03/agent-zero-integration-plan.md — 5 coding integrations ranked by ROI

## Gemini CLI (Google's Claude Code analog)
- **Installed**: v0.31.0, path: ~/.npm-global/bin/gemini
- **Auth**: GOOGLE_API_KEY + GEMINI_API_KEY from ~/.config/PAI/.env, loaded in .bashrc
- **Limits**: Free 1000 req/day (Flash), Pro = 5x limits + Pro model (Ivan has Pro sub)
- **Jules extension**: gemini-cli-jules v0.1.0 installed, MCP server for Jules integration
- **Config**: ~/.gemini/ (settings, extensions, projects)
- **Use cases**: Alternative coding agent, Jules integration via CLI, parallel with Claude Code

## Z.AI / GLM-5 (Zhipu AI — 智谱AI)
- **Company**: Zhipu AI, Beijing. IPO Jan 2026 (HK: 02513), $6.8B valuation. Chinese jurisdiction = NO geo-blocks for Russia
- **GLM-5**: 744B MoE, 77.8% SWE-bench, 200K context, MIT license. Released 2026-02-11
- **Subscription**: Coding plan (middle tier), user ID: 24561766597642761
- **API Key**: ZAI_API_KEY in ~/.config/PAI/.env. Env var Z_AI_API_KEY exported in .bashrc
- **Coding endpoint**: `https://api.z.ai/api/coding/paas/v4/chat/completions` (subscription). Regular endpoint (api/paas/v4/) requires token balance — will return error 1113
- **Inference**: `bun PAI/Tools/Inference.ts --level glm5` — 5th provider, native fetch (no CLI needed, no proxy needed)
- **Response format**: `reasoning_content` (thinking) + `content` (answer). Need max_tokens≥1000 for content
- **zai-cli**: v1.1.0 installed globally. Commands: vision, search, read, repo, tools, call, doctor, code
- **MCP tools**: 13 total — vision (8: analyze_image, extract_text, diagnose_error, ui_diff, etc.), search (1: webSearchPrime), reader (1: webReader), zread (3: search_doc, read_file, get_repo_structure)
- **MCP in Claude Code**: zai-vision MCP server added in settings.json (stdio via npx @z_ai/mcp-server@latest)
- **Anthropic-compatible endpoint**: `https://api.z.ai/api/anthropic` — strategic backup if Anthropic blocks Russia
- **Strategic value**: 3rd AI provider (Anthropic + Google + Zhipu). Direct access from Russia = geo-block resilience

## Agent Zero (Autonomous AI Agent on VPS)
- **Server**: http://72.56.86.51:50002 (container 2 — primary brain)
- **Auth**: A0_API_TOKEN in ~/.config/PAI/.env, used as X-API-KEY header
- **LLM**: claude-sonnet-4-6 (Anthropic), agent0 profile
- **CLI tool**: `bun PAI/Tools/AgentZero.ts` (message|async|log|terminate|health|scheduler)
- **REST API**: `/api_message` (sync, blocks 5min), `/message_async` (fire-forget), `/api_log_get`, `/api_terminate_chat`
- **Scheduler**: CSRF-protected (web UI only), `/scheduler_tasks_list` needs web session
- **Skills (9)**: a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, telos, the-algorithm, create-skill
- **Tools (14)**: code_execution_tool, browser_agent, call_subordinate, search_engine, document_query, vision_load, memory_*, behaviour_adjustment, response, input, wait, notify_user, a2a_chat, scheduler:*
- **Scheduled tasks**: ULC Context Summary (daily 06:00 MSK), TELOS Update (adhoc)
- **MCP**: SSE endpoint configured in settings.json, WORKING after Ivan enabled in A0 UI (tools: send_message, finish_chat)
- **A2A**: Agent card works (/.well-known/agent.json), task submission returns 500
- **Fork repos**: agent-zero-custom (private), agent-zero-skills (public, 5 skills)
- **Containers**: 1=backup old version, 2=primary brain (50002), 3=planned construction orchestrator
- **Cost model**: Оплата по API вызовам (НЕ подписка). Можно поставить Coding Plan API key для экономии. Контролировать расходы!
- **GitHub token**: У A0 есть свой GitHub token — может читать PR diffs, repo structure напрямую
- **JulesAutoMerge A0 review**: Встроен — после тестов A0 ревьюит diff (16.9с, 4 issues found in test). HIGH severity блокирует merge. Если A0 unreachable — proceed (fail-open)
- **Best for**: Deep research, code execution, browser tasks, document generation, DevOps, scheduled maintenance, code review
- **NOT for**: Real-time interactive work (22s latency), settings changes (CSRF), sensitive PAI config

## Voice System (ElevenLabs Creator plan, 2026-03-03)
- **API key**: ~/.config/PAI/.env → ELEVENLABS_API_KEY (Creator plan, 100K chars/month)
- **VoiceServer**: localhost:8888, reads from settings.json daidentity.voices
- **Model**: eleven_turbo_v2_5 (supports Russian on any voice)
- **Voice Map (6 roles):**
  | Role | Voice | ID | Agents |
  |------|-------|----|--------|
  | Navi (main) | Станислав | ogi2DyUAKJb7CEdqqvlU | DA, hooks, skills, system |
  | Algorithm | Николай | 3EuKHIEZbSzrHGNmdYsx | Algorithm phases, tracker |
  | Engineer | Дмитрий | hU3rD0Yk7DoiYULTX1pD | Engineer, Architect |
  | Researchers | Олег | MWyJiWDobXN8FX3CJTdE | 5 researchers, Intern, BrowserAgent |
  | Security | Алекс | TUQNWEvVPBLzMBSVDPUA | Pentester, QATester, UIReviewer |
  | Creative | Марина | ymDCYd8puC7gYjxIamPt | Artist, Designer |
- **Voice resolution**: hooks use `getVoiceId()` (main) or `getAlgorithmVoice()` from identity.ts → reads settings.json
- **All messages in Russian** — no English voice notifications

## Brigade Pipeline (инструменты бригады)
- **Navi (Claude)**: Руководитель — архитектура, triage, делегирование, code review
- **Jules**: Async кодер — тесты, баги, рефакторинг. Использовать **Coding Plan** (детальный промпт с файлами/шагами/критериями)
- **A0**: Deep review, security аудит, code review в JulesAutoMerge pipeline
- **Gemini**: Второе мнение, независимый triage, альтернативный анализ. `gemini` CLI
- **Z.AI**: Web search (`zai-cli search`), vision analysis, repo analysis. **НУЖНО АКТИВНЕЕ** — Ivan хочет отрабатывать подписку
- **Z.AI в pipeline**: Добавить как reviewer/analyst рядом с A0 (code review, pattern analysis, vision для UI)
- **Ivan хочет**: Чаще использовать Coding Plan для Jules, активнее Z.AI, каждый инструмент на своём месте

## Стратегические направления (следующие сессии)
1. **Z.AI интеграция в pipeline** — добавить Z.AI как code reviewer (zai-cli call для анализа diff), vision для UI проверок
2. **JulesAutoMerge --admin fix** — автоматический --admin флаг для PAI-personal repo
3. **events.jsonl rotation** — Jules задача IN_PROGRESS (MED-03)
4. **fetch timeout во всех хуках** — Jules задача IN_PROGRESS (MED-05)
5. **Upstream PR follow-up** — 7 PR открыты, через 3-5 дней пинг maintainer
6. **LOW findings (8 шт)** — батчить в следующую итерацию, не срочно
7. **A0 scheduled tasks** — расширить (weekly security scan, daily health check)

## Session Patterns
- Rating trend: UP (last 7d avg 6.6/10, last 10: 7.4/10, today: 9/10)
- Common frustration: English responses when Russian expected
- Common success: parallel agent delegation for audits
- Ivan wants: активное использование Z.AI, Gemini, Coding Plan — все инструменты бригады
