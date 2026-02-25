---
created: 2026-02-19
session: pai-dashboard-planning
status: READY_TO_START
next_phase: PLANNING → DEVELOPMENT
---

# PAI Dashboard — Handoff для новой сессии

## Как использовать этот файл
В новой сессии скажи Navi:
> "Navi, продолжаем PAI Dashboard. Прочитай ~/.claude/MEMORY/WORK/pai-dashboard-session-2026-02-19/HANDOFF.md"

---

## Что мы решили (эта сессия)

### Проект
**PAI Dashboard (Концепция A)** — веб-интерфейс для нашего с Navi взаимодействия.

**3 экрана:**
1. **Обзор** — TELOS цели, статус инфраструктуры (agentzero + xray-vps), последние сессии
2. **TELOS редактор** — цели, проекты, идеи в красивом виде с базой данных
3. **Память / История** — что Navi помнит об Ivan, поиск по сессиям

### Технический стек (решено)
- **Next.js** (App Router) — frontend + API routes
- **Supabase** — база данных (бесплатный tier)
- **shadcn/ui** — UI компоненты
- **Vercel** — деплой (токен в ~/.config/PAI/.env)
- **GitHub** — репозиторий (токен в ~/.config/PAI/.env)
- **TypeScript** — везде

### Установленные Agent Skills (в ~/.claude/skills/)
- `vercel-react-best-practices` — 57 правил React/Next.js
- `web-design-guidelines` — UI/UX стандарты
- `vercel-composition-patterns` — архитектура компонентов
- `supabase-postgres-best-practices` — официальный Supabase

---

## Инфраструктура Ivan

- **WSL2** Ubuntu 24.04 на Windows 11 Pro
- **agentzero** (72.56.86.51) — 8GB RAM, Agent Zero Docker (ports 50001-50003)
- **xray-vps** (72.56.99.127) — Xray proxy
- **Токены:** VERCEL_TOKEN, GITHUB_TOKEN в ~/.config/PAI/.env
- **GitHub:** rikitikitavi2012-debug

### Существующие проекты на Vercel (не трогаем)
- smart-estimator-pro (Vite) ✅ READY
- v0-terrace-calculator-app-8fx3 (Next.js) ✅ READY
- v0-finance-flow-ai-structure (Next.js) ✅ READY

---

## MCP серверы (статус)
- ✅ Exa MCP — работает (ключ в .env)
- ✅ Supabase MCP — добавлен в settings.json, токен валидный
  - Существующий проект: construction-kb-poc (eu-north-1, INACTIVE)
  - Для PAI Dashboard создадим НОВЫЙ проект на Supabase
  - ⚠️ MCP активируется после рестарта Claude Code

## Следующие шаги (в следующей сессии)

### Как запустить новую сессию
```bash
# В Windows Terminal (WSL):
mkdir -p ~/projects/pai-dashboard
cd ~/projects/pai-dashboard
claude
# Затем написать фразу ниже
```

### Фраза для старта
```
Navi, продолжаем PAI Dashboard.
Прочитай ~/.claude/MEMORY/WORK/pai-dashboard-session-2026-02-19/HANDOFF.md
и начинай Plan Mode.
```

### Шаг 1 — Plan Mode (ОБЯЗАТЕЛЬНО перед кодом)
```
"Navi, запускай Plan Mode для PAI Dashboard.
 Стек: Next.js, Supabase, shadcn/ui, Vercel.
 Экраны: Overview, TELOS Editor, Memory Viewer."
```
Я войду в plan mode → исследую → предложу архитектуру → жду одобрения Ivan.

### Шаг 2 — GitHub репо
Создать репо `pai-dashboard` в аккаунте rikitikitavi2012-debug

### Шаг 3 — Scaffold
```bash
npx create-next-app@latest pai-dashboard \
  --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*"
```

### Шаг 4 — Supabase проект
Создать на supabase.com, получить URL + anon key

### Шаг 5 — Первый деплой на Vercel
Пустой Next.js → GitHub → Vercel → живой URL

### Шаг 6 — Agent Teams для разработки
Параллельная разработка трёх экранов разными агентами.

---

## Чему Ivan научился в этой сессии
- CI/CD: local → git push → Vercel auto-deploy
- Ветки: main = продакшн, dev = рабочая, feature/* = задача
- Vercel Agent Skills: что это, как устанавливать, механизм симлинков
- Exa MCP: работает, нейронный поиск, $0.01/запрос
- /compact, /clear, переключение моделей (/model)

---

## Вопросы которые остались открытыми
- Структура Supabase схемы (решим в plan mode)
- Нужна ли аутентификация в дашборде (Ivan один пользователь — возможно нет)
- Какие метрики показывать на Overview экране
