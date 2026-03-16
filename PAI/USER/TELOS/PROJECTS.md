# Проекты

**Текущие и планируемые проекты.**

*Последнее обновление: 2026-03-16*

---

## Активные проекты

### P0: PAI + TELOS (Личная AI-инфраструктура)
**Статус:** Активен, непрерывный
**Версия:** PAI v4.0.3 (март 2026)
**Суть:** Мета-проект и фундамент для всего остального. PAI как фреймворк агентской инфраструктуры. TELOS как живой текстовый контекст — растёт, изменяется, совершенствуется вместе с нами. Navi как AI-партнёр, который учится и становится лучше с каждой сессией. Контекст — это актив: его можно переносить, хранить, накапливать для цифровой идентичности.
**Цель:** Полноценная личная операционная система: TELOS 23/23, PAI настроен, агенты работают, контекст глубокий.
**Срок:** Непрерывный процесс — система эволюционирует постоянно
**Архитектура PAI v4.0.3:**
- **35 хуков** — все defensive/fail-open, shebang-based (chmod +x обязателен)
- **171 тест** / 34 сюиты — subprocess-based test harness (hooks/tests/)
- **13 скиллов** — Agents, Autoresearch, ContentAnalysis, Investigation, Media, NotebookLM, Research, Scraping, Security, Telos, Thinking, USMetrics, Utilities
- **Security system** — SecurityValidator.hook.ts + patterns.yaml (trusted/blocked/confirm/alert + path categories)
- **3-layer mode routing** — ModeClassifier hook (regex) → Complexity Gate (LLM) → Algorithm file
- **Algorithm v4.0.0** — Cycle Selector ([B]/[Q] routing), Autoresearch Sub-Loop (8-phase iterative optimization), Layered Drift Defense (L1/L2/L3), Iteration Budget. Validated by 6-level review (3 models). Files: v4.0.0.md + Algorithm-Autoresearch.md
- **Memory pipeline** — LEARNING/WISDOM/RELATIONSHIP/WORK/STATE/SECURITY + events.jsonl
- **Feedback loop** — RatingCapture (implicit sentiment) → WisdomSync → FRAMES
- **JulesAutoMerge pipeline** — тесты в worktree → A0 code review → gh pr merge --squash → git pull sync
- **EventLogger** — routing table для SubagentStart/SubagentStop/TaskCompleted (вместо отдельных хуков)
**GitHub & Community:**
- **Fork:** github.com/rikitikitavi2012-debug/PAI (public)
- **Git workflow:** `main` = upstream community (552+ commits), `master` = локальная конфигурация (НЕ пушить)
- **PR workflow:** feature branches от main через `git worktree add` → PR в upstream
- **PRs:** 8 отправлено (6 open, 2 closed merged):
  - #840 feat: ModeClassifier hook (OPEN)
  - #859 feat: hook test harness + patterns template (OPEN)
  - #860 fix: RatingCapture false-positive 5s (OPEN)
  - #861 fix: algorithm stopLoop + regex escaping (OPEN)
  - #882 fix: UTF-16 surrogate pairs in RatingCapture (OPEN) — submitted by Navi
  - #883 fix: dead references in CONTEXT_ROUTING.md (OPEN) — submitted by Navi
  - #808 fix: algorithm parallel worker (CLOSED)
  - #800 fix: Inference.ts JSON parsing (CLOSED)
- **Признание:** @rikitikitavi2012-debug отмечен в release notes PAI v4.0.3
**Подпроекты:**
- **PAI Workspace (Kitty)** — 2 таба: Center (Command Center + Strategic Dashboard vsplit) и Telemetry (Events Live + Operational tall). Live cost tracking, brigade status, TELOS metrics. Заменяет PAI Dashboard (web). Детерминизм + zero overhead.
- ~~**PAI Dashboard**~~ — ❌ Заменён на Kitty Workspace (март 2026). Web UI = лишний overhead для соло-разработчика. Terminal-native = быстрее, проще, надёжнее.
- **TELOS контекст** — 24 файла заполнены (+FINANCES.md), эволюция продолжается
- **PAI инфраструктура** — хуки, скиллы, агенты, воркфлоу
- **Community contribution** — PRs, issues, code review в upstream PAI
- **AI Brigade (8 членов, T1/T2/T3)** — T1: Navi (архитектор) + Jules (async-кодер) + A0 (24/7 VPS) + OpenCode (headless coder). T2: Gemini CLI (interactive). T3: GLM-5 + zai-cli (tools) + NotebookLM (grounded research)
  - **A0 development loop:** Jules пишет тесты/фиксы в `agent-zero-custom` → PR → Navi review → deploy на VPS. A0 растёт вместе с бригадой
- **JulesAutoMerge** — автоматизация merge Jules PRs с A0 code review
- **Miessler Philosophy** — 9 операционных принципов вшиты в нервную систему (CLAUDE.md + AISTEERINGRULES.md)
**Результаты (февраль-март 2026):**
- Context engineering оформился как дисциплина. PAI опережает академические Memory OS
- Research skill боевой тест по v3: все 4 режима работают (нужен ре-аудит по v4)
- Telos skill аудит по v3: 9 багов пофикшено (нужен ре-аудит по v4)
- Agent system аудит: 10 коммитов, 40+ phantom refs исправлено
- RatingCapture: исправлены false-positive 5s (52% мусорных данных → 92 чистых записи)
- Hook test harness: 171 тест / 34 сюиты / 427 expect() calls
- Security system: SecurityValidator + patterns.yaml активированы
- 8 PR отправлены в upstream (6 open, 2 merged), contributor acknowledgment получен
- JulesAutoMerge pipeline: автоматический merge Jules PRs с A0 code review gate
- AI Brigade оформилась: Navi + Jules + Agent Zero как координированная команда
- A0 code review интегрирован в JulesAutoMerge (fail-open, ~17s на ревью)
- PRDSync change detection: устранено 40% шума в event pipeline
**Следующие шаги:**
- [x] Заполнить TELOS до 22/22
- [x] Боевой тест Research skill (v3 — 4 режима)
- [x] Аудит Telos skill (v3 — 9 багов пофикшено)
- [x] Аудит агентной системы (8 коммитов)
- [x] Hook test harness (61 тест, 9 сюит)
- [x] Security system (SecurityValidator + patterns.yaml)
- [x] Feedback loop (RatingCapture → WisdomSync → FRAMES)
- [x] Community: 6 PRs в upstream
- [x] Git workflow: fork, main/master, worktrees
- [x] Algorithm v4.0.0: Cycle Selector + Autoresearch Sub-Loop + Drift Defense + Iteration Budget (2026-03-15)
- [x] Algorithm validation: 6-level review (RedTeam + Manual + Architect + Gemini 2.5 + A0 Sonnet + Jules 15 tests), 25 issues found, 20 fixed (2026-03-15)
- [x] Algorithm hardening: 17 spec gaps fixed (timeout, parsing, Pareto, noise, stagnation, PARTIAL, cost model, etc.) — 2026-03-16
- [x] Algorithm stress-test: 14/14 Autoresearch mechanisms verified on real tasks (bundle size, dead deps, stagnation, dual-Q, context recovery) — 2026-03-16
- [x] Learning loop closed: LEARN.md readback + experiments.tsv aggregation + active retrieval + performance trend correlation — 2026-03-16
- [x] FAILURES rotation: 188→87 MB, gzip on write, daily auto-rotation via LoadContext — 2026-03-16
- [x] Algorithm v4.0 (stable): v4.0.0 released, alpha убрана — 2026-03-16
- [x] /autoresearch skill: SKILL.md + 4 workflows (Plan, Run, Resume, Report), 12-й скилл — 2026-03-16
- [x] Trust Level framework: L1-L4 graduated autonomy в Algorithm v4.0.0 + Run.md — 2026-03-16
- [x] Telegram notifications: AgentZero sendMessage для Trust L3+ в Run.md — 2026-03-16
- [x] NotebookLM integration: notebooklm-py v0.3.4 + Skill (7 workflows) + T3 в бригаде — 2026-03-16
- [x] PAI Audit via NotebookLM: первый cross-model аудит (Gemini), 5 проблем найдено и пофикшено — 2026-03-16
- [x] Steering Rules: Minimal Scope → Verification Rigor (аудит: 0 failures от проактивности, 43 от пассивности) — 2026-03-16
- [x] Algorithm: ISC Count Gate → Quality Gate (Splitting Test вместо числовых полов) — 2026-03-16
- [x] A0 sync: weekly → daily (аудит подтвердил 7-day context drift → hallucination incident) — 2026-03-16
- [x] Monthly PAI Audit workflow: collector script + manifest + 7 workflows + brigade rotation — 2026-03-16
- [ ] Hook consolidation: моно-хуки по событиям (Stop, UserPromptSubmit, SessionEnd) — межсезонье
- [ ] VerificationGate.hook.ts: механический enforcement верификации (по аналогии с LearnGate) — межсезонье
- [ ] Escape rate metrics: автоматический подсчёт ISC escapes в NATIVE — межсезонье
- [ ] NotebookLM cookie monitoring: алерт при expiry, auto-relogin workflow — межсезонье
- [ ] Cross-model review через A0 в Algorithm pipeline (Фаза 4, межсезонье 2026-2027)
- [ ] L2 Autoresearch: самооптимизация PAI скиллов через eval (Фаза 4)
- [ ] State persistence (ARIS-style) для autoresearch sessions (Фаза 4)
- [ ] Scheduled autoresearch runs: ночные оптимизации по расписанию (Фаза 4)
- [ ] A0 Algorithm upgrade v3.0→v4.0: адаптация v4.0.0 под A0 архитектуру (Python skills, контейнер, Sonnet) — Фаза 4
- [ ] Аудит скиллов по v4 структуре (11 скиллов, новая архитектура)
- [x] PAI Workspace v2: 2 таба (Center + Telemetry), Strategic Dashboard с live cost tracking
- [x] Z.AI интеграция в pipeline (GLM-5 inference, zai-cli MCP, ZaiVision screenshots)
- [x] FINANCES.md — цифровая бухгалтерия ($240/мес fixed, 13 API keys, live trackers)
- [x] OpenCode CLI — T1 автономный агент, headless mode, Kimi 2.5 + Z.AI models
- [ ] TELOS panel в Kitty — goals, status прямо в терминале
- [ ] A0 расширение scheduled tasks (health check, security scan, community watcher)
- [ ] **A0 как участник бригады — непрерывное улучшение через Jules:**
  - Repo: `agent-zero-custom` (приватный, GitHub)
  - Scope: extensions (_80-_89), skills (8), prompts, behaviour.md — NOT core
  - Jules: тесты → баги → улучшения → PR → Navi review → deploy на VPS
  - Стратегия numbering: _80-_89 наши slots, _10-_75 upstream
  - Deploy: GitHub = source of truth → sync script → container
  - Цель: A0 покрыт тестами, стабилен, развивается параллельно с PAI
- [ ] Углубить контекст в заполненных TELOS файлах
**Связано с:** M1, M3, B1, B2, MO9, S7

---

### P3: Цифровой Прораб (PWA приложение)
**Статус:** Активная разработка (scaffolding + 3 модуля готовы)
**Суть:** PWA-приложение для прорабов строительной фирмы. Offline-first: работает без интернета на удалённых объектах. Заменяет Telegram-бот (заморожен). Решает три ключевых проблемы: потеря чеков, рутинные созвоны с офисом, путаница в сдаче объёмов. Связан с идеей партнёрства с руководством фирмы (I1).
**Результат Standard Research (2026-02-27):** Оптимальный стек: Workbox (service worker) + IndexedDB (Dexie.js) + Google Sheets API v4 (через GAS). Background Sync API для очередей. Append-only стратегия для конфликтов. Safari iOS лимит: 50MB для IndexedDB. Сохранено: `MEMORY/RESEARCH/2026-02/2026-02-27_pwa-construction-offline/`
**Цель:** (1) Запуск MVP в тестовом режиме на своей фирме. (2) Презентация руководству фирмы как решение узкого места коммуникации прораб↔офис. Валидация product-market fit.
**Стек:** React 19 + Vite 7 + TailwindCSS 4 + Zustand + Dexie.js (IndexedDB) + Google Apps Script + Google Sheets
**Рабочая директория:** `/home/ser/projects/digital-foreman-app/`
**PRD:** `/home/ser/projects/digital-foreman-app/docs/PRD.md`
**Срок:** Q1-Q2 2026
**Следующие шаги:**
- [x] PRD v1.0 (PWA архитектура, offline-first strategy)
- [x] Scaffolding (React + Vite + PWA + TailwindCSS + Zustand + Dexie)
- [x] Модуль Смета/Факт (store + UI + IndexedDB + SyncQueue)
- [x] Модуль Касса (store + UI + 19 реальных категорий)
- [x] Фотофиксация (камера → сжатие → IndexedDB)
- [x] GAS API backend (Code.gs + sheets.gs + drive.gs) — развёрнут 2026-02-25
- [ ] Синхронизация (SyncEngine + retry)
- [ ] Telegram дайджест (через GAS)
- [ ] Юридическое закрепление IP (W6: сначала юрист, потом демо)
- [ ] Тестирование пользователями (прорабами)
- [ ] Презентация руководству фирмы
**Блокеры:** IP не закреплён юридически (I1, W6)
**Предшественник:** TG бот `digital-foreman-tg-bot` (заморожен, MVP был готов)
**Связано с:** G0, I1, I2, M0, M1

---

### P1: Сайт Timber Frame + Благоустройство (премиум террасы + полный цикл участка)
**Статус:** MVP LIVE + API VERIFIED — timber-frame-spb.ru задеплоен 08.03.2026. Портфолио визуализировано. Благоустройство оцифровано. Yandex Direct/Metrika/Wordstat API verified (единый токен). Автономная оптимизация спроектирована (PRD 48 ISC). Реклама НЕ запущена — блокер ФЗ-152.
**Суть:** Сайт для привлечения премиум-клиентов на TF террасы/веранды/навесы + благоустройство участков как кросс-продажа и отдельная услуга. Команда: Иван (руководитель, прораб благоустройства) + Виктор Шульц (мастер TF, 3D SketchUp) + Алексей (прораб, ИП, бригады). Полный цикл: от расчистки до последнего нагеля.
**Результат Quick Research (2026-02-27):** Ниша подтверждена свободной. 6+ конкурентов по общему рынку, 0 по TF малым формам. Цены от 12K руб/м2 (бюджет) до 40K+ (премиум). ЦА: загородные дома Ленобласть. Сохранено: `MEMORY/RESEARCH/2026-02/2026-02-27_timber-frame-spb/`
**Двойная цель:**
1. **Клиентский канал:** Целевые, маржинальные заявки (5 целевых лучше 50 нецелевых). Канал привлечения клиентов премиум-сегмента.
2. **Презентация руководству фирмы:** Собственный параллельный проект МАФ для будущих расширений фирмы. Показать направление МАФ как своё направление в коллаборации с фирмой на первых этапах. Сайт демонстрирует готовность и компетенцию.
**Стек:** Next.js 16 / TypeScript / Tailwind v4 / shadcn/ui / Vercel
**Домен:** timber-frame-spb.ru (Reg.ru → Vercel DNS)
**Срок:** Март 2026 — MVP ✅, Апрель 2026 — рекламный запуск к началу сезона
**Рабочая директория:** `/home/ser/projects/timber-frame-site/`
**Роадмап:** docs/ROADMAP.md (фазы, дедлайны, зависимости)
**Что работает (март 2026):**
- [x] 7 страниц: главная, террасы TF, технология, о нас, калькулятор, блог, контакты
- [x] Блог-движок (gray-matter + remark, SSG) + 4 статьи (3 A0 + 1 brigade E2E)
- [x] Калькулятор + AI-рекомендации (OpenRouter API)
- [x] Контактная форма → email на terrace.lo@yandex.ru (Yandex SMTP, nodemailer)
- [x] Яндекс.Метрика (счётчик 107227113, вебвизор, контентная аналитика)
- [x] Яндекс.Вебмастер верифицирован
- [x] SEO: OG-теги, JSON-LD, sitemap, robots.txt
- [x] Скилл TFContent (контент, SEO, Brand Voice) — установлен на A0
- [x] Скилл YandexDirect (кампании, ключи, ставки, отчёты) — валидирован
- [x] Исследование ФЗ-152: Supabase нельзя для ПД, нужен хостинг в РФ
- [x] Исследование Yandex Direct API v5 + Metrika API
- [x] Yandex API verified: единый OAuth токен (direct:api + wordstat:api + metrika:read), 2 счётчика Метрики, 1 кампания в аккаунте
- [x] Автономная оптимизация Директа: аналитический отчёт + PRD 48 ISC по 5 фазам (MEMORY/WORK/20260316-060000_yandex-direct-autoresearch/)
- [x] Конкурентная разведка: СОЗДАЙ-ТЕРРАСУ (3370 Telegram subs, 611 видео, 51 статья) → COMPETITIVE_INTELLIGENCE.md
- [x] Content Gap Analysis: 7 тем конкурента (ошибки стройки, материалы, покрытия) + 7 наших уникальных
- [x] IllustratedArticle pipeline: A0 текст → Navi изображения → Vision QA → WebP → deploy
- [x] 8 AI-визуализаций для 3 live статей (GPT-1.5 + Nano Banana 2, WebP <150KB)
- [x] BRIGADE_PLAYBOOK.md — полная стратегия бригады от маркетинга до заявки
- [x] Brigade E2E test: полный пайплайн Research → Content → Images → Deploy → Review → Verify (2026-03-10)
- [x] 4-я статья live: "7 ошибок строительства террас в СПб" (2850 слов, 5 AI-изображений, score 85/100)
- [x] Контент-план: 10 статей Wordstat + Gemini gap analysis (docs/CONTENT_PLAN.md)
- [x] SEO: datePublished, og:image, JSON-LD image, сортировка по дате
- [x] Wordstat API: одобрен, проверен. ИНСАЙТ: "timber frame"=0 показов
- [x] Direct API: одобрен, полный доступ
- [x] Jules fix: auto-detect repo, --repo флаг
- [x] TFContent: Шаг 4.5 валидация ссылок (Latin-only)
- [x] Gemini quality gate: бесплатный, скорит статьи 1-100
- [x] OpenCode+Gemini strategy: 5+5 use cases документированы
- [x] BrigadePipeline.ts MVP: 580 строк, 6 волн
- [x] TF Knowledge Base: 7 файлов экспертности (15 мастеров, 12 соединений, 10 типологий, 16 книг, стандарты TFEC/Eurocode 5)
- [x] TFExpertise.md расширен: история 7000 лет, мировые мастера, типология, стандарты, Притуп как личный контакт
- [x] TFContent SKILL.md: ссылки на knowledge base, принцип "ПОЧЕМУ > ЧТО"
- [x] Статья "Что такое Timber Frame" обновлена: экспертный контент, 8 параметров сравнения, 5 типов соединений с инженерным объяснением
- [x] CONTEXT_ROUTING.md: маршрут tf-knowledge-base (7 файлов)
- [x] Портфолио: 5 проектов с полной структурой (lib/portfolio.ts + /portfolio/[slug] + page.tsx)
- [x] 21 WebP изображение портфолио (FLUX 2 Max heroes/details + FLUX 1.1 Pro atmospherics), 2.5 MB total
- [x] 5 технических диаграмм (ImageMagick, dark theme #1C1917, gold #B45309)
- [x] Фото Ивана — AI-генерация (PhotoMaker + face-swap + color grading), 41KB WebP
- [x] Блог: 8 статей (6 base + 2 экспертные с KB)
- [x] SEO мета-теги обновлены с keywords для всех страниц
- [x] constants.ts усилен KB экспертизой (GL24h, M&T 2.5т, Westminster 1395, TCO, климат)
- [x] QA: 8/8 страниц PASS (desktop 1440x900 + mobile 390x844, BrowserAgent Playwright)
- [x] Gemini + OpenCode SEO аудиты → docs/GEMINI_SEO_AUDIT.md, docs/OPENCODE_TECH_AUDIT.md
**Мелкие недочёты (не блокеры):**
- Hero 5 (Комарово) — артефакт текста "Sähkinterowu" на стене дома
- Навес hero — логотипы Toyota/Hyundai на авто
- Диаграмма 3 — обрезка текста "подъём" справа
- Фото Ивана — "не похож" (нужны 3-5 референсов без каски)
**Следующие шаги:**
- [ ] ФЗ-152: политика конфиденциальности + регистрация оператора ПД (ДО запуска рекламы)
- [ ] Цели конверсий в Метрике (заявка, звонок, чат) — БЛОКЕР для Autoresearch
- [ ] Первые кампании через API (поиск + РСЯ, ручные ставки, НЕ ЕПК)
- [ ] Baseline данные (2-4 недели, min 100 кликов)
- [ ] Autoresearch CPA-оптимизация (Algorithm v4.0.0 [Q] sub-loop)
- [ ] Статья terrasa-spb-cena (285 показов/мес — топ ключ)
- [ ] Страница /navesy (108 показов/мес — отдельная страница оправдана)
- [ ] Расширение слабых статей (score 73-77)
- [ ] BrigadePipeline.ts Phase 1 (retry, checkpoint, lock, quality gate)
- [ ] Фото: реальная продукция + команда (контент от Шульца)
- [ ] Timeweb Cloud PostgreSQL (РФ серверы, ФЗ-152)
- [ ] Презентация руководству фирмы (совместно с P3)
**Подпроекты:**
- **TF Workbench** (Верстак TF) — инженерно-сметная система знаний. PAI skill с машиночитаемыми прайсами (JSON), workflows для расчётов и смет, единый источник данных для калькулятора на сайте. Виртуальные роли: конструктор, сметчик, технолог, снабженец. 53 файла KB (240+ KB) уже есть, нужна связующая система. Vision doc: `docs/FUTURE_TF_WORKBENCH.md`
  - Фаза 0: Vision ✅ (2026-03-12)
  - Фаза 1: QuickEstimate MVP (1-2ч) — экспресс-оценка по телефону
  - Фаза 2: Машиночитаемые прайсы (2-3ч) — WorkPrices.json, MaterialPrices.json
  - Фаза 3: Сметный модуль (3-4ч) — BOM + шаблон сметы для клиента
  - Фаза 4: Калькулятор v2.1 (4-6ч) — подключить Workbench как источник цен
  - **Зависимость:** данные от Виктора (трудозатраты, ставка, цены поставщиков)
**Связано с:** G1, I2, M0, S6

## Планируемые проекты

### P2: Construction Orchestrator (на Agent Zero) → ПЕРЕОСМЫСЛЕН
**Статус:** Концепция → декомпозирован на TF Workbench (P1 подпроект) + будущий AI-агент
**Суть:** Изначально: AI-платформа на Agent Zero (контейнер 50003). После анализа: разделён на (1) **TF Workbench** — система знаний/данных (реализуется сейчас как PAI skill в P1), и (2) **AI-агент** — интерфейс к данным (отложен до 10+ заказов/сезон).
**Ключевой инсайт:** Данные первичны, агент вторичен. Система знаний переживёт смену любого AI-провайдера. Сначала Workbench (JSON, workflows), потом агент (контейнер, Telegram).
**Цель:** Полноценная AI-платформа для строительного бизнеса МАФ. MVP = TF Workbench skill → калькулятор v2.1.
**Срок:** Workbench Фаза 1-2: март-апрель 2026. AI-агент: не раньше Q4 2026.
**Следующие шаги:**
- [x] Vision document (docs/FUTURE_TF_WORKBENCH.md)
- [ ] TF Workbench Фаза 1: QuickEstimate MVP
- [ ] TF Workbench Фаза 2: Машиночитаемые прайсы
- [ ] Интервью с Виктором (7 вопросов — трудозатраты, ставка, поставщики)
- [ ] Калькулятор v2.1 (подключить Workbench как источник цен)
- [ ] AI-агент на контейнере 50003 (когда 10+ заказов/сезон)
**Блокеры:** Данные от Виктора (трудозатраты), C1 (время в сезон)
**Связано с:** G2, G3, M1, I0, B5, MO7

### P4: Инвестиционный портфель
**Статус:** К действию
**Суть:** Не софтверный проект, но проект по распределению капитала (3.5 млн ₽). Акции полупроводников (NVIDIA, Micron, AMD, SK Hynix, Samsung) + A0T стейкинг (Venice AI) + земля в Былыме.
**Цель:** Диверсифицированный портфель с защитой от инфляции и ростом капитала.
**Срок:** Шаги 1-3 — сейчас (февраль 2026)
**Результат Deep Investigation (2026-02-27):** Земля Былым ИЖС: 200-500K руб/сотка (с инфраструктурой), ЛПХ без коммуникаций: 50-150K руб/сотка. 49-летний мораторий на сельхозземли (не касается ИЖС). Курорт Эльбрус: 60 млрд руб инвестиций, 4 новые канатки в 2026, турпоток к 2030: 1.2 млн/год. Бычий сценарий: 3-5x за 5-7 лет. Сохранено: `MEMORY/RESEARCH/2026-02/2026-02-27_land-bylym-kbr/`
**Следующие шаги:**
- [ ] Покупка земли в Былыме (1.5 млн ₽) — G7. Deep Investigation: связаться с агентствами в Тырныаузе, проверить кадастровую карту
- [ ] Открыть брокерский счёт (Interactive Brokers / Freedom Finance) — G8
- [ ] Купить A0T, застейкать, получить Venice AI API — G6
**Блокеры:** Доступ к зарубежному брокеру из РФ (C2)
**Связано с:** G6, G7, G8, S4, S5, M0

---

## Приоритизация проектов

| # | Проект | Приоритет | Почему |
|---|--------|-----------|--------|
| P0 | PAI + TELOS | Высший | Фундамент для всего. Контекст = актив. Заточка инструментов = compound returns. |
| P1 | Сайт Timber Frame | **Высший** | Ниша пуста, сезон в апреле, сайт = деньги. |
| P3 | Цифровой Прораб (PWA) | **Низкий** | 3 модуля готовы. Sync + Telegram — в свободное время, не приоритет. |
| P4 | Инвест-портфель | Высокий | Капитал лежит — деньги должны работать. |
| P2 | Construction Orchestrator | Средний | Зависит от P3 и P1. Концепция. |

**Текущий фокус (март 2026):**

**P1 — MVP + визуал готов.** Сайт задеплоен, портфолио визуализировано, контент усилен. Фокус: конверсия и рекламный запуск к апрелю.
1. **ФЗ-152 compliance** — политика конфиденциальности, регистрация ПД (БЛОКЕР для рекламы)
2. **Яндекс.Директ** — API одобрен, первая кампания к апрелю (начало сезона)
3. **Контент** — статья terrasa-spb-cena (285/мес), страница /navesy (108/мес)
4. **Фото** — реальная продукция от Шульца (критично для конверсии)
5. **P3 (Цифровой Прораб)** — SyncEngine + Telegram дайджест (вечерами)

**Принцип:** Scaffolding > Model (принцип #1). Неделя вложений в систему → широкие шаги к G1/G3 весь сезон.

**W5 Override (формализовано 2026-03-06):**
Принцип W5 ("один проект за раз") НЕ нарушен при соблюдении условий:
1. **Последовательный фокус** — в каждый момент времени кодинг идёт над ОДНИМ проектом (P0 → P1 → P3)
2. **Разные домены** — P4 (инвестиции) не конкурирует за кодинг-время
3. **P0 = инфраструктура** — PAI/TELOS не "проект", а операционная система для остальных проектов
4. **Явный переход** — смена фокуса только при завершении фазы или осознанном решении
W5 запрещает параллельный кодинг 2+ проектов одновременно. W5 НЕ запрещает последовательный pipeline с чётким планом фаз.

---

## Завершённые проекты

| Проект | Завершён | Результат | Урок |
|--------|----------|-----------|------|
| PAI настройка (базовая) | 2025-2026 | PAI v4.0.3 работает, 11 скиллов, 30 хуков, 171 тест | Система окупает вложенное время многократно |
| VPS NL инфраструктура | 2025-2026 | 2 сервера, Agent Zero развёрнут | Инфра-независимость возможна и необходима |

---

## Замороженные проекты

| Проект | Заморожен | Почему | Возобновить когда |
|--------|-----------|--------|-------------------|
| G4: Каркасное Шале (Владимирская обл.) | 2026-01 | Приоритет сместился на землю в Былыме (G7) | Если появится инвестор или изменится приоритет |
| Цифровой Прораб (TG бот) | 2026-02 | Заменён PWA приложением (P3). PWA даёт offline-first, полноценный UI, фотофиксацию | Не планируется — функционал полностью перенесён в PWA |

---

*Обновлять еженедельно. Перемещать проекты между разделами по мере изменения статуса. Помнить: один фокус за раз (W5).*
