# Технические предпочтения (Tech Stack Preferences)

**Основано на исследовании 2026 года и практическом опыте работы с PAI.**

*Последнее обновление: 2026-02-20*
*Среда: WSL2 (Ubuntu) на Windows 11 Pro, Claude Code (PAI)*

---

## Рабочая среда

| Компонент | Значение | Заметки |
|-----------|----------|---------|
| **ОС** | Windows 11 Pro + WSL2 (Ubuntu) | Основная работа в WSL |
| **AI CLI** | **Claude Code (PAI)** | Фронтир. Основной инструмент. Skills, hooks, agents |
| **IDE** | VS Code | + Kilo Code extension для редактирования |
| **Shell** | bash (WSL2) | НЕ PowerShell — вся работа в Linux-окружении |
| **Terminal** | Windows Terminal → WSL2 | Иногда PowerShell на Windows-стороне |

---

## Языки

### Основные

| Язык | Когда использовать | Почему |
|------|-------------------|--------|
| **TypeScript** | Frontend, Web, PAI skills, CLI | Type safety, отличный AI support, Bun native |
| **Python 3.14+** | Telegram bots, AI agents, ML | Богатая экосистема, async/await |
| **Bun** | Runtime для TypeScript | В 3-5x быстрее Node.js, drop-in замена |

### Избегать

- **Go** — только если это не критично (Fabric использует, но learning curve крутой)
- **Rust** — overkill для текущих задач
- **PHP** — устаревший стек

---

## Среды выполнения и менеджеры пакетов

| Категория | Предпочтение | Заметки |
|----------|--------------|---------|
| JavaScript Runtime | **Bun** | Основной runtime для TypeScript |
| Package Manager (JS) | **bun** | Встроен в runtime |
| Package Manager (Python) | **uv** | Новый, быстрый (от Astral, создатели ruff) |
| Python Version | **3.14+** | Async improvements, performance |
| Node.js | npm | Fallback когда Bun не совместим (Next.js) |

---

## Фреймворки

### Frontend

| Фреймворк | Рейтинг | Когда использовать |
|-----------|---------|-------------------|
| **Next.js 16** | ⭐ #1 | Full-stack приложения, SSR, API routes. PAI Dashboard уже на Next.js 16 |
| **Astro** | ⭐ #2 | Контент-сайты, блоги, лендинги (P1: веб-ресурс МАФ?) |
| **VitePress** | | Документация, статические сайты |

**UI библиотека:** shadcn/ui + Tailwind CSS — уже используем в PAI Dashboard.

### Backend

| Фреймворк | Рейтинг | Когда использовать |
|-----------|---------|-------------------|
| **FastAPI** | ⭐ #1 | APIs, AI/ML endpoints, async |
| **Next.js API Routes** | ⭐ #2 | Когда frontend и backend в одном проекте |
| **Hono** | #3 | Edge functions, Cloudflare Workers |

### Telegram Bots

| Библиотека | Рейтинг | Почему |
|------------|---------|--------|
| **aiogram 3.x** | ⭐ #1 | Async-native, современный, активное community |
| python-telegram-bot | #2 | Sync, больше boilerplate |

**Рекомендация:** aiogram 3.x для всех новых ботов (включая Цифровой Прораб P3).

### AI Agents

| Фреймворк | Рейтинг | Когда использовать |
|-----------|---------|-------------------|
| **Claude Code (PAI)** | ⭐ S-tier | Основной агент. Skills, hooks, Algorithm, TELOS |
| **Agent Zero** | ⭐ S-tier | Автономные задачи, исследования, тяжёлые вычисления |
| **LangGraph** | A-tier | Production agents, state management |
| **Pydantic AI** | A-tier | Type-safe agents, интеграция с FastAPI |
| **CrewAI** | B-tier | Multi-agent orchestration |

---

## Базы данных

| Тип | Предпочтение | Случай использования |
|-----|--------------|---------------------|
| Relational | **PostgreSQL (Supabase)** | Основные данные, auth, realtime |
| Vector | **Qdrant** | RAG, embeddings (Context Engineering) |
| Cache | Redis | Сессии, rate limiting |
| Files | **Markdown (TELOS)** | Контекст, конфигурация, личные данные |

**PAI Dashboard:** Парсинг markdown файлов из ~/.claude/ — НЕ Supabase. Данные живут в файлах TELOS.

---

## Облако и инфраструктура

### Хостинг

| Тип | Предпочтение | Почему |
|-----|--------------|--------|
| Static/SSR | **Cloudflare Pages** | Бесплатно, быстро, edge |
| APIs/Workers | **Cloudflare Workers** | Бесплатный tier, global edge |
| Боты + Агенты | **VPS Timeweb (NL)** | 2 сервера: шлюз + Agent Zero. Полный контроль |
| Full-stack | Vercel | Хороший DX для Next.js |
| Dev Server | **localhost (WSL2)** | `npm run dev` → http://localhost:3000 |

### AI Models

| Провайдер | Модель | Когда использовать |
|-----------|--------|-------------------|
| **Anthropic** | Claude Opus 4.6 / Sonnet | Основной. Код, reasoning, PAI Algorithm |
| **Google** | Gemini Flash | Быстрые ответы, дешево |
| **Venice AI** | Llama, Mistral | Privacy-first, через A0T staking (G6) |

**Текущий стек:** Claude Opus 4.6 через Claude Code — основной рабочий инструмент.

---

## Инструменты разработки

### AI-ассистенты

| Инструмент | Роль | Заметки |
|------------|------|---------|
| **Claude Code (PAI)** | Основной AI CLI | Фронтир. Skills, hooks, agents, Algorithm, TELOS |
| **Kilo Code** | VS Code extension | Для быстрого редактирования в IDE |
| **Agent Zero** | Автономные агенты | VPS NL, Docker, тяжёлые задачи |

### Контроль версий

| Компонент | Предпочтение |
|-----------|--------------|
| Git | CLI (native в WSL2) |
| GitHub CLI | **gh** — для PR, issues |
| Стратегия | Trunk-based (простой для solo) |

---

## Библиотеки и утилиты

### Всегда использовать

| Категория | Библиотека | Почему |
|----------|------------|--------|
| HTTP Client (JS) | **fetch** (native) | Нет зависимостей |
| HTTP Client (Python) | **httpx** | Async + sync, современный |
| Validation (JS) | **zod** | Type-safe |
| Validation (Python) | **Pydantic** | Type-safe |
| Date/Time | **date-fns** | Tree-shakeable |
| Testing (JS) | **vitest** | Быстрый, Vite-native |
| Testing (Python) | **pytest** + **pytest-asyncio** | Стандарт |
| Linting (JS) | **Biome** | Быстрее ESLint в 100x |
| Linting (Python) | **ruff** | Быстрее flake8/black |
| UI Components | **shadcn/ui** | Tailwind-based, копируемые компоненты |
| CSS | **Tailwind CSS** | Utility-first |

### Избегать

| Библиотека | Использовать вместо | Причина |
|------------|---------------------|---------|
| axios | fetch / ky | Overkill, лишние зависимости |
| moment.js | date-fns | Moment в legacy mode |
| request | httpx | Request устарел |
| ESLint | Biome | Biome в 100x быстрее |
| Supabase (для PAI Dashboard) | Markdown парсинг | Данные живут в TELOS файлах |

---

## Стек по типу проекта

### PAI Dashboard

```
TypeScript + Next.js 16 + Tailwind + shadcn/ui
├── Парсинг markdown из ~/.claude/skills/PAI/USER/
├── Server Components + "use client" для интерактивных
├── API Routes для данных (goals, sessions, infra, telos-health)
├── TCP socket ping для инфраструктуры
└── npm run dev → localhost:3000
```

### Telegram Bot (Цифровой Прораб P3)

```
Python 3.14+ + aiogram 3.x + asyncio
├── SQLite (данные бота)
├── Google Sheets API (отчёты)
└── VPS Timeweb NL (деплой)
```

### Сайт/Лендинг МАФ (P1)

```
TypeScript + Next.js 16 (или Astro) + Tailwind + shadcn/ui
├── Supabase (CMS, auth, данные)
├── Cloudflare Pages (деплой)
└── Resend (email)
```

### AI Agent / Construction Orchestrator (P2)

```
TypeScript/Bun (PAI skills, оркестрация)
Python + Agent Zero (автономные задачи)
├── Qdrant (vector DB, RAG)
├── VPS NL (инфраструктура)
└── Venice AI / Claude (LLM)
```

---

## Конфигурация проекта по умолчанию

### TypeScript/Bun проект

```bash
bun init
bun add -d typescript @types/bun
bun add -d vitest biome
```

### Next.js проект

```bash
npx create-next-app@latest --typescript --tailwind --app
npx shadcn@latest init
```

### Python проект

```bash
uv init
uv add aiogram pydantic httpx
uv add -d pytest pytest-asyncio ruff
```

---

## Источники

- Reddit r/SaaS: "My favorite tech stack for 2026"
- JetBrains: "State of Python 2025"
- Daniel Miessler: PAI/Fabric philosophy
- Практический опыт: PAI Dashboard (Next.js 16 + shadcn/ui)
- Практический опыт: Agent Zero integration (A2A, Docker, VPS NL)

---

*Обновлять ежеквартально. Адаптировать по мере освоения новых инструментов.*
