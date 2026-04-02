# PAI Upgrade Report
**Дата:** 2026-04-02
**Источники:** 5 release notes (v2.1.85-v2.1.90) | 18 видео YouTube (3 канала) | 30+ источников Anthropic | 8 GitHub trending репо | 75 рефлексий алгоритма
**Результат:** 39 техник извлечено | 10 материалов пропущено

---

## 📈 Прогресс внедрения

| Категория | Внедрено | Pending | Пропущено |
|-----------|----------|---------|-----------|
| 🔴 CRITICAL | 5/6 | 1 | 0 |
| 🟠 HIGH | 1/7 | 5 | 1 |
| 🟡 MEDIUM | 0/3 | 3 | 0 |
| **Итого** | **6/16** | **9** | **1** |

**Коммиты:** `fd2999d` (3 quick wins + EVIDENCE_FIRST) | `481bad6` (Circuit Breaker) | `df9052e` + `af1818b` (PhaseGate)

---

## ✨ Находки

| # | Находка | Источник | Почему интересно | Значимость для PAI |
|---|---------|----------|-----------------|-------------------|
| 1 | **autoDream: трёхвратовая консолидация памяти** | GitHub: claurst (7K stars) — реверс-инжиниринг Claude Code из sourcemap утечки | Фоновый субагент с 3 воротами (24ч времени, 5+ сессий, блокировка конкурентности) автоматически синтезирует кросс-сессионные паттерны в Wisdom Frames. Это *production-код из самого Claude Code* | LEARN-фаза PAI работает только в рамках сессии. Это даст автоматическую кросс-сессионную экстракцию паттернов |
| 2 | **Inbox для команд агентов — субагенты общаются друг с другом** | YouTube: R Amjad — "Agent Teams in 12 min" | Новый примитив Claude Code: очереди сообщений в `.claude/teams/inboxes/`. Субагенты коммуницируют в реальном времени, а не только возвращают результат родителю | Параллельные субагенты PAI не могут координироваться во время выполнения. Inbox паттерн позволяет реалтайм мультиагентную работу |
| 3 | **Domain Ownership Enforcement — ограничение агентов по директориям** | YouTube: IndyDevDan — "One Agent Is NOT Enough" | Front matter `domain: { read: ["*"], update: ["frontend/"] }` привязывает агентов к конкретным директориям. Агент, выходящий за границы, автоматически делегирует | В PAI нет domain locking для субагентов. Критично для контроля blast radius на больших задачах |
| 4 | **Hook `if` — условная фильтрация хуков** | GitHub: claude-code v2.1.85 release | `if: "Edit(*.md)"` на хуках — срабатывает только на подходящих файлах, снижая процессовый overhead. Простая правка конфига — огромный выигрыш | LearnGate PAI срабатывает на КАЖДОМ Edit, SecurityValidator на КАЖДОМ Bash. С `if` только релевантные вызовы триггерят хуки |
| 5 | **4-уровневая прогрессивная компрессия контекста** | GitHub: claude-code-book (1.3K stars) | Snip → MicroCompact → Collapse → AutoCompact. Вместо бинарного compact — градуированный подход. Snip подрезает сообщения, MicroCompact суммирует tool outputs, Collapse сливает сегменты | В PAI бинарный compact. 4 уровня дадут более тонкое управление контекстом при длинных Algorithm-ранах |
| 6 | **EVIDENCE_FIRST_VERIFICATION (67% рефлексий)** | Внутреннее: 75 рефлексий алгоритма, 50/75 записей | Самый сильный внутренний сигнал. Алгоритм не имеет обязательного количественного pre-flight чека перед BUILD. 67% рефлексий говорят "сначала проверь" | Прямое исправление самой частой ошибки PAI — построение до верификации предположений |
| 7 | **Expertise-файлы агентов / Персистентные ментальные модели** | YouTube: IndyDevDan — агенты, которые учатся | `expertise: [{ path: "backend_dev.md", updatable: true, max_lines: 10000 }]` — per-agent, per-domain файлы знаний, которые растут со временем | PAI скидывает всё в общий MEMORY.md. Expertise-файлы дадут специализацию агентов |
| 8 | **Git Context Controller для памяти** | YouTube: AI Jason — "Agent memory resolved?" | main.md (roadmap) + branches/{name}/commit.md (milestones) + log.md (raw). Паттерн fork/commit/merge для исследований. Улучшение SWE на 13% | PAI использует плоские MEMORY-файлы. Git-подобная структура позволит ветвить исследования без загрязнения основного контекста |
| 9 | **Circuit Breaker для компрессии/стагнации** | GitHub: how-claude-code-works (1.2K stars) | После 3 последовательных ошибок компрессии — остановись и покажи проблему пользователю. Основано на 1,279 реальных сессиях | Autoresearch PAI имеет детекцию стагнации, но нет circuit breaker. Более надёжная обработка сбоев |
| 10 | **Паттерн `claude -p` subprocess** | GitHub: anthropics/skills commit b0cbd3d | `subprocess.run(["claude", "-p", ...])` переиспользует аутентификацию Claude Code — не нужен отдельный API key. Удаляет CLAUDECODE env var для вложенности | Утилиты PAI, которым нужен LLM (оптимизатор скиллов, генератор описаний), могут переиспользовать auth без управления API ключами |
| 11 | **Hook "defer" decision для PreToolUse** | GitHub: claude-code v2.1.89 | Хуки могут вернуть `{ "decision": "defer" }` — headless-сессии ставятся на паузу и возобновляются через `-p --resume`. Для некритичных проверок в SDK-режиме | PAI запускает `claude -p` через SDK. Сейчас хуки только allow/deny — defer даёт безопаснее headless-операции |
| 12 | **MCP_CONNECTION_NONBLOCKING** | GitHub: claude-code v2.1.89 | `MCP_CONNECTION_NONBLOCKING=true` пропускает ожидание MCP-соединения в `-p` режиме. Таймаут соединений 5с вместо блокировки на самом медленном сервере | Автоматизированные `-p` workflow PAI страдают от блокировки медленных MCP серверов. Одна env-переменная фиксит |
| 13 | **Кросс-сессионная кросс-агентная шаринг-память** | YouTube: AI Jason — OneContext tool | Общая DB (line.db), любой агент читает/пишет, auto-суммаризация на stop hook, прогрессивный retrieval (broad → session → turn) | Субагенты PAI не разделяют память. Единый knowledge graph позволит параллельную координацию |
| 14 | **Lean Snapshot паттерн (9x снижение контекста)** | GitHub: Pilot (29 stars) | Navigate возвращает ~2K preview вместо ~60K полного дампа. Полный snapshot только по необходимости. 13K vs 120K total | Браузерные скиллы PAI отправляют полные snapshots. Lean паттерн сократит браузерный контекст в 9 раз |
| 15 | **showThinkingSummaries молча отключён** | GitHub: claude-code v2.1.89 | Дефолт изменился — thinking summaries больше не генерируются в интерактивных сессиях. Нужно `showThinkingSummaries: true` чтобы вернуть | Algorithm mode PAI полагается на прозрачность thinking. Молча отключено = снижена способность дебага |
| 16 | **Принцип CODE_OVER_PROMPT для персистентности** | Внутреннее: 6 записей рефлексий | Критичные данные (ISC state, PRD чекбоксы) полагаются на промпт-инструкции для персистентности. Только хуки гарантируют выживание между сессиями | В PAI есть prompt-based инструкции записи, которые архитектурно ненадёжны — нужен аудит hook-based персистентности |

---

## 🔥 Рекомендации

### 🔴 CRITICAL — Интегрировать немедленно

| # | Рекомендация | Статус | Коммит |
|---|-------------|--------|--------|
| 4 | **Hook `if` условная фильтрация** к SecurityValidator, LearnGate, VerificationGate | ✅ Done | `fd2999d` |
| 15 | **showThinkingSummaries: true** в settings.json | ✅ Done | `fd2999d` |
| 12 | **MCP_CONNECTION_NONBLOCKING=true** для `-p` режима | ✅ Done | `fd2999d` |
| 6 | **EVIDENCE_FIRST гейт** в Algorithm v4.0.1 | ✅ Done | `fd2999d` |
| 1 | **autoDream-style трёхвратовая консолидация памяти** | ⏳ Pending | — |
| 16 | **Аудит prompt→hook персистентность** + PhaseGate.hook.ts | ✅ Done | `df9052e`, `af1818b` |

### 🟠 HIGH — Интегрировать на этой неделе

| # | Рекомендация | Статус | Коммит |
|---|-------------|--------|--------|
| 2 | **Agent Teams Inbox** для координации субагентов | ⏳ Pending | — |
| 3 | **Domain ownership enforcement** для субагентов | ✅ Done | `6b118b5` |
| 7 | **Per-agent expertise файлы** в MEMORY/EXPERTISE/ | ⏳ Pending | — |
| 10 | ~~`claude -p` subprocess паттерн~~ | ❌ Skipped | Используем Anthropic API + Z.AI напрямую |
| 11 | **Hook "defer" decision** для headless режима | ⏳ Pending | — |
| 5 | **4-уровневая прогрессивная компрессия** | ⏳ Pending | — |
| 9 | **Circuit Breaker** для стагнации | ✅ Done | `481bad6` |

### 🟡 MEDIUM — Интегрировать когда удобно

| # | Рекомендация | Значимость для PAI | Усилия | Файлы |
|---|-------------|-------------------|--------|-------|
| 8 | **Принять Git Context Controller паттерн для памяти** | Плоские MEMORY файлы → ветвящаяся структура с fork/commit/merge для исследований | Med | Структура `MEMORY/` |
| 14 | **Применить Lean Snapshot паттерн к браузерным скиллам** | 9x снижение контекста при браузерной автоматизации. 2K preview вместо 60K полного дампа | Med | Browser skill |
| 13 | **Кросс-агентная shared memory DB** | Субагенты не разделяют память. Единый knowledge graph позволяет параллельную координацию | High | Новая инфраструктура |
| 11b | **Аудит описаний скиллов < 1024 символов** | Claude Code обрезает описания на 1024 символа (250 для листинга). Описания PAI могут превышать | Low | `skill-index.json`, все `SKILL.md` |

### 🟢 LOW — Осведомлённость / на будущее

| # | Рекомендация | Значимость для PAI | Усилия | Файлы |
|---|-------------|-------------------|--------|-------|
| 4b | **Plugin keep marketplace on failure** env var | Офлайн-устойчивость для сред PAI с ограниченной связью | Low | `settings.json` |
| 5b | **Skills 2.0 open standard** (agentskills.io) | Скиллы PAI используют кастомный формат. Открытый стандарт сделает их переносимыми между harness-ами | Low | Будущее рассмотрение |
| 6b | **1M контекстное окно** для стратегических задач | Opus 4.6 с 1M контекстом позволяет загрузить полный MEMORY + FRAMES без компрессии | Low | Стратегические сессии |

---

## 🪞 Внутренние рефлексии

**Источник:** MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl
**Записей проанализировано:** 75 | **Период:** 2026-02-21 — 2026-02-28 | **Высокосигнальных:** 50 записей

### EVIDENCE_FIRST_VERIFICATION (50 упоминаний, сигнал: HIGH)
**Корневая причина:** Алгоритм не имеет обязательного pre-flight verification гейта. OBSERVE читает код, но не требует количественной валидации перед BUILD.
**Предлагаемый фикс:** Добавить OBSERVE_VERIFICATION gate: обязательные (1) grep -c целевых паттернов, (2) wc -l файлов для изменения, (3) явный подсчёт реальных целей vs предполагаемых.
**Цель:** `PAI/Algorithm/v4.0.0.md`

### PARALLEL_FIRST_EXECUTION (12 упоминаний, сигнал: HIGH)
**Корневая причина:** Последовательные чтения и сериальные тестовые итерации — дефолт. Алгоритм не требует параллельных паттернов.
**Предлагаемый фикс:** OBSERVE обязан батчить все чтения файлов в параллельные вызовы. VERIFY обязан батчить независимые тесты.
**Цель:** `PAI/Algorithm/v4.0.0.md`

### AGENT_OUTPUT_QUALITY_CONTROL (12 упоминаний, сигнал: HIGH)
**Корневая причина:** Агенты возвращают ссылки на номера строк, которые сдвигаются, ложные тревоги из-за отсутствия архитектурного контекста, баги задокументированы но не пофикшены.
**Предлагаемый фикс:** Обязательный формат вывода агентов: точный сниппет кода а не номера строк, классификация severity, предлагаемый фикс.
**Цель:** `PAI/Algorithm/v4.0.0.md`, `skills/Agents/SKILL.md`

### FAST_PATH_FOR_KNOWN_PATTERNS (11 упоминаний, сигнал: MEDIUM)
**Корневая причина:** Алгоритм применяет полный 7-фазный флоу к ранее решённым паттернам (stub-fill, bulk-replace, research-only).
**Предлагаемый фикс:** Библиотека паттернов: stub-fill (read deps → write stubs → tsc → build), bulk-replace (grep count → sed → verify), research-only (collapse BUILD+EXECUTE в SYNTHESIZE).
**Цель:** `PAI/Algorithm/v4.0.0.md`

---

## 📊 Сводка

| # | Техника | Источник | Приоритет | Статус | Коммит |
|---|---------|----------|-----------|--------|--------|
| 4 | Hook `if` условная фильтрация | claude-code v2.1.85 | 🔴 | ✅ Done | `fd2999d` |
| 15 | showThinkingSummaries: true | claude-code v2.1.89 | 🔴 | ✅ Done | `fd2999d` |
| 12 | MCP_CONNECTION_NONBLOCKING | claude-code v2.1.89 | 🔴 | ✅ Done | `fd2999d` |
| 6 | EVIDENCE_FIRST gate | Рефлексии (50 hits) | 🔴 | ✅ Done | `fd2999d` |
| 1 | Трёхвратовая консолидация памяти | claurst leak (7K stars) | 🔴 | ⏳ Pending | — |
| 16 | Prompt→Hook персистентность + PhaseGate | Рефлексии (6 hits) | 🔴 | ✅ Done | `df9052e` |
| 2 | Agent Teams Inbox | YouTube: R Amjad | 🟠 | ⏳ Pending | — |
| 3 | Domain ownership enforcement | YouTube: IndyDevDan | 🟠 | ✅ Done | `6b118b5` |
| 7 | Per-agent expertise файлы | YouTube: IndyDevDan | 🟠 | ✅ Done | `1981869` |
| 10 | ~~`claude -p` subprocess паттерн~~ | GitHub: anthropics/skills | 🟠 | ❌ Skipped | Используем Anthropic API + Z.AI |
| 11 | Hook "defer" decision | claude-code v2.1.89 | 🟠 | ✅ Done | `9dc0055` |
| 5 | 4-уровневая прогрессивная компрессия | claude-code-book (1.3K stars) | 🟠 | ⏳ Pending | — |
| 9 | Circuit Breaker для стагнации | how-claude-code-works (1.2K stars) | 🟠 | ✅ Done | `481bad6` |
| 8 | Git Context Controller | YouTube: AI Jason | 🟡 | ⏳ Pending | — |
| 14 | Lean Snapshot паттерн | GitHub: Pilot | 🟡 | ✅ Done | `7e377ae` |
| 13 | Кросс-агентная shared memory | YouTube: AI Jason | 🟡 | ⏳ Pending | — |

**Прогресс:** 10/16 внедрено (63%) | 1/16 пропущено | 5/16 pending

---

## ⏭️ Пропущенный контент

| Контент | Источник | Причина пропуска |
|---------|----------|-----------------|
| CEO Agent Strategic Pattern | YouTube: IndyDevDan | Интересно, но TELOS Council PAI уже покрывает это |
| Steer/Drive macOS автоматизация | YouTube: IndyDevDan | PAI работает на Linux (WSL2), не macOS |
| MCP env vars для headersHelper | claude-code v2.1.85 | PAI не использует кастомные headersHelper скрипты |
| 50K hook output auto-save | claude-code v2.1.89 | Автоматическое изменение поведения, код не нужен |
| Session-Id header для proxy | claude-code v2.1.86 | Автоматически, действий не требуется |
| PermissionDenied hook с retry | claude-code v2.1.89 | Связано с defer, но ниже приоритетом |
| Compaction + max_tokens доки | anthropics/skills | PAI использует CLI, не raw API |
| windbg-mcp | GitHub trending | Нишевый Windows-дебаггинг, не релевантно PAI |
| ccx-rs Rust архитектура | GitHub trending | Интересно как справочник, но PAI на TypeScript |
| mcp-scan security tool | GitHub trending | Хорошо для осведомлённости, но без немедленных действий |

---

## 🔍 Обработанные источники

**Release Notes:** claude-code v2.1.85, v2.1.86, v2.1.89, v2.1.90, anthropics/skills commits → 15 техник
**YouTube видео:** IndyDevDan (7 новых), AI Jason (5 новых), R Amjad (9 новых) → 16 техник
**GitHub Trending:** 8 репо проанализировано → 10 техник (5 уникальных после дедупликации)
**Внутренние рефлексии:** 75 записей → 7 кандидатов на улучшение

---

## 🎯 Самые быстрые победы (3 правки settings.json)

1. Добавить `"showThinkingSummaries": true` в верхний уровень settings.json
2. Добавить `"MCP_CONNECTION_NONBLOCKING": "true"` в env секцию settings.json
3. Добавить `"if"` поля к хукам LearnGate, SecurityValidator, VerificationGate для фильтрации по файлам

Все три — по одной строке, immediate эффект.
