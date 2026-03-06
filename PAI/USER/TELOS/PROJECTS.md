# Проекты

**Текущие и планируемые проекты.**

*Последнее обновление: 2026-03-02*

---

## Активные проекты

### P0: PAI + TELOS (Личная AI-инфраструктура)
**Статус:** Активен, непрерывный
**Версия:** PAI v4.0.3 (март 2026)
**Суть:** Мета-проект и фундамент для всего остального. PAI как фреймворк агентской инфраструктуры. TELOS как живой текстовый контекст — растёт, изменяется, совершенствуется вместе с нами. Navi как AI-партнёр, который учится и становится лучше с каждой сессией. Контекст — это актив: его можно переносить, хранить, накапливать для цифровой идентичности.
**Цель:** Полноценная личная операционная система: TELOS 23/23, PAI настроен, агенты работают, контекст глубокий.
**Срок:** Непрерывный процесс — система эволюционирует постоянно
**Архитектура PAI v4.0.3:**
- **30 хуков** — все defensive/fail-open, shebang-based (chmod +x обязателен)
- **171 тест** / 34 сюиты — subprocess-based test harness (hooks/tests/)
- **11 скиллов** — Agents, ContentAnalysis, Investigation, Media, Research, Scraping, Security, Telos, Thinking, USMetrics, Utilities
- **Security system** — SecurityValidator.hook.ts + patterns.yaml (trusted/blocked/confirm/alert + path categories)
- **3-layer mode routing** — ModeClassifier hook (regex) → Complexity Gate (LLM) → Algorithm file
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
- **AI Brigade (7 членов, T1/T2/T3)** — T1: Navi (архитектор) + Jules (async-кодер) + A0 (24/7 VPS) + OpenCode (headless coder). T2: Gemini CLI (interactive). T3: GLM-5 + zai-cli (tools)
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
- [ ] Аудит скиллов по v4 структуре (11 скиллов, новая архитектура)
- [x] PAI Workspace v2: 2 таба (Center + Telemetry), Strategic Dashboard с live cost tracking
- [x] Z.AI интеграция в pipeline (GLM-5 inference, zai-cli MCP, ZaiVision screenshots)
- [x] FINANCES.md — цифровая бухгалтерия ($240/мес fixed, 13 API keys, live trackers)
- [x] OpenCode CLI — T1 автономный агент, headless mode, Kimi 2.5 + Z.AI models
- [ ] TELOS panel в Kitty — goals, status прямо в терминале
- [ ] A0 расширение scheduled tasks (health check, security scan, community watcher)
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

## Планируемые проекты

### P1: Сайт Timber Frame (премиум террасы, веранды, навесы)
**Статус:** Активен — финальная подготовка
**Суть:** Сайт для привлечения премиум-клиентов на Timber Frame террасы, веранды, навесы в СПб и ЛО. Партнёрство с Виктором Шульцем (3D SketchUp). Блог с экспертным контентом. Пустая ниша — нет конкурентов по TF малым формам в СПб.
**Результат Quick Research (2026-02-27):** Ниша подтверждена свободной. 6+ конкурентов по общему рынку, 0 по TF малым формам. Цены от 12K руб/м2 (бюджет) до 40K+ (премиум). ЦА: загородные дома Ленобласть. Сохранено: `MEMORY/RESEARCH/2026-02/2026-02-27_timber-frame-spb/`
**Двойная цель:**
1. **Клиентский канал:** Целевые, маржинальные заявки (5 целевых лучше 50 нецелевых). Канал привлечения клиентов премиум-сегмента.
2. **Презентация руководству фирмы:** Собственный параллельный проект МАФ для будущих расширений фирмы. Показать направление МАФ как своё направление в коллаборации с фирмой на первых этапах. Сайт демонстрирует готовность и компетенцию.
**Срок:** Март 2026 — MVP, Апрель 2026 — рекламный запуск к началу сезона
**Рабочая директория:** `/home/ser/projects/timber-frame-site/`
**Подготовительная база:**
- [x] Стратегия Timber Frame согласована с Шульцем
- [x] Конкурентная разведка: 38 компаний, ценовой GAP выявлен
- [x] SEO-ядро: 55 запросов, 7 кластеров страниц
- [x] Анализ 10 сайтов конкурентов — слабые стороны определены
- [x] Фото-база: 171 файл + PDF от Шульца
- [x] Wordstat API зарегистрирован
**Следующие шаги:**
- [ ] Выбор стека и структуры сайта
- [ ] Контент от Шульца: 3D-визуализации, фото TF работ
- [ ] MVP сайта с портфолио и калькулятором
- [ ] SEO-оптимизация по собранному ядру
- [ ] Запуск рекламы (Яндекс.Директ)
- [ ] Презентация руководству фирмы (совместно с P3)
**Связано с:** G1, I2, M0, S6

### P2: Construction Orchestrator (на Agent Zero)
**Статус:** Концепция
**Суть:** AI-платформа для строительного бизнеса в нише МАФ. Не SaaS в классическом смысле — Agent Zero как мощный инструмент, лучше чем SaaS. Маркетинг + сайт + CRM + RAG + автоматизация. Сначала для себя → потом для рынка (MO7).
**Цель:** Полноценная AI-платформа, автоматизирующая строительный бизнес МАФ от лида до отчёта.
**Срок:** Q4 2026 (MVP), но RedTeam предупредил: сроки нереалистичны при 6/1 графике
**Следующие шаги:**
- [ ] Определить минимальный MVP (радикальное сужение)
- [ ] Настроить Agent Zero для строительных задач
- [ ] Тестирование на собственных проектах МАФ
**Блокеры:** C1 (время), C0 (навыки), зависимость от P3 для валидации
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
| P3 | Цифровой Прораб (PWA) | **Высокий** | 3 модуля готовы, но sync + Telegram = ещё работа. Можно в первые вечера сезона. |
| P4 | Инвест-портфель | Высокий | Капитал лежит — деньги должны работать. |
| P2 | Construction Orchestrator | Средний | Зависит от P3 и P1. Концепция. |

**Текущий фокус (март 2026) — две фазы:**

**Фаза A: Заточка инструментов (до ~10 марта):**
Неделя на финальную доводку PAI, чтобы к продуктовым задачам идти с отточенными механизмами.
1. **PAI Workspace v2 (Kitty)** — TELOS panel, расширить Command Center
2. **Бригада** — Z.AI в pipeline, A0 scheduled tasks, merge открытых Jules PRs
3. **Тестирование** — G10 аудит скиллов, усиление test suite
4. **Community** — пинг 7 upstream PRs, follow-up

**Фаза B: Продукт (10+ марта → сезон):**
Отточенные механизмы применяем на продуктовые задачи.
1. **P1 (Timber Frame сайт)** — MVP к концу марта, реклама в апреле
2. **P3 (Цифровой Прораб)** — SyncEngine + Telegram дайджест

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
