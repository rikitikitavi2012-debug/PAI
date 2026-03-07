# PAI Auto Memory

## User Preferences
- Ivan: Russian language for all responses, English only for code/technical terms/git
- Solo entrepreneur mindset - no corporate solutions
- MVP first, iterate by feedback
- Prefers automation over manual instructions
- Values proactive bug detection and fixing

## Miessler Philosophy — EMBEDDED (2026-03-03)
- 9 principles in CLAUDE.md Philosophy section (loaded every session)
- Full reference: `MEMORY/RESEARCH/2026-03/miessler-philosophy.md`
- Council Debate insight: "Нервная система = таблица прерываний. Вшивай только то что меняет решение в первые 5 минут."
- YAML refactoring: Jules PR #16 merged (vocabularies extracted)

## Architecture (v4.0.3)
- 3-layer mode classification: ModeClassifier hook (regex) -> Complexity Gate (LLM) -> Algorithm file
- Hooks: 30 files (.hook.ts), all defensive/fail-open, ALL must have chmod +x. EventLogger.hook.ts handles SubagentStart/SubagentStop/TaskCompleted/InstructionsLoaded/TeammateIdle via routing table
- Memory: MEMORY/ (LEARNING, WISDOM, RELATIONSHIP, WORK, STATE, SECURITY)
- TELOS: PAI/USER/TELOS/ — 23 файла (MISSION, GOALS, CHALLENGES, STRATEGIES, BELIEFS, MODELS, NARRATIVES, PROJECTS, IDEAS, PREDICTIONS, STATUS, WISDOM, FRAMES, BOOKS, MOVIES, LEARNED, TRAUMAS, WRONG, PROBLEMS, README, updates). TELOS.md — только index/шаблон, данные в отдельных файлах!
- Context: loadAtStartup (3 files) + CONTEXT_ROUTING.md (on-demand)
- API keys: ~/.config/PAI/.env (symlinked from ~/.claude/.env)
- Security: patterns.yaml in PAI/USER/PAISECURITYSYSTEM/ (REQUIRED for SecurityValidator)
- Events: events.jsonl append-only log (270+ events, 12 types). Consumer: `bun PAI/Tools/EventStats.ts` (types/daily/sources/recent/overview). PRDSync has change detection — only emits on real structural changes (phase/progress/task/effort/criteria)
- Inference: 5 providers via `bun PAI/Tools/Inference.ts --level <fast|standard|smart|gemini|glm5>` (3 companies: Anthropic, Google, Zhipu AI)
- Tests: hooks/tests/ with harness.ts, 230 tests across 40 suites
- **v2.1.70 settings**: `includeGitInstructions: false` (saves ~2K tokens), InstructionsLoaded/TeammateIdle hooks in EventLogger
- **TeammateIdle**: responds `{"continue": false}` to stop idle teammates automatically
- **Claude Code v2.1.70 features used**: HTTP hook type, InstructionsLoaded event, TeammateIdle event, agent_type in SubagentStop, `${CLAUDE_SKILL_DIR}` variable
- JulesAutoMerge: `bun PAI/Tools/JulesAutoMerge.ts check|merge|status` — auto-tests in worktree, merges passing PRs

## Development Patterns (CRITICAL)
- **TUI/Kitty Visual Verification Pattern (CRITICAL, 9/10 rated)**:
  1. Сделать изменение в скрипте
  2. `bash -n script.sh` — проверить синтаксис
  3. Перезапустить скрипт в kitty: `kitty @ send-text --match id:N 'q'` + `kitty @ send-text --match id:N 'script.sh\n'` (НЕ exec — иначе таб умрёт при выходе)
  4. `kitty @ focus-tab --match title:"TAB" && sleep 2 && bun PAI/Tools/ZaiVision.ts screenshot` — скриншот
  5. Прочитать скриншот через Read — визуально проверить результат
  6. Итерировать если нужно, коммитить только после визуального подтверждения
  - Без этого цикла НЕ говорить "готово". Причина: 3+ сессий делали Telemetry таб вслепую — каждый раз баги
- **Kitty TUI правила**: `printf %-Ns` ломается на кириллице (считает байты, не символы) — использовать `wc -L` + ручной padding. Двухколоночные лейауты с ANSI ломают выравнивание — предпочитать single-column compact. Контент должен влезать в ~35 строк (типичный терминал)
- **Kitty symlinks**: скрипты в `~/.claude/config/kitty/` должны быть слинкованы в `~/.config/kitty/`. Новые файлы (lib/*.sh) НЕ линкуются автоматически — создавать `ln -sf` руками
- **Always chmod +x** new .hook.ts files — shell executes them directly via shebang
- **Always create patterns.yaml** when setting up SecurityValidator — без него система декоративна
- **Always run `bun test hooks/tests/`** after hook changes — 230 tests across 40 suites verify nervous system
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
- **PR #918**: feat(hooks) — unified event system with typed events and routing table (OPEN)
- **JulesAutoMerge --admin**: Required for PAI-personal repo — нужно добавить флаг в pipeline
- **Jules Coding Plan task** (sessions/16877413060062799985): MEDIUM fixes MED-03/05/10 — IN_PROGRESS

## Lessons Learned (CRITICAL)
- **Негативные выводы агентов перепроверять**: "X пустой/отсутствует/не работает" — проверить лично
- **A0 self-inspection > external probing**: Ask A0 to check its own filesystem — faster and more reliable than agents or SSH
- **Agent delegation for A0 tasks = overhead**: A0 is single-threaded bottleneck, direct queries beat parallel agents
- **Extracting large files from A0 via API**: Files >50 lines trigger §§include. Workarounds: `head -N` chunks, base64, or ask A0 to git push files. Best: A0 pushes to PAI-personal repo
- **AGENTS.md critical for Jules onboarding**: Without architecture docs, Jules guesses patterns wrong. Extension API (`extras_temporary`, not `history.messages`) is non-obvious trap
- **JulesAutoMerge outputs[] bug**: outputs[0]=changeSet, outputs[1]=pullRequest. Always search all outputs
- **gh pr merge --admin**: Required for PAI-personal repo
- **jq pipeline context**: `length as $total` ДОЛЖЕН быть в начале pipeline, ДО select-цепочек
- **git index.lock**: Параллельные агенты создают stale locks. Автоочистка в .bashrc
- **Jules on ANY repo**: `JULES_REPO=sources/github/USER/REPO JULES_BRANCH=main bun JulesAPI.ts create "prompt"` — works for agent-zero-custom too

## Gemini CLI
- **Installed**: v0.31.0, `gemi` alias. Pro sub, 5x limits. Config: ~/.gemini/

## Z.AI / GLM-5 (Zhipu AI — 智谱AI)
- **Company**: Zhipu AI, Beijing. IPO Jan 2026 (HK: 02513), $6.8B valuation. Chinese jurisdiction = NO geo-blocks for Russia
- **GLM-5**: 744B MoE, 77.8% SWE-bench, 200K context, MIT license. Released 2026-02-11
- **Subscription**: Coding plan (middle tier), user ID: 24561766597642761
- **API Key**: ZAI_API_KEY in ~/.config/PAI/.env. Env var Z_AI_API_KEY exported in .bashrc
- **Coding endpoint**: `https://api.z.ai/api/coding/paas/v4/chat/completions` (subscription). Regular endpoint (api/paas/v4/) requires token balance — will return error 1113
- **Inference**: `bun PAI/Tools/Inference.ts --level glm5` — 5th provider, native fetch (no CLI needed, no proxy needed)
- **Response format**: `reasoning_content` (thinking) + `content` (answer). Vision needs max_tokens≥8000 (reasoning eats 80%+ tokens, content empty if <4000)
- **zai-cli**: v1.1.0 installed globally. Commands: vision, search, read, repo, tools, call, doctor, code. **BROKEN**: search MCP server fails → blocks all `zai-cli vision` calls. Use direct API fetch instead
- **MCP tools**: 13 total — vision (8: analyze_image, extract_text, diagnose_error, ui_diff, etc.), search (1: webSearchPrime), reader (1: webReader), zread (3: search_doc, read_file, get_repo_structure)
- **MCP in Claude Code**: zai-vision MCP server added in settings.json (stdio via npx @z_ai/mcp-server@latest)
- **ZaiVision CLI**: `bun PAI/Tools/ZaiVision.ts screenshot|analyze|diff|check` — direct API fetch (bypasses broken zai-cli). Screenshot via PowerShell .NET (WSL2). Auto-resize via ImageMagick `convert`. Model: glm-4.6v
- **WSL2 screenshot**: Only PowerShell works. No grim/slurp/import. Captures full screen (not just Kitty window)
- **Anthropic-compatible endpoint**: `https://api.z.ai/api/anthropic` — strategic backup if Anthropic blocks Russia
- **Strategic value**: 3rd AI provider (Anthropic + Google + Zhipu). Direct access from Russia = geo-block resilience

## Agent Zero (Autonomous AI Agent on VPS)
- **Server**: http://72.56.86.51:50002 (container 2 — primary brain)
- **Auth**: A0_API_TOKEN in ~/.config/PAI/.env, used as X-API-KEY header
- **LLM**: Z.AI GLM-5 (chat) + OpenCode Zen Kimi 2.5 (utility). Провайдер переключаемый (Anthropic, OpenRouter, OpenAI)
- **CLI tool**: `bun PAI/Tools/AgentZero.ts` (message|async|log|terminate|health|scheduler)
- **REST API**: `/api_message` (sync, blocks 5min, API key auth), `/api_log_get`, `/api_terminate_chat`. NOTE: `/message_async` requires web session (CSRF) — NOT usable with API key! Async pattern: use `/api_message` with 30s timeout instead
- **Scheduler**: CSRF-protected (web UI only), `/scheduler_tasks_list` needs web session
- **Skills (9)**: a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, telos, the-algorithm, create-skill
- **Tools (14)**: code_execution_tool, browser_agent, call_subordinate, search_engine, document_query, vision_load, memory_*, behaviour_adjustment, response, input, wait, notify_user, a2a_chat, scheduler:*
- **Scheduled tasks**: ULC Context Summary (daily 06:00 MSK), TELOS Update (adhoc)
- **MCP**: SSE endpoint configured in settings.json, WORKING after Ivan enabled in A0 UI (tools: send_message, finish_chat)
- **A2A**: Agent card works at `/a2a/t-TOKEN/.well-known/agent.json`, POST returns 500 (fasta2a v0.5.0 bug — ValidationError unhandled in _agent_run_endpoint). NOT fixable without upstream patch. Low priority — API Message + MCP cover all needs
- **Fork repos**: agent-zero-custom (private, **source of truth for A0 customizations**), agent-zero-skills (public, 5 skills)
- **agent-zero-custom repo (2026-03-07)**: extensions, skills, prompts, behaviour.md, tests, AGENTS.md, sync-to-container.sh. Jules task: sessions/6833095862033329097 (extension tests). Deploy: `./sync-to-container.sh`
- **Extension numbering**: _80-_89 = наш range. Upstream: _10-_75 + _90+. Безопасно от конфликтов
- **Architecture research**: `MEMORY/RESEARCH/2026-03/a0-architecture-for-customization.md` — 20+ hook types, plugin-based, `/a0/usr/` = safe zone
- **Containers**: 1=backup old version, 2=primary brain (50002), 3=planned construction orchestrator
- **Cost model**: Оплата по API вызовам (НЕ подписка). Можно поставить Coding Plan API key для экономии. Контролировать расходы!
- **GitHub token**: У A0 есть свой GitHub token — может читать PR diffs, repo structure напрямую
- **JulesAutoMerge A0 review**: Встроен — после тестов A0 ревьюит diff (16.9с, 4 issues found in test). HIGH severity блокирует merge. Если A0 unreachable — proceed (fail-open)
- **Best for**: Deep research, code execution, browser tasks, document generation, DevOps, scheduled maintenance, code review
- **NOT for**: Real-time interactive work (22s latency), settings changes (CSRF), sensitive PAI config
- **Context sync (2026-03-06)**: Old TELOS/ULC/master_plan cleaned. Variant A: TELOS only in Navi, A0 gets context per-task
- **Scaffolding embedded (2026-03-07)**: Miessler 9 principles in system prompt, ISC+Flywheel+Steering Rules in behaviour.md, ISC+Flywheel in the-algorithm skill, 10 failure patterns in FAISS memory, 2 custom extensions (learn_enforcer, wisdom_injector). Container 1 (50001) = escape hatch for managing container 2
- **Architecture dump**: MEMORY/STATE/a0-architecture-dump.json (394 lines, commit 03705c0)
- **A0 version**: v0.9.8.2. LLM: GLM-5 (chat), kimi-k2.5 (utility), claude-opus-4-6 (browser)
- **Memory**: FAISS + paraphrase-multilingual-MiniLM-L12-v2. CRITICAL: threshold 0.3 for Russian (not 0.7!)
- **Subordinates**: developer (coding), researcher (analysis), hacker (security), default (general) — all have all tools
- **8 skills**: a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, telos, the-algorithm
- **8 scheduled tasks**: Security Scan (Sun), Health Check (daily), TELOS Integrity (Mon), PAI Sync (daily), Learning Mining (Mon), Memory Compaction (1st), Competitive Intel (Sun), PAI Snapshot (1st)
- **Extensions**: 20 hook types (Python), lifecycle events from agent_init to error_format. Custom: `_80_learn_enforcer.py` (MO13 Flywheel reminder every 10 msgs), `_81_wisdom_injector.py` (random 2 of W1-W9/FR wisdom per loop). CRITICAL: Extension API uses `loop_data.extras_temporary[key]`, NOT `self.agent.history.messages` (doesn't exist!). History structure: `history.topics[-1].messages` (list of messages in current topic)
- **A0 output quirk**: §§include() pattern now parsed by AgentZero.ts — replaced with `[A0: large output saved to file on container]` marker (commit bcce29d)
- **Container 1 escape hatch**: Port 50001, v0.9.7-10, SSH to docker host (172.18.0.1, user: agentzero). Quick-ref: `MEMORY/STATE/a0-container-escape-hatch.md`
- **Volume mount**: `/a0` = persistent ext4 volume (`/dev/sda1`), NOT ephemeral. Extensions/skills/memory survive container restarts
- **API retry**: apiCall() retries once on 429/5xx with 2s backoff, also ECONNREFUSED (commit bcce29d)
- **MCP SSE**: Works e2e (send_message, finish_chat via JSON-RPC). Session persistence via `chat_id`. NOT available as Claude Code deferred tools. SSE data has trailing `\r`, response events sometimes duplicate. Use `/api_message` as primary channel
- **Scheduler API**: scheduler:create_scheduled_task, scheduler:run_task, scheduler:list_tasks — A0 can self-manage tasks
- **Key insight for task delegation**: Use subordinate profiles! `call_subordinate` with profile=developer for code, researcher for analysis, hacker for security
- **Chat streaming**: Web UI uses Socket.IO (Same-Origin only, NOT for external). TUI uses `/api_log_get` polling 3s. Log item types: user, response, agent, code_exe, tool, util. CRITICAL: response heading="A0: Responding" — show CONTENT not heading! Strip `icon://` from headings.
- **Full API reference**: `MEMORY/RESEARCH/2026-03/a0-streaming-api.md` (15+ endpoints documented)

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

## Brigade Pipeline (3-tier классификация, 2026-03-05)
- **T1 Autonomous Agents** (получают задачу, работают сами):
  - **Navi (Claude)**: Руководитель — архитектура, triage, делегирование. PAI контекст = только Navi
  - **Jules**: Async кодер — тесты, баги, рефакторинг. Coding Plan (детальный промпт)
  - **A0**: 24/7 VPS — deep research, browser, code execution, DevOps. LLM: Z.AI GLM-5 + Kimi 2.5
  - **OpenCode CLI**: Мульти-провайдер кодер. `opencode run "задача"` — headless, Navi вызывает программно. `-m provider/model` для выбора модели. Кодинг P1/P3 проектов, code review, мульти-модель анализ
- **T2 CLI Agents** (только интерактивные, Ivan в отдельном окне):
  - **Gemini CLI**: Второе мнение, cross-check. Нет headless mode — только `gemi` интерактивно
- **T3 Tools** (программный вызов, без автономии):
  - **GLM-5**: Inference.ts --level glm5. Bulk inference, стратегический резерв
  - **zai-cli**: MCP vision/search/read. ZaiVision.ts для скриншотов
- **Алиасы с прокси**: `pai` (Claude), `gemi` (Gemini), `oc` (OpenCode) — все через NL VPS
- **Ivan хочет**: Каждый инструмент на своём месте, Navi управляет автономно

## A0 Results Pipeline (2026-03-06)
- **Git = Message Bus**: A0 → PAI-personal → Navi pulls at session start (LoadContext hook)
- **AgentZero.ts poll**: manual check. Async: 30s timeout, graceful "delivered"
- **Comms (2026-03-07)**: PRIMARY = `/api_message` + X-API-KEY. SECONDARY = MCP SSE. A2A broken (fasta2a bug)

## Brigade Pipeline Improvements (2026-03-08)
- **JulesAutoMerge 3 repos**: PAI-personal (adminMerge), PAI (review-only), agent-zero-custom (auto)
- **Python test detection**: conftest.py/requirements*.txt → pytest venv at `.venv-pytest/`
- **adminMerge flag**: `--admin` only for repos with branch protection (PAI-personal). Free repos = no --admin
- **Enhanced dashboard**: Jules active tasks, PRs across 3 repos, A0 heartbeat time
- **A0 auto-recovery**: `bun HealthMonitor.ts recover` — Container 1 → SSH → docker restart container 2. 30min cooldown, events.jsonl logging, voice notifications
- **Z.AI false positives**: Z.AI sometimes reports HIGH on valid code (truncated test files). Manual override needed
- **Jules on a0 repo**: 6 tasks created (extensions tests, tools tests, telegram bot tests, security audit, CI). Mock ALL deps via sys.modules — Jules часто забывает
