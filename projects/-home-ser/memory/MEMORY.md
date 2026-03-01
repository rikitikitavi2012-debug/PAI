# PAI Environment Memory

## User: Ivan
- Construction foreman, landscaping/MAF, St. Petersburg
- Email: riki.tiki.tavi.2012@gmail.com
- GitHub: rikitikitavi2012-debug
- Speaks Russian primarily
- WSL2 Ubuntu 24.04 on Windows 11 Pro
- Uses VPN tunnel: SSH SOCKS5 → privoxy → xray-vps (72.56.99.127)
- Timezone: Europe/Moscow

## Core Missions (TELOS)
- **M0 Независимость** — финансовая свобода от найма к 2028. Накоплено 3.5 млн ₽, бизнес МАФ параллельно с работой
- **M1 Инновации** — AI-инструменты для строительной ниши (Цифровой Прораб Q1 2026, Construction Orchestrator Q4 2026)
- **M2 Семья и Дом** — дом в горах, Былым КБ. Продажа квартиры Тырныауз → земля 2026 → строительство 2027-2028
- **M3 Техно-суверенитет** — своя инфраструктура, обход блокировок РФ. VPS NL + Venice AI + Agent Zero
- **Приоритет:** M0 и M1 — основной фокус 2026. Всегда проверять: "эта задача двигает к M0/M1?"

## Infrastructure
- **agentzero** (72.56.86.51): 8GB RAM, 3 Agent Zero Docker containers (ports 50001-50003)
- **xray-vps** (72.56.99.127): 1GB RAM, Xray proxy on 443, VPN tunnel
- SSH key: ~/.ssh/id_rsa (shared for both)
- SSH config: ~/.ssh/config (aliases: agentzero, xray-vps)

## PAI Setup
- PAI 4.0.1, Algorithm v3.5.0, CC 2.1.63
- MCP: Exa (exa-mcp-server)
- Voice: ElevenLabs free tier, Rachel voice (21m00Tcm4TlvDq8ikWAM)
- **Voice Server:** systemd user service `pai-voice.service` — автозапуск
  - Управление: `systemctl --user {status|restart|stop} pai-voice`
  - Логи: `journalctl --user -u pai-voice -f`
  - Код: `~/.claude/VoiceServer/server.ts`
  - 402 fallback: платные голоса автоматически переключаются на Rachel
  - Требует proxy env vars (HTTP_PROXY/HTTPS_PROXY) для Bun fetch через VPN
  - Требует PULSE_SERVER=/mnt/wslg/PulseServer для аудио в WSL
- Statusline: audited (2026-02-26). 6 bugs fixed: SF coords→SPb, dead functions removed, dup dir_name, stale counts, jq consolidated
- Docker running in WSL (not Docker Desktop)
- Playwright + Chromium installed

## Key Files
- `~/.claude/settings.json` — PAI settings, MCP config
- `~/.claude/statusline-command.sh` — statusline (1320 lines, audited)
- `~/.claude/skills/PAI/Tools/TranscriptRotation.sh` — ротация транскриптов (--dry-run, --keep-days, --compress-days)
- `~/.claude/skills/PAI/USER/INFRASTRUCTURE.md` — server docs
- `~/.claude/skills/PAI/USER/TELOS/` — 22 files (updated 2026-02-21, OpenCode refs cleaned)
- `~/.config/systemd/user/pai-voice.service` — voice server systemd unit
- `~/.claude/skills/PAI/Templates/PROJECT_CLAUDE_MD.md` — шаблон project CLAUDE.md

## Project CLAUDE.md Best Practices (researched 2026-02-22)
- Шаблон: `~/.claude/skills/PAI/Templates/PROJECT_CLAUDE_MD.md`
- Отчёт: `~/.claude/MEMORY/WORK/claude-md-research-2026-02-22/RESEARCH_REPORT.md`
- Идеал: < 80 строк, только то что Claude не угадает сам
- Секции: Commands > Architecture > Gotchas > Code Style > Testing > Key Decisions > Environment
- Rules: `.claude/rules/*.md` для модульных правил, path-specific через YAML frontmatter
- Progressive disclosure: `@docs/file.md` для деталей
- НЕ дублировать глобальный PAI (identity, algorithm, hooks)

## Google Drive Access from WSL
- Google Drive Desktop (`G:\`) НЕ монтируется в WSL `/mnt/`
- **PowerShell мост:** `cd /mnt/c && powershell.exe -Command "Get-ChildItem 'G:\Мой диск\ПБ\' -Name"`
- Копирование: `powershell.exe -Command "Copy-Item 'G:\...' 'C:\Users\User\Desktop\temp.ext'"`
- Чтение из WSL: `/mnt/c/Users/User/Desktop/temp.ext`
- CSV файлы с Windows в cp1251: `iconv -f cp1251 -t utf-8 file.csv`
- docx: копировать → `python3 -c "import docx; ..."`

## Construction Domain Knowledge
- **Путь:** `~/.claude/skills/PAI/USER/DOMAINS/construction/`
- 47+ файлов: 17 normatives, 11 templates, 6 processes, 4 market, 3 reference
- Каталог Google Drive ПБ: `reference/Google_Drive_Catalog.md` (40+ файлов)
- Прайс-лист работ: `market/PRICE_LIST_WORKS.md` (60+ позиций, 3 сегмента)
- Yandex Wordstat API token: `~/.config/PAI/.env` (YANDEX_WORDSTAT_TOKEN)

## Directories
- **Projects:** `/home/ser/projects/` — все проекты разработки здесь
- **PAI:** `~/.claude/` — система PAI
- **Токены:** `~/.config/PAI/.env`
- Запускать `claude` ВСЕГДА из папки проекта: `cd ~/projects/pai-dashboard && claude`

## Active Projects
- **Timber Frame Site** — `/home/ser/projects/timber-frame-site/`
  - Премиум сайт террас/веранд/навесов TF, СПб
  - Партнёр: Виктор Шульц (SketchUp 3D)
  - Конкурентная разведка: 38 компаний, ниша ПУСТА
  - SEO: 55 запросов, Wordstat API зарегистрирован
  - Готовность: ~85%, чек-лист: `docs/READINESS_CHECKLIST.md`
  - Следующий шаг: выбор стека → MVP сайта
- **PAI Dashboard** — Next.js + Supabase + Vercel, 3 экрана (Overview/TELOS/Memory)
  - Handoff: `~/.claude/MEMORY/WORK/pai-dashboard-session-2026-02-19/HANDOFF.md`

## Memory Architecture Rules
- **MEMORY/WORK/** — рабочие сессии: PRD, ISC, task-артефакты (создаётся хуком AutoWorkCreation)
- **MEMORY/RESEARCH/** — результаты исследований агентов: PerplexityResearcher, ClaudeResearcher, GeminiResearcher
- **MEMORY/LEARNING/** — рейтинги, рефлексии, паттерны ошибок (создаётся хуками)
- Research skill (`/Research`) сам пишет в `MEMORY/RESEARCH/YYYY-MM/` — НЕ в WORK/
- При спавне research-агентов вручную — указывать путь `~/.claude/MEMORY/RESEARCH/YYYY-MM/`
- Проектные research-файлы (`docs/research/`) остаются в папке проекта — не переносить

## GitHub Workflow Patterns
- **Upstream PRs (single file):** GitHub API > git clone через VPN. Паттерн: `gh repo fork` → `gh api git/refs POST` → `gh api contents PUT` → `gh pr create`. Не клонировать большие репо через прокси.
- **Fork:** `rikitikitavi2012-debug/Personal_AI_Infrastructure` (PAI upstream fork)
- **Наши PRs:** #800 (Inference.ts JSON fix, OPEN)

## Known Issues
- VoiceGate hook blocks voice curls after /compact (benign)
- ElevenLabs free tier = Rachel voice, not Navi's configured male voice
- ~~Algorithm template curls hardcode paid voice~~ ✅ FIXED (2026-02-25) — все заменены на Rachel
- Bun fetch() в WSL НЕ работает без HTTP_PROXY env vars (privoxy 127.0.0.1:8118)
- osascript (macOS notifications) недоступен в WSL — ошибки в логе не критичны
- ABOUTME.md UPDATED (OpenCode refs removed 2026-02-21)
- CONTACTS.md UPDATED (real data, Schultz + 5 partners)
- PROJECTS.md UPDATED (P1 Timber Frame active)

## PAI Аудит Полный (2026-02-22) — Все 20 хуков ✅ ЗАВЕРШЁН

GitHub issues отправлены: #766 (voice ID), #767 (lineage bug), #768 (exit code), #769 (TrendingAnalysis missing)
Комментарий к #734 (timezone fix). Система готова к продуктовой работе.

## Критические баги WSL (найдены 2026-02-22)
- **StopOrchestrator.isMainSession()** не проверял WT_SESSION → 🗣️ Navi summary никогда не озвучивалось в Windows Terminal. Фикс: добавили WT_SESSION check первым (аналогично VoiceGate). Voice log: последний успех был 2026-02-18.
- **criteria=0 в AlgorithmTracker** — дизайн: каждый new OBSERVE цикл архивирует criteria в reworkHistory[]. В conversational сессиях это происходит на каждый вопрос.

## Регресс-баги (уроки)
- При добавлении `!isLinux` в VoiceServer — забыли объявить `const isLinux = process.platform === 'linux'` → ReferenceError крашил sendNotification после каждого TTS. Фикс: строка 36 server.ts.
- Паттерн: при использовании новой переменной в if-условии — проверять что она объявлена в scope файла.
- **TELOSTracker timeout**: промпты ~7-9kb через VPN-прокси → 44+сек. Фикс: уменьшить лимиты (goals=1500, projects=1000, sessionWork=2000) + timeout=60000ms. Паттерн: при фиксе таймаутов тестировать с реальным размером промпта, не мини-тестом.
- **Inference.ts JSON парсинг (2026-02-25)**: `arrayMatch` приоритет (`\[[\s\S]*\]`) жадно захватывал невалидные подстроки когда JSON объект содержит массивы. Фикс: пробовать objectMatch первым, try-parse обоих. Затронуты 4 инструмента: TELOSTracker, WisdomExtractor, FailureCapture, IntegrityMaintenance. Все молча крашились через `stderr: 'ignore'`.
- **Inference.ts model IDs (2026-02-25)**: sonnet=`claude-sonnet-4-6`, opus=`claude-opus-4-6` (без дата-суффикса). Haiku=`claude-haiku-4-5-20251001` (с суффиксом).
- **ISCSyncHook chmod (2026-02-25)**: exit code 126 = permission denied. Всегда chmod +x после создания hook файла.

## TODO: Следующие улучшения PAI (приоритет, 2026-02-25)
1. ~~**stderr logging для fire-and-forget**~~ ✅ DONE (2026-02-25) — `openDebugLog()` в WorkCompletionLearning + RatingCapture, логи в `MEMORY/LEARNING/DEBUG/{tool}.log`
2. ~~**Upstream PR для Inference.ts**~~ ✅ DONE (2026-02-25) — PR #800 в danielmiessler/PAI: JSON array parsing fix. Model IDs не актуальны upstream (нет direct API).
3. **Наши 7 issues на GitHub** — #766,#767,#768,#769,#771,#772,#773 (все OPEN). #766 и #768 получили PR фиксы от jlacour-git, мы поблагодарили.
4. ~~**PostCompactRecovery (#799)**~~ ✅ ADOPTED (2026-02-25) — хук создан, compact matcher в settings.json, +русский язык. Остальные upstream PRs: #797 (configurable voice text), #776 (pai-notify wrapper), #774 (algo status CLI)

## Апгрейд Алгоритма до v1.8.1-ru (2026-02-22) — ЗАВЕРШЁН ✅
- **v1.8.1-ru.md** создан: 7 голосовых curl на русском, context recovery восстановлен
- **Три v1.8.1 улучшения** добавлены: Deploy Target Check, Output Template, Batch File Edits
- **LATEST** → `v1.8.1-ru`, SKILL.md пересобран (6 компонент, 6 переменных)
- **Патчи сессии**: osascript guard в VoiceServer, Promise.race timeout в QuestionAnswered+StartupGreeting, аудио очередь в VoiceServer, голосовое приветствие в StartupGreeting
- **Grepping tip**: всегда `-i` для текста в смешанном регистре

## PAI Аудит Уровень 2 (2026-02-22) — Результаты
- **RatingCapture**: explicit ✅, implicit ✅ (108 записей — работает, тест изнутри = false negative)
- **AutoWorkCreation**: ✅ — создаёт META.yaml, THREAD.md, ISC.json, PRD, symlink current
- **UpdateCounts**: ✅ — обновляет settings.json; macOS Keychain недоступен в WSL (ожидаемо)
- **OpinionTracker**: ✅ — код корректен (parseOpinions правильно читает Description из Group 3); ложный баг в Level 2 был от передачи даты вместо description при тестировании; OPINIONS.md очищен (3 corrupted entries удалены 2026-02-22)
- **LearningPatternSynthesis**: ✅ — создаёт weekly report в MEMORY/LEARNING/SYNTHESIS/
- **SessionHarvester**: ✅ — извлекает correction/insight learnings из transcripts
- **RelationshipMemory**: ✅ — пишет в MEMORY/RELATIONSHIP/YYYY-MM/YYYY-MM-DD.md
- **Resilience**: ✅ — все хуки exit(0) при bad input

## PAI Cleanup (2026-02-25)
- MEMORY/WORK/ очищен: 63 → 3 сессии (удалены пустые автогенерации без артефактов)
- Git repo: backups/ и MEMORY/STATE/ исключены из tracking (regenerated caches)
- algorithm.ts voice ID: `fTtv3eikoepIosk8dTZ5` → `pNInz6obpgDQGcFmaJgB` (последний hardcoded)
- PostCompactRecovery: протестирован, работает (identity + language + format сохраняются)
- Debug logging: WisdomExtractor, TELOSTracker, TrendingAnalysis — stderr → файлы в MEMORY/LEARNING/DEBUG/
- Voice validators: `isValidWorkingTitle` + `isValidVoiceCompletion` — добавлена поддержка кириллицы
- System health check: все 22 хука, learning pipeline, voice, VPN — всё работает

## PAI Deep Audit (2026-02-26) — 11 находок исправлено
- **EXA API key**: убран из settings.json → `${EXA_API_KEY}` (ключ в ~/.config/PAI/.env)
- **Voice IDs**: AlgorithmTracker + StartupGreeting → `getVoiceId()` из identity
- **Timezone**: LoadContext fallback `Los_Angeles` → `getPrincipal().timezone`
- **Dead code**: 8 файлов удалено (BannerMatrix/Neofetch/Retro/Tokyo/Prototypes, NeofetchBanner, PAILogo, SplitAndTranscribe) — upstream прототипы
- **TELOS**: 8 .bak файлов удалены, пустая hooks/Plans/ удалена
- **DAIDENTITY.md**: voice ID обновлён → ссылка на settings.json
- **voiceClone**: placeholder `YOUR_VOICE_ID_HERE` → пустая строка
- **Skill count**: 11 (PAI 4.0.1 мега-скиллы, обновлено 2026-03-01)
- **Construction skills**: перенесены в `~/projects/timber-frame-site/docs/methodology/`
- **web-design-guidelines**: ложная тревога агента — директория существует

## Skill Architecture (понимание, 2026-02-26)
- При старте загружается ТОЛЬКО индекс скиллов (~3KB описаний), НЕ полные SKILL.md
- Полный SKILL.md загружается при вызове через /skill-name или Skill tool
- 2 always-loaded (Art, Fabric), 42 deferred — грузятся по триггерам
- Construction domain knowledge в `USER/DOMAINS/` — по запросу, не автоматически
- Проектные скиллы: `.claude/commands/` в папке проекта — нативная фича Claude Code

## PAI System Health (verified 2026-02-26)
- **22 хука**: все executable, все exit(0) при bad input, все voice IDs динамические
- **Learning**: 160 рейтингов, 40 рефлексий
- **Wisdom**: 3 домена (development/system/workflow)
- **Voice**: 7 точек, все работают. Нет hardcoded voice IDs
- **VPN**: proxy 127.0.0.1:8118 → 72.56.99.127 работает
- **MCP**: 2 сервера (supabase, exa), ключи через env vars (${VAR} формат)
- **Skill index**: 45 скиллов, Tools: 34
- **Backup**: settings.json автобэкап при SessionEnd (5 ротирующих копий в `backups/`)
- **SystemAudit CLI**: 25 checks, **25 PASS, 0 WARN, 0 FAIL** — полностью чисто
- **Smoke tested**: Council ✅, WTMH ✅, Evals ✅, Science ✅, RedTeam ✅ (ранее)
- **Statusline**: audited, 6 bugs fixed, 70 lines dead code removed, 1320→ lines
- **CORE/ACTIONS+PIPELINES**: upstream content pipeline (Daniel's blog/social). НЕ удалять — upstream sync. Не мешает.
- **TranscriptRotation**: 1589 JSONL, 110MB. Скрипт создан, запускать: `bash TranscriptRotation.sh --dry-run`
- **algorithm.ts**: audited (1461 lines, 33 functions). 3 bugs fixed: PROJECTS_DIR case, partitionCriteria 1:1, stopLoop guard. `sla` legacy naming documented. PR #808 upstream.
- **agents/*.md**: 13 agents audited — чисто. voiceId placeholder upstream by design.
- **hooks/handlers/**: 7 handlers audited. AlgorithmEnrichment.ts не имел try/catch → FIXED. DocCrossRef нет cooldown (заметка).
- **Statusline perf**: warm cache 377ms avg, cold 3270ms (VPN latency на location+weather API).
- **Parallel loop E2E**: partitionCriteria фикс подтверждён — 2 агента, 1:1 mapping работает. Worker agents создают побочные PRD через AutoWorkCreation (known).
- **hooks/lib/**: 13 файлов аудит (3 параллельных Explore агента). 10 CLEAN, 3 с багами. 3 MEDIUM fixed: change-detection.ts redundant condition, metadata-extraction.ts researcher-only regex, tab-setter.ts require→import. 3 LOW noted (cosmetic).
- **Agent delegation fix**: Steering Rule добавлено, Algorithm rule 6b (min agents by effort), agents_spawned в рефлексиях, wisdom anti-pattern. Правило работает — первый реальный 3-agent audit прошёл успешно.
- **Tools/**: 33 файла аудит (4 параллельных Explore агента). 27 CLEAN, 6 с находками. 2 MEDIUM fixed: GetTranscript.ts shell injection (execSync→spawnSync), YouTubeApi.ts fetch без timeout (AbortController 30s). ~10 LOW noted. Inference.ts JSON fix подтверждён на месте. Learning pipeline все 7 tools — CLEAN.

## SystemAudit Skill (created 2026-02-26, v2 patched same day)
- **Путь:** `~/.claude/skills/SystemAudit/`
- **CLI:** `bun skills/SystemAudit/Tools/SystemAudit.ts` (--quick, --domain X, --json)
- **8 доменов:** Hooks, Skills, Tools, Memory, Config, Voice, Security, Upstream
- **24 детерминистических проверки** (было 21, +3 после пилотного теста):
  - hooks-executable (chmod +x), hooks-hardcoded-keys, memory-learning-freshness
- **3 воркфлоу:** FullAudit (4 параллельных агента), QuickCheck (8 critical), UpstreamSync (gh CLI)
- **Exit codes:** 0=all pass, 1=warnings, 2=critical failures
- **History logging:** `MEMORY/AUDIT/audit-history.jsonl` + `MEMORY/AUDIT/reports/*.json`
- **Timestamp + duration** в каждом отчёте
- **Upstream repo path:** `Releases/v3.0/.claude/` (не корень!)
- **Первый в upstream** — аналога в danielmiessler/PAI нет
