# Autoresearch: сравнительный анализ трёх репозиториев

**Дата:** 2026-03-15
**Метод:** Extensive Research (прямой анализ исходного кода и документации всех трёх репозиториев)
**Источники:** GitHub API — полный контент program.md, SKILL.md, all reference docs, all skill files

---

## Executive Summary

Три репозитория представляют **три различных философии** автономных AI-исследований:

1. **Karpathy autoresearch** — минималистичный, domain-specific (ML training), "один файл + одна метрика + бесконечный цикл". Элегантность через ограничения.
2. **uditgoenka/autoresearch** — обобщённый Claude Code skill, переносящий принципы Karpathy на любую задачу. Добавляет planning wizard, security audit, structured logging. Domain-agnostic.
3. **ARIS (Auto-Research-In-Sleep)** — полный research pipeline (от discovery идеи до submission paper), с кросс-модельной рецензией через Codex MCP. Максимально сложная архитектура с 20+ навыками.

---

## 1. Karpathy autoresearch

**URL:** https://github.com/karpathy/autoresearch
**Автор:** Andrej Karpathy
**Звёзды:** top trending (март 2026)
**Фокус:** Автономная оптимизация LLM training на одном GPU

### Ключевые файлы

| Файл | Роль |
|------|------|
| `program.md` | Инструкция для агента — единственный "код" для human |
| `train.py` | Единственный редактируемый файл агента |
| `prepare.py` | Read-only: данные, токенизатор, evaluation (DO NOT CHANGE) |

### Архитектура цикла

```
SETUP:
  1. Создать branch autoresearch/<tag>
  2. Прочитать все 3 файла (полный контекст — 630 строк)
  3. Создать results.tsv, записать baseline
  4. Подтвердить и начать

LOOP FOREVER:
  1. Посмотреть git state
  2. Изменить train.py (архитектура, оптимизатор, гиперпараметры)
  3. git commit
  4. uv run train.py > run.log 2>&1
  5. grep "^val_bpb:" run.log
  6. Если пусто → crash → tail -n 50 run.log → fix или skip
  7. Записать в results.tsv
  8. Если improved → keep commit (advance branch)
  9. Если same/worse → git reset --hard HEAD~1
```

### Метрика

- **val_bpb** (validation bits per byte) — ниже = лучше
- Vocabulary-size-independent — честное сравнение архитектурных изменений
- Фиксированный time budget: 5 минут wall clock → ~12 экспериментов/час → ~100 за ночь

### Git как память

- Ветка `autoresearch/<tag>` — линейная история "kept" экспериментов
- `results.tsv` — НЕ коммитится (untracked), 5 колонок: `commit | val_bpb | memory_gb | status | description`
- git reset для revert неудачных попыток — ветка содержит только успешные шаги

### Ключевые принципы

1. **Один файл для модификации** (train.py) — scope manageable, diffs reviewable
2. **Фиксированный time budget** — все эксперименты сравнимы
3. **Self-contained** — PyTorch + несколько пакетов, один GPU, один файл, одна метрика
4. **NEVER STOP** — агент НИКОГДА не спрашивает "should I continue?", работает пока не прервут
5. **Simplicity criterion** — "0.001 improvement + 20 lines of hacky code = not worth it; deletion + same result = keep"
6. **Human programs program.md, agent programs train.py** — чёткое разделение стратегии и тактики

### Сильные стороны

- **Элегантность и минимализм** — весь "framework" это один .md файл (~200 строк)
- **Работает из коробки** — `uv run prepare.py && uv run train.py` и передай агенту
- **Реальная задача** — не toy example, а полноценный GPT training (nanochat fork)
- **Научная строгость** — val_bpb как vocab-independent метрика, fixed time budget
- **Zero infrastructure** — никаких MCP серверов, API ключей, отдельных tool-ов
- **Философский фреймворк** — "you program the markdown, agent programs the code"

### Слабые стороны

- **Domain-locked** — работает только для ML training (один GPU, один скрипт)
- **Нет planning phase** — агент сразу начинает эксперименты без стратегического анализа
- **Нет cross-model review** — один агент делает всё, нет внешней критики
- **Простой logging** — TSV без delta tracking, без pattern analysis
- **Нет recovery после context window overflow** — если агент "забыл" контекст, нет механизма восстановления
- **Requires GPU** — в оригинале только NVIDIA, хотя появились форки для MPS/CPU

### Уникальные идеи (не встречаются в двух других)

1. **"Human programs markdown, agent programs code"** — метафора "research org code" — промпт как оргструктура
2. **Fixed time budget** (не iteration count) — эксперименты сравнимы вне зависимости от hardware
3. **Simplicity criterion с конкретными threshold-ами** — "<0.001 improvement + ugly code = discard"
4. **Branch-per-run** — чистая git-история экспериментов
5. **Redirect everything** — `> run.log 2>&1` (не tee) чтобы не засорять context window

---

## 2. uditgoenka/autoresearch

**URL:** https://github.com/uditgoenka/autoresearch
**Автор:** Udit Goenka
**Фокус:** Обобщение autoresearch на любую задачу как Claude Code skill

### Ключевые файлы

| Файл | Роль |
|------|------|
| `skills/autoresearch/SKILL.md` | Основной skill с полным протоколом |
| `references/autonomous-loop-protocol.md` | 8-фазный протокол цикла |
| `references/core-principles.md` | 7 универсальных принципов |
| `references/results-logging.md` | TSV format с delta tracking |
| `references/plan-workflow.md` | /autoresearch:plan wizard |
| `references/security-workflow.md` | /autoresearch:security audit |

### Архитектура цикла (8 фаз)

```
SETUP:
  1. Прочитать все in-scope файлы
  2. Определить goal + mechanical metric
  3. Определить scope constraints
  4. Создать results log + baseline (iteration #0)
  5. Подтвердить и начать

LOOP (FOREVER или N раз):
  Phase 1: REVIEW — прочитать state, git history, results log (30 сек)
  Phase 2: IDEATE — выбрать следующее изменение стратегически
  Phase 3: MODIFY — ONE focused change
  Phase 4: COMMIT — git commit BEFORE verification
  Phase 5: VERIFY — mechanical metric
  Phase 6: DECIDE — improved→keep, same/worse→revert, crash→fix(3x)→skip
  Phase 7: LOG — append to results TSV
  Phase 8: REPEAT
```

### Subcommands

| Команда | Назначение |
|---------|-----------|
| `/autoresearch` | Основной цикл (unlimited или `/loop N`) |
| `/autoresearch:plan` | Интерактивный wizard: Goal → Scope → Metric → Direction → Verify → Launch |
| `/autoresearch:security` | STRIDE + OWASP Top 10 + 4 adversarial personas |

### 7 Core Principles

1. **Constraint = Enabler** — автономия через ограничения, не вопреки им
2. **Separate Strategy from Tactics** — human sets direction, agent executes
3. **Metrics Must Be Mechanical** — если нельзя проверить командой, нельзя итерировать автономно
4. **Verification Must Be Fast** — быстрая проверка > тщательная но медленная
5. **Iteration Cost Shapes Behavior** — дешёвая итерация → смелые эксперименты
6. **Git as Memory and Audit Trail** — каждый keep коммитится, агент читает свою историю
7. **Honest Limitations** — явно заявлять что система НЕ может

### /autoresearch:plan Wizard

Пошаговый процесс:
1. **Capture Goal** — "что улучшить?" (с вариантами: code quality, performance, content, refactoring)
2. **Analyze Context** — сканирует codebase (package.json, test runners, build scripts)
3. **Define Scope** — suggest file globs, validate ≥1 файл
4. **Define Metric** — MUST be mechanical (число, не субъективное)
5. **Define Direction** — higher/lower is better
6. **Define Verify** — shell command + **DRY RUN** (обязательно проверить ДО запуска)
7. **Confirm & Launch** — показать конфигурацию, предложить unlimited/bounded/copy

### Results Logging (TSV)

```
# metric_direction: higher_is_better
iteration  commit   metric   delta    status      description
0          a1b2c3d  85.2     0.0      baseline    initial state
1          b2c3d4e  87.1     +1.9     keep        add auth tests
2          -        86.5     -0.6     discard     refactor helpers
```

6 колонок (vs 5 у Karpathy), добавлена `delta` и `iteration` counter.

### Domain Adaptation Table

| Domain | Metric | Scope | Verify |
|--------|--------|-------|--------|
| Backend | tests + coverage % | `src/**/*.ts` | `npm test` |
| Frontend | Lighthouse score | `src/components/**` | `npx lighthouse` |
| ML | val_bpb / loss | `train.py` | `uv run train.py` |
| Blog | word count + readability | `content/*.md` | custom script |
| Performance | benchmark time (ms) | target files | `npm run bench` |
| Security | OWASP + STRIDE coverage | API/auth | `/autoresearch:security` |

### Сильные стороны

- **Domain-agnostic** — работает для кода, контента, performance, security
- **Planning wizard** — превращает размытую цель в validated конфигурацию с dry-run
- **Structured logging** — delta tracking, iteration counter, metric direction
- **Security audit mode** — STRIDE + OWASP + 4 red-team personas с composite metric
- **Bounded mode** — `/loop N` для контролируемых сессий
- **When-stuck protocol** — конкретные шаги после >5 consecutive discards
- **Crash recovery protocol** — до 3 попыток фикса, чёткие правила для разных типов ошибок
- **Simplicity override** — формализованное правило: "+<0.1% + complexity = discard"

### Слабые стороны

- **Нет cross-model review** — один Claude Code делает всё
- **Нет state persistence** — при context window overflow всё теряется (в отличие от ARIS)
- **Зависимость от Claude Code** — это skill, не standalone tool
- **Нет research pipeline** — только iteration loop, нет idea discovery/paper writing
- **Security audit не тестировался публично** — v1.0.3, вероятно ранняя стадия
- **Нет remote execution** — только локальные команды

### Уникальные идеи (не встречаются в двух других)

1. **/autoresearch:plan wizard** — единственный из трёх имеет guided setup с dry-run validation
2. **Security audit mode (STRIDE + OWASP)** — совершенно другой домен применения autoresearch pattern
3. **Metric Suggestion Database** — готовые шаблоны verify-команд для разных доменов
4. **Формализованные 7 принципов** — извлечены из Karpathy и записаны как reusable framework
5. **"Simplicity override" как явное правило** — "+<0.1% + complexity = discard; unchanged + simpler = keep"
6. **Bounded + unbounded mode** — `/loop N` интеграция с Claude Code native

---

## 3. ARIS (Auto-Research-In-Sleep)

**URL:** https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep
**Автор:** wanshuiyin
**Фокус:** End-to-end ML research pipeline с кросс-модельной рецензией

### Ключевые skills (20+)

| Skill | Роль |
|-------|------|
| `auto-review-loop` | Кросс-модельная рецензия через Codex MCP (GPT-5.4) |
| `auto-review-loop-llm` | То же через любой OpenAI-compatible API |
| `auto-review-loop-minimax` | Вариант с MiniMax API |
| `auto-paper-improvement-loop` | Review → Fix → Recompile LaTeX (2 раунда) |
| `run-experiment` | Deploy на remote/local GPU через screen/SSH |
| `research-pipeline` | Full: idea → experiments → submission |
| `idea-discovery` | Literature survey → brainstorm → novelty check → review |
| `idea-creator` | Генерация 8-12 идей через GPT-5.4 xhigh |
| `novelty-check` | Multi-source проверка новизны (arXiv, Scholar, LLM cross-check) |
| `research-lit` | Literature survey |
| `dse-loop` | Design Space Exploration для EDA/computer architecture |
| `paper-plan/write/compile/figure` | Paper writing pipeline |
| `monitor-experiment` | Мониторинг remote experiments |
| `analyze-results` | Анализ результатов экспериментов |
| `feishu-notify` | Уведомления в Feishu (Lark) |
| `pixel-art` | Генерация pixel art для papers/presentations |

### Архитектура: кросс-модельная рецензия

```
┌─────────────────────┐          ┌───────────────────────┐
│    Claude Code       │          │   External Reviewer    │
│    (Executor)        │─────────▶│   (Codex MCP)         │
│                      │          │   GPT-5.4 xhigh       │
│  ANTHROPIC_* env     │◀─────────│   или любой LLM API   │
│                      │          │                       │
│  Делает:             │          │  Делает:              │
│  - код               │          │  - рецензия           │
│  - эксперименты      │          │  - score 1-10         │
│  - исправления       │          │  - weaknesses         │
│  - paper writing     │          │  - actionable fixes   │
└─────────────────────┘          └───────────────────────┘
```

**Ключевая идея:** Один и тот же модель, рецензирующий свою работу, попадает в **local minima** — те же паттерны мышления создают слепые зоны. Кросс-модельная рецензия (Claude пишет, GPT рецензирует) ломает этот цикл.

### Auto-Review Loop (основной цикл)

```
MAX_ROUNDS = 4
POSITIVE_THRESHOLD = score >= 6/10

LOOP:
  Phase A: REVIEW — отправить полный контекст рецензенту (Codex MCP, model_reasoning_effort: xhigh)
  Phase B: PARSE — score, verdict, action items
  Phase C: IMPLEMENT FIXES — по приоритету severity (CRITICAL > MAJOR > MINOR)
  Phase D: WAIT — мониторить remote experiments
  Phase E: DOCUMENT — append to AUTO_REVIEW.md + update REVIEW_STATE.json

  STOP: score >= 6 AND verdict = "ready"/"almost"
```

### State Persistence (Compact Recovery)

```json
{
  "round": 2,
  "threadId": "019cd392-...",
  "status": "in_progress",
  "last_score": 5.0,
  "last_verdict": "not ready",
  "pending_experiments": ["screen_name_1"],
  "timestamp": "2026-03-13T21:00:00"
}
```

- Пишется после каждого раунда
- При context compaction — автоматическое восстановление
- Stale detection: >24 часов → fresh start
- ThreadId сохраняется для `mcp__codex__codex-reply` (conversation continuity)

### Research Pipeline (полный цикл)

```
Stage 1: /idea-discovery
  ├── /research-lit (literature survey)
  ├── /idea-creator (brainstorm 8-12 ideas via GPT-5.4 xhigh)
  ├── /novelty-check (multi-source verification)
  └── /research-review (critical feedback)

Gate 1: Human checkpoint (AUTO_PROCEED=true → auto-select top idea)

Stage 2: Implementation
  └── Extend pilot → full experiment code

Stage 3: /run-experiment
  └── Deploy to GPU via SSH + screen

Stage 4: /auto-review-loop
  └── 4 rounds of cross-model review

Stage 5: Final report
```

**Timeline:** Stage 1-2 вечером → Stage 3-4 перед сном → утром paper reviewed

### LLM Mix & Match

ARIS поддерживает произвольные комбинации executor + reviewer:

| Executor (Claude Code) | Reviewer |
|------------------------|----------|
| Claude API (native) | GPT-5.4 через Codex MCP |
| Z.ai (GLM-5) | DeepSeek через llm-chat MCP |
| Kimi (k2) | MiniMax M2.5 через minimax-chat MCP |
| LongCat | Qwen через SiliconFlow |
| Любой Anthropic-compatible | Любой OpenAI-compatible |

### Сильные стороны

- **Кросс-модельная рецензия** — фундаментально лучше self-review (breaks local minima)
- **End-to-end pipeline** — от idea discovery до submission-ready paper
- **State persistence** — переживает context compaction с threadId recovery
- **Human checkpoints** — настраиваемые точки остановки (HUMAN_CHECKPOINT=true/false)
- **Remote experiment deployment** — SSH + screen + GPU management
- **LLM-agnostic** — работает с любой комбинацией моделей (Claude, GLM, Kimi, DeepSeek, MiniMax)
- **Paper quality loop** — отдельный auto-paper-improvement-loop для LaTeX (2 раунда, score 4→8.5)
- **DSE loop** — уникальный skill для hardware design space exploration
- **Feishu integration** — уведомления в корпоративный мессенджер
- **Novelty check** — multi-source литературный поиск + LLM cross-verification
- **Idea generation** — brainstorm через external LLM с landscape analysis

### Слабые стороны

- **Сложность** — 20+ навыков, MCP серверы, множество зависимостей
- **Требует API ключи** — Codex MCP (OpenAI) + Anthropic + возможно ещё
- **Нет simplicity criterion** — нет аналога "simpler = better" из Karpathy
- **Academic-focused** — pipeline заточен под ML papers (NeurIPS/ICML/ICLR)
- **Фиксированный MAX_ROUNDS=4** — нет unbounded mode для review loop
- **Хрупкость** — зависимость от MCP серверов, SSH доступа, remote machines
- **Нет generic iteration loop** — review loop НЕ является generic autoresearch (он про papers, не про любые задачи)
- **Score threshold (>=6)** — "weak accept" как цель, не ambitious

### Уникальные идеи (не встречаются в двух других)

1. **Кросс-модельная рецензия** — Claude пишет, GPT рецензирует (или любая другая комбинация)
2. **ThreadId persistence** — conversation continuity через context compaction
3. **Full research pipeline** — единственный из трёх покрывает idea→paper→submission
4. **Auto-paper-improvement-loop** — review → fix → recompile LaTeX с score tracking
5. **Novelty check skill** — multi-source проверка новизны (arXiv, Scholar, LLM cross-check)
6. **DSE loop** — design space exploration для computer architecture / EDA
7. **LLM mix & match** — executor и reviewer могут быть совершенно разными моделями
8. **Stale state detection** — >24h → fresh start (robust to abandoned runs)
9. **Feishu notifications** — интеграция с корпоративным мессенджером
10. **Human checkpoint mode** — pause-and-present after each review round

---

## Сравнительная таблица

| Параметр | Karpathy | uditgoenka | ARIS |
|----------|----------|------------|------|
| **Фокус** | ML training optimization | Любая задача с метрикой | ML research pipeline |
| **Сложность** | Минимальная (3 файла) | Средняя (1 skill + references) | Высокая (20+ skills + MCP) |
| **Core Loop** | Modify → Run → Keep/Discard | 8 фаз (Review→Ideate→Modify→Commit→Verify→Decide→Log→Repeat) | Review → Implement → Re-review (cross-model) |
| **Метрика** | val_bpb (fixed) | Любая mechanical metric | Score 1-10 от рецензента |
| **Verification** | `grep val_bpb run.log` | Любая shell command | External LLM review |
| **Memory** | Git branch + results.tsv | Git + TSV с delta tracking | Git + REVIEW_STATE.json + AUTO_REVIEW.md |
| **State Recovery** | Нет | Нет | Да (REVIEW_STATE.json + threadId) |
| **Cross-model** | Нет | Нет | Да (Codex MCP / любой LLM API) |
| **Planning** | Нет | /autoresearch:plan wizard | Pipeline с checkpoints |
| **Domain** | ML training only | Любой домен | ML research + papers |
| **Scope** | 1 файл (train.py) | Configurable (file globs) | Full codebase + papers |
| **Time per iteration** | 5 min (fixed) | Variable (depends on verify) | 30-60 min (experiments + review) |
| **Experiments/night** | ~100 | Depends on metric | ~4-8 (review rounds) |
| **Human interaction** | Setup only, then NEVER STOP | Setup + optional /loop N | Configurable checkpoints |
| **Dependencies** | PyTorch, uv | Claude Code | Claude Code + MCP + SSH + LaTeX |
| **Bounded/Unbounded** | Unbounded only | Both (/loop N) | Fixed MAX_ROUNDS=4 |
| **Security audit** | Нет | Да (STRIDE + OWASP) | Нет |
| **Paper writing** | Нет | Нет | Да (full pipeline) |
| **Remote execution** | Нет | Нет | Да (SSH + screen) |
| **Notifications** | Нет | Нет | Feishu (Lark) |

---

## Архитектурные паттерны

### Общие для всех трёх

1. **Git as memory** — коммит перед верификацией, revert при неудаче
2. **Autonomous loop** — агент работает без вмешательства человека
3. **Keep/Discard binary** — нет "partially keep", только полное принятие или откат
4. **Simplicity bias** — все три ценят простоту (в разной степени формализации)
5. **Structured logging** — TSV/MD для tracking history

### Уникальные для каждого

| Паттерн | Кто | Описание |
|---------|-----|----------|
| Fixed time budget | Karpathy | Все эксперименты 5 мин → сравнимость |
| Planning wizard + dry-run | uditgoenka | Validated конфигурация до начала loop |
| Cross-model review | ARIS | Разные модели для execution и review |
| State persistence through compaction | ARIS | REVIEW_STATE.json + threadId |
| Security as autoresearch | uditgoenka | STRIDE/OWASP через iteration pattern |
| Full pipeline orchestration | ARIS | idea→experiments→paper→submission |
| Domain adaptation table | uditgoenka | Ready-made metric/verify templates |
| LLM mix & match | ARIS | Arbitrary executor + reviewer combinations |
| "Never stop" philosophy | Karpathy | Explicit: human may be asleep |

---

## Рекомендации для PAI

### Что стоит заимствовать

**Из Karpathy:**
- "NEVER STOP" философия — agent не спрашивает, продолжать ли
- Fixed time budget как design pattern для сравнимости
- Redirect output to file (не tee) — сохранять context window
- Simplicity criterion с конкретными threshold-ами
- "Human programs markdown, agent programs code" как метафора

**Из uditgoenka:**
- /autoresearch:plan wizard с dry-run validation — превращает задачу в validated config
- 7 формализованных принципов — reusable в любом skill
- Domain adaptation table — templates для разных доменов
- Bounded mode (/loop N) — контролируемые сессии
- When-stuck protocol (>5 consecutive discards) — конкретные recovery steps
- Security audit mode — STRIDE + OWASP через iteration pattern

**Из ARIS:**
- Кросс-модельная рецензия — фундаментально важно для quality
- State persistence через JSON + threadId — survival через context compaction
- Stale detection (>24h → fresh start) — robustness
- Human checkpoint mode (configurable) — баланс автономии и контроля
- LLM mix & match architecture — flexibility
- Novelty check skill — multi-source verification

### Синтез: идеальный autoresearch skill

```
SETUP (from uditgoenka):
  /autoresearch:plan → validated config with dry-run

LOOP (from Karpathy + uditgoenka):
  8-phase protocol с "NEVER STOP" philosophy
  Fixed time budget per iteration (from Karpathy)
  Mechanical metric + simplicity criterion

REVIEW (from ARIS):
  Cross-model review через MCP every N iterations
  State persistence for context compaction survival

LOGGING (from uditgoenka + ARIS):
  TSV с delta tracking + AUTO_REVIEW.md
  results.tsv + REVIEW_STATE.json
```

---

## Активность и зрелость

| Repo | Commits | Contributors | Issues | Last update | Maturity |
|------|---------|-------------|--------|-------------|----------|
| Karpathy | ~15 | 1 | Active | Mar 2026 | Production (for its scope) |
| uditgoenka | ~10 | 1 | New | Mar 2026 | v1.0.3, early but solid |
| ARIS | ~50+ | ~3 | Active | Mar 2026 | Feature-rich, tested on real papers |

---

## Ключевые цитаты

**Karpathy (program.md):**
> "NEVER STOP: Once the experiment loop has begun, do NOT pause to ask the human if you should continue. The human might be asleep."

**Karpathy (README):**
> "One day, frontier AI research used to be done by meat computers in between eating, sleeping, having other fun... That era is long gone."

**uditgoenka (core-principles.md):**
> "Autonomy scales when you constrain scope, clarify success, mechanize verification, and let agents optimize tactics while humans optimize strategy."

**ARIS (README):**
> "Using Claude Code subagents for both execution and review tends to fall into local minima — the same model reviewing its own patterns creates blind spots."
