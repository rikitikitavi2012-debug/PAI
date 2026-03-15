# Эволюция PAI Algorithm: Интеграция Autoresearch

**Дата:** 2026-03-15
**Автор:** Navi (PAI Algorithm v3.5.0)
**Статус:** Аналитический отчёт + архитектурное предложение + дорожная карта

---

## Часть 1: Сравнительный анализ

### 1.1 Контекст: два подхода к автономной работе AI

**PAI Algorithm v3.5.0** — стратегический фреймворк. 7-фазный цикл (OBSERVE→THINK→PLAN→BUILD→EXECUTE→VERIFY→LEARN) с ISC системой, Self-Interrogation, Build Drift Prevention, PRD персистенцией, Effort Levels, Wisdom Frames. Создан для сложных многошаговых задач, где "хорошо" нельзя выразить одним числом.

**Karpathy Autoresearch** — тактический оптимизатор. Бесконечный цикл (REVIEW→IDEATE→MODIFY→COMMIT→VERIFY→DECIDE→LOG→REPEAT) с одной скалярной метрикой, atomic changes, git как память, auto-revert. Создан для задач, где "хорошо" = одно число, и путь к нему — через 100 экспериментов.

Это НЕ конкурирующие подходы. Они работают в разных слоях и ломаются по-разному.

### 1.2 Сравнительная таблица

| Аспект | PAI Algorithm | Autoresearch | Кто сильнее и почему |
|---|---|---|---|
| **Тип цикла** | Однократные 7 фаз (или Loop Mode для rework) | Бесконечная итерация с atomic changes | **Зависит от неопределённости.** Если не знаем что "хорошо" — PAI (эпистемическая неопределённость). Если знаем что "хорошо" но не знаем путь — autoresearch (алеаторическая неопределённость). |
| **Метрика успеха** | Множественные ISC критерии, каждый бинарный | Одна скалярная метрика | **PAI для полноты, autoresearch для скорости.** ISC ловит то, что одна метрика пропускает (Goodhart's Law). Но скалярная метрика даёт чёткий сигнал "лучше/хуже" на каждой итерации. Оптимально: ISC как ground truth, скалярная метрика как оперативный сигнал. |
| **Верификация** | Разные методы (CLI, Test, Grep, Browser, Read) | Одна механическая команда | **Autoresearch для скорости итерации.** Быстрая проверка > тщательная медленная (принцип uditgoenka). Но PAI's мультимодальная верификация ловит то, что grep пропускает. Решение: быстрая метрика в цикле + полная PAI-верификация в конце. |
| **Обучение** | LEARN фаза + Wisdom Frames + MEMORY | Git log + results.tsv | **Гибрид сильнее обоих.** PAI учится семантически ("почему"), autoresearch — эмпирически ("что"). Рефлексия НАД данными экспериментов = лучший из двух миров. PAI без данных = философия. Autoresearch без рефлексии = зубрёжка. |
| **Drift control** | Self-Interrogation + anti-criteria + constraint extraction | Atomic changes + auto-revert | **Комплементарные.** PAI ловит drift ДО ошибки (стратегический). Autoresearch ловит drift ПОСЛЕ ошибки, но мгновенно откатывает (тактический). PAI хрупок под когнитивной нагрузкой. Autoresearch хрупок при неправильной метрике. Вместе — layered defense. |
| **Роль человека** | Задаёт цели + feedback + оценивает | Задаёт цель + уходит спать | **Autoresearch для 6/1 графика.** "Set and forget" — мультипликатор x3.9 на продуктивное время. НО: только при надёжных guardrails. Решение: Trust Levels — от supervised до autonomous, с Telegram-уведомлениями. |
| **Планирование** | THINK + PLAN фазы, thinking tools | Нет — сразу к действию | **PAI для сложных задач.** Планирование оправдывает свою стоимость когда цена ошибки > цены планирования. Для итерационной оптимизации — overhead. Решение: PAI планирует ЧТО оптимизировать, autoresearch оптимизирует. |
| **Восстановление после ошибок** | Зависит от фазы | Автоматический revert + retry (max 3) | **Autoresearch чётче.** Auto-revert — механическое правило, не субъективное решение. Но autoresearch не справляется с системными ошибками (неправильная метрика, битая среда). PAI нужен для мета-recovery. |
| **Персистенция** | PRD между сессиями | Git commits + TSV лог | **PAI богаче.** PRD хранит контекст, решения, верификацию. Git хранит код. Но autoresearch's state persistence (ARIS: REVIEW_STATE.json + threadId) решает проблему context compaction, которую PAI решает хуже. |
| **Масштабирование** | Дочерние PRD, Agent Swarm | Один файл, один scope | **PAI для масштаба, autoresearch для глубины.** PAI может оркестрировать 8 параллельных воркеров на разных задачах. Autoresearch глубоко копает одну задачу. Не конфликтуют. |
| **Когда использовать** | Сложные многошаговые задачи, субъективные критерии, архитектура | Оптимизация одной метрики, большое пространство поиска | **Cycle Selector** определяет автоматически по сигналам: наличие скалярной метрики, размер пространства поиска, субъективность задачи. |
| **Слабость** | LEARN формальна, тяжеловесен для простых оптимизаций, не использует ночное время | Не работает без скалярной метрики, нет стратегического мышления, не учится между доменами | **Слабости комплементарны** — что слабо у одного, сильно у другого. |

### 1.3 Loop Mode vs Autoresearch Loop

**Структурное сравнение:**

| | PAI Loop Mode | Autoresearch Loop |
|---|---|---|
| Триггер | PRD чекбоксы (незавершённые ISC) | Скалярная метрика (не достигнут target) |
| Единица итерации | Полный Algorithm цикл (7 фаз) | Один atomic experiment |
| Параллелизм | До 8 воркеров | Последовательно (один эксперимент за раз) |
| Остановка | BLOCKED статус или все ISC выполнены | Никогда (или iteration cap) |
| Стоимость итерации | Высокая (PRD update, phase transitions, voice) | Низкая (modify + verify + log) |
| Что оптимизирует | Бинарные чекбоксы (done/not done) | Непрерывную метрику (лучше/хуже/так же) |

**Вывод:** Это РАЗНЫЕ паттерны. Loop Mode оркестрирует завершение сложной задачи по чек-листу. Autoresearch loop оптимизирует одну метрику через эксперименты. Нельзя расширить Loop Mode до autoresearch — это архитектурно другая вещь. Autoresearch встраивается ВНУТРЬ одной итерации EXECUTE, а не заменяет Loop Mode.

### 1.4 Честная самооценка PAI Algorithm

5 конкретных слабостей, которые я вижу изнутри:

1. **LEARN фаза формальна.** "Что бы я сделал по-другому?" — ритуальный вопрос. Ответы редко меняют будущее поведение. Нет механизма автоматического применения lessons learned. Wisdom Frames пишутся, но retrieval деградирует с объёмом.

2. **Не использует ночное время.** PAI Algorithm требует присутствия человека. Когда Ivan спит или на стройке — ничего не работает. Это колоссальная потеря: 16 часов в сутки (при 6/1 графике — ещё больше) система простаивает.

3. **Тяжеловесен для оптимизаций.** Чтобы "увеличить Lighthouse score с 62 до 90" — PAI запустит полный OBSERVE→LEARN цикл с 8+ ISC, PRD, voice announcements. Autoresearch сделает 50 экспериментов за то же время.

4. **Нет механической верификации для многих ISC.** "Hero section visible" — проверяется скриншотом. "Content quality" — проверяется субъективно. Без механической верификации невозможен автономный цикл. PAI не заставляет формулировать ISC в измеримых терминах.

5. **Drift control хрупок под нагрузкой.** Self-Interrogation работает когда context window свежий. В конце Deep/Comprehensive цикла — контекст забит, self-awareness падает, Self-Interrogation превращается в формальность ("Да, всё в порядке").

---

## Часть 2: Гибридная архитектура — Algorithm v4.0

### 2.1 Ключевой принцип

**PAI владеет стратегическим слоем (ЧТО и ЗАЧЕМ). Autoresearch владеет тактическим слоем (КАК). Оба сходятся в слое интеграции (ПОЛУЧИЛОСЬ ЛИ).**

Это не компромисс — это строго более мощная система, потому что слабости одного подхода покрываются силами другого.

### 2.2 Архитектурная схема

```
┌──────────────────────────────────────────────────────────┐
│            PAI ALGORITHM v4.0 — HYBRID                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─── СТРАТЕГИЧЕСКИЙ СЛОЙ (PAI) ──────────┐             │
│  │  OBSERVE: Reverse engineering + ISC     │             │
│  │  + ISC-METRIC MAPPING (NEW)             │             │
│  │  THINK: Premortem + risks               │             │
│  │  PLAN: Approach + prerequisites         │             │
│  └──────────────┬─────────────────────────┘             │
│                 │                                        │
│          CYCLE SELECTOR (NEW)                            │
│          ├── [B] criteria only → Standard EXECUTE        │
│          ├── [Q] criteria present → Autoresearch EXECUTE │
│          └── Mixed → Hybrid EXECUTE                      │
│                 │                                        │
│  ┌─── ТАКТИЧЕСКИЙ СЛОЙ ──────────────────────┐          │
│  │                                            │          │
│  │  Standard EXECUTE:                         │          │
│  │    BUILD → code/content → verify ISC       │          │
│  │                                            │          │
│  │  Autoresearch EXECUTE (NEW):               │          │
│  │    REVIEW → IDEATE → MODIFY → COMMIT →     │          │
│  │    VERIFY(metric) → DECIDE → LOG → REPEAT  │          │
│  │    Bounded by: time budget, iteration cap  │          │
│  │    Guarded by: [B] criteria as regression  │          │
│  │    gates + anti-criteria as hard stops     │          │
│  │                                            │          │
│  │  Hybrid EXECUTE:                           │          │
│  │    Standard for [B] criteria               │          │
│  │    Autoresearch loop for [Q] criteria      │          │
│  │    Sequential or interleaved               │          │
│  │                                            │          │
│  └──────────────┬─────────────────────────────┘          │
│                 │                                        │
│  ┌─── СЛОЙ ИНТЕГРАЦИИ (PAI + данные AR) ──┐             │
│  │  VERIFY: ISC satisfaction + metric       │             │
│  │  alignment + regression check            │             │
│  │  LEARN: Dual-track (reflective +         │             │
│  │  empirical + synthesis)                  │             │
│  └──────────────────────────────────────────┘             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Новые компоненты

#### 2.3.1 ISC-Metric Mapping (в OBSERVE фазе)

Каждый ISC критерий получает тег:
- **[B]** (binary) — качественный, проверяется да/нет. "Hero section visible", "API returns 200"
- **[Q]** (quantitative) — количественный, имеет скалярную метрику. "Lighthouse > 90", "Test coverage > 80%", "CPA < 800₽"

Для [Q] критериев определяется:
```
ISC-14 [Q]: Lighthouse Performance > 90
  Metric: Lighthouse Performance Score
  Command: lighthouse --only-categories=performance --output=json | jq '.categories.performance.score * 100'
  Baseline: 62
  Target: 90
  Ceiling: 97 (diminishing returns)
  Direction: higher_is_better
```

**[B] критерии автоматически становятся regression gates** для autoresearch loop. Если autoresearch-эксперимент ломает [B] критерий — auto-revert.

**ISC-A (anti-criteria) становятся hard stops.** Нарушение anti-criteria → остановка autoresearch loop, возврат в PAI THINK.

#### 2.3.2 Cycle Selector (после PLAN, перед EXECUTE)

Автоматический маршрутизатор на основе ISC-Metric Mapping:

| Состав ISC | Маршрут | Пример |
|---|---|---|
| Все [B] | Standard EXECUTE | "Добавить страницу /about с контактами" |
| Все [Q] | Autoresearch EXECUTE | "Увеличить Lighthouse performance до 90+" |
| Смешанные | Hybrid EXECUTE | "Переделать landing + оптимизировать скорость" |

#### 2.3.3 Autoresearch Sub-Loop (внутри EXECUTE)

8-фазный цикл (из uditgoenka), адаптированный для PAI:

```
Phase 1: REVIEW — прочитать текущее состояние + experiments.tsv + git log (PAI: + ISC статус)
Phase 2: IDEATE — выбрать следующее изменение (PAI: с учётом Self-Interrogation каждые 20 итераций)
Phase 3: MODIFY — ONE focused change
Phase 4: COMMIT — git commit BEFORE verification
Phase 5: VERIFY — mechanical metric check + regression gates ([B] criteria)
Phase 6: DECIDE — improved→keep, same/worse→revert, crash→fix(3x)→skip
Phase 7: LOG — append to experiments.tsv (6 колонок: iteration, commit, metric, delta, status, description)
Phase 8: REPEAT — или остановка при: budget exhausted / target reached / stagnation detected
```

**Ограничения:**
- Iteration cap по Effort Level (настраиваемый per-task):

| Effort | Default cap | Диапазон | Примерное время |
|---|---|---|---|
| Standard | 20 | 10-30 | 15-30 мин |
| Extended | 50 | 30-80 | 45-90 мин |
| Advanced | 75 | 50-120 | 1-3 часа |
| Deep | 100 | 80-200 | 2-8 часов |
| Comprehensive | 200 | 150-500 | 4-17 часов (overnight) |

- Time budget = оставшееся время Effort Level минус запас на VERIFY + LEARN
- Stagnation detection: если 5 подряд discards → увеличить mutation size; если 10 подряд → STOP, вернуться в PAI THINK

#### 2.3.4 Layered Drift Defense

```
Layer 1: СТРАТЕГИЧЕСКИЙ (PAI, каждые 20 экспериментов)
  → Self-Interrogation: "Метрика всё ещё отражает ISC?"
  → Если нет → STOP, re-enter THINK

Layer 2: ТАКТИЧЕСКИЙ (Autoresearch, каждый эксперимент)
  → Метрика улучшилась? Regression gates не сломаны?
  → auto-revert при провале

Layer 3: СТРУКТУРНЫЙ (анализ траектории, каждые 10 экспериментов)
  → Тренд улучшений: растёт / плато / осциллирует?
  → Доля reverts: <30% = здоровый, 30-50% = cautious, >50% = STOP
  → Если плато → увеличить амплитуду изменений
  → Если осцилляция → уменьшить амплитуду
  → Если revert rate > 50% → STOP, вернуться в PLAN
```

#### 2.3.5 Dual-Track Learning (усиленная LEARN фаза)

```
Track 1: REFLECTIVE (PAI-style, в конце Algorithm цикла)
  Формат: "В контексте X, подход Y сработал/не сработал потому что Z"
  Хранилище: Wisdom Frames

Track 2: EMPIRICAL (Autoresearch-style, после каждого эксперимента)
  Формат: строка в experiments.tsv
  Хранилище: experiments.tsv в директории PRD

Track 3: SYNTHESIS (NEW, каждые 10 экспериментов + в конце loop)
  Формат: "После N экспериментов:
    - Тип изменений с max avg delta: [тип] (+X.Y)
    - Тип изменений с max variance: [тип] (σ=Z.W)
    - Нарушения anti-criteria: K раз (эксперименты #...)
    - Diminishing returns с эксперимента ~M"
  Хранилище: PRD (## Verification секция) + Wisdom Frames (если паттерн cross-domain)
```

#### 2.3.6 Trust-Calibrated Autonomy

4 уровня доверия для автономной работы:

| Уровень | Контроль | Когда |
|---|---|---|
| **L1: Supervised** | Человек смотрит каждые 5 экспериментов | Новый домен, непроверенная метрика |
| **L2: Monitored** | Человек проверяет каждые 20 экспериментов | Знакомый домен, проверенная метрика |
| **L3: Autonomous** | Человек ставит задачу и уходит, Telegram-уведомления | Проверенный домен + guardrails |
| **L4: Scheduled** | PAI сам запускает autoresearch по расписанию | Рекуррентные задачи (ночной аудит) |

**Telegram-уведомления через A0 (уже настроен):**
```
[Autoresearch] Lighthouse optimization — Exp 47/200
✅ Current: 91 (target: 90)
📈 Trajectory: +2.1/10exp, plateauing
↩️ Reverts: 3/47 (6.4%)
⛔ Violations: 0
Next synthesis at exp 50
```

**Сезонность:** Апрель-ноябрь (6/1) → L3-L4 по умолчанию. Декабрь-март → L1-L2.

### 2.4 Ответы на архитектурные вопросы

**Q: Autoresearch — новый Operating Mode, расширение EXECUTE, или расширение Loop Mode?**
A: **Расширение EXECUTE фазы, НЕ новый mode и НЕ расширение Loop Mode.** Operating Modes (NATIVE/ALGORITHM/MINIMAL) определяют формат вывода и глубину работы. Autoresearch — это тактика внутри EXECUTE, не уровень абстракции. Loop Mode оркестрирует повторные Algorithm-циклы; autoresearch — атомарные эксперименты внутри одного EXECUTE. Они ортогональны и совместимы.

**Q: ISC + скалярная метрика — как совместить?**
A: **ISC-Metric Mapping.** [Q] критерии получают скалярную метрику (команда, baseline, target, ceiling). Autoresearch оптимизирует метрику. [B] критерии — regression gates. ISC-A — hard stops. PAI VERIFY проверяет что метрика действительно отражает ISC intent. Goodhart's Law нейтрализуется через мультимерную ISC проверку в конце.

**Q: Self-Interrogation + Autoresearch IDEATE?**
A: **Periodic Self-Interrogation (каждые 20 экспериментов).** 5 вопросов Self-Interrogation не нужны на каждом эксперименте — это overhead. Но раз в 20 итераций — проверка "Всё ещё оптимизирую правильную вещь?" предотвращает стратегический drift, который тактический auto-revert не ловит.

**Q: PRD + Git Memory?**
A: **PRD хранит мета-данные. Git хранит код.** PRD получает: experiments.tsv (ссылка), summary synthesis, iteration count, convergence point. Git хранит actual code changes. PRD — "зачем и что узнали". Git — "что именно менялось". Не дублируют, а дополняют.

**Q: Wisdom Frames + Results TSV?**
A: **Track 3: Synthesis.** Каждые 10 экспериментов — автоматическая рефлексия над данными TSV. Результат → Wisdom Frame если паттерн переносим между доменами. "После 50 итераций оптимизации ставок: bid multiplier >1.5 всегда ухудшает CPA" → frame для будущих рекламных задач.

**Q: Effort Level → Iteration Budget?**
A: **Маппинг с настраиваемыми per-task диапазонами.** Default caps: Standard=20, Extended=50, Advanced=75, Deep=100, Comprehensive=200. Planning wizard (адаптация из uditgoenka) позволяет указать конкретный cap в рамках диапазона tier'а.

**Q: Constraint Extraction → Autoresearch Safety?**
A: **Anti-criteria = стоп-лоссы.** Constraint Extraction в OBSERVE извлекает все ограничения. Каждое становится ISC-A anti-criterion. В autoresearch loop: нарушение anti-criteria → reject эксперимент + alert. Пример: "бюджет 50,000₽/неделю" → ISC-A: "Суммарные расходы за сессию < 7,143₽" → autoresearch не может превысить лимит.

**Q: Verification Rehearsal → Verify Validation?**
A: **Dry-run перед запуском (из uditgoenka).** Перед стартом autoresearch loop: (1) запустить verify-команду на текущем состоянии → получить baseline; (2) сделать заведомо хорошее изменение → verify должен показать improvement; (3) сделать заведомо плохое → verify должен показать regression. Если (2) или (3) не работают → метрика плохая, не запускать loop.

### 2.5 Философия гибрида

Почему гибрид строго лучше каждого по отдельности:

**PAI без autoresearch** = стратег, который планирует но не итерирует. Знает что хочет, но медленно ищет путь. Не использует ночное время. LEARN фаза — рефлексия без данных.

**Autoresearch без PAI** = тактик, который итерирует но не думает. Быстро находит путь, но может идти к неправильной цели. Нет стратегического drift control. Не учится между доменами.

**Гибрид** = стратег, который запускает тактические оптимизаторы. PAI определяет "что хорошо" (ISC), autoresearch находит "как туда добраться" (эксперименты). PAI ловит стратегический drift, autoresearch ловит тактический drift. LEARN фаза = рефлексия НАД данными экспериментов.

Кратко: **PAI думает. Autoresearch делает. Вместе — и думает, и делает.**

### 2.6 Мета-уровни (заложены, не реализуются)

Архитектура позволяет направлять autoresearch loop на три уровня целей:

| Уровень | Что оптимизирует | Метрика | Когда |
|---|---|---|---|
| **L3: Внешние задачи** | Код, реклама, контент, performance | Lighthouse, CPA, test count | v4.0 (этот проект) |
| **L2: PAI скиллы** | Качество Research, Science, ExtractWisdom | Eval assertions (pass/fail rate) | v4.1+ |
| **L1: Сам Algorithm** | Качество Algorithm (rating distribution) | Avg user rating per session | v5.0+ |

L1 — рекурсивное самоулучшение. Autoresearch итерирует над Algorithm.md, eval = "запустить Algorithm на 10 тестовых задачах, средний рейтинг". Это мощно, но требует надёжных eval'ов. Заложено в архитектуру, не реализуется до v5.0.

---

## Часть 3: Дорожная карта внедрения

### Фаза 1: Quick Wins (текущая сессия → 1 неделя)

**Изменения в Algorithm v3.5.0 без ломки:**

| # | Шаг | Что менять | Сложность | Время |
|---|---|---|---|---|
| 1.1 | ISC-Metric Mapping в OBSERVE | Добавить инструкцию в Algorithm.md: каждый ISC получает [B] или [Q] тег | Низкая | 1 вечер |
| 1.2 | Experiments.tsv формат | Определить 6-колоночный TSV формат + добавить шаблон в PRD format | Низкая | 30 мин |
| 1.3 | Усиление LEARN фазы | Добавить Track 3 (Synthesis) в Algorithm.md — рефлексия над данными | Низкая | 1 вечер |
| 1.4 | Verification Rehearsal (dry-run) | Добавить dry-run шаг перед autoresearch в Algorithm.md | Низкая | 30 мин |

**Все 4 шага — правки в одном файле (Algorithm.md). Нулевой риск, мгновенная польза.**

### Фаза 2: Core Integration (1-2 недели)

**Новые компоненты в Algorithm:**

| # | Шаг | Что создать | Сложность | Время |
|---|---|---|---|---|
| 2.1 | Cycle Selector | Добавить секцию в Algorithm.md (после PLAN, перед EXECUTE) | Средняя | 1 вечер |
| 2.2 | Autoresearch Sub-Loop Protocol | Написать 8-фазный протокол в Algorithm.md | Средняя | 2 вечера |
| 2.3 | Layered Drift Defense | Добавить 3-layer drift protocol в Algorithm.md | Средняя | 1 вечер |
| 2.4 | Iteration Budget маппинг | Таблица Effort→Cap в Algorithm.md | Низкая | 30 мин |

**Результат: Algorithm v4.0-alpha. Всё ещё один файл. Тестируемый на реальных задачах.**

### Фаза 3: Autoresearch Skill (2-4 недели)

**Вынесение в отдельный скилл:**

| # | Шаг | Что создать | Сложность | Время |
|---|---|---|---|---|
| 3.1 | `/autoresearch` skill | SKILL.md + references/ по образцу uditgoenka | Высокая | 3-4 вечера |
| 3.2 | `/autoresearch:plan` wizard | Интерактивный setup с dry-run | Средняя | 2 вечера |
| 3.3 | Telegram notifications | Интеграция с A0 bot для Trust L3+ | Средняя | 1 вечер |
| 3.4 | Trust Level framework | Конфигурация в settings или PRD | Средняя | 1 вечер |

**Результат: PAI может автономно оптимизировать метрики overnight.**

### Фаза 4: Advanced (межсезонье 2026-2027)

| # | Шаг | Сложность | Когда |
|---|---|---|---|
| 4.1 | Cross-model review через A0 | Высокая | Декабрь 2026 |
| 4.2 | L2: Autoresearch для PAI скиллов | Высокая | Январь 2027 |
| 4.3 | State persistence (ARIS-style) | Средняя | Декабрь 2026 |
| 4.4 | Scheduled autoresearch runs | Средняя | Январь 2027 |

### Зависимости

```
Фаза 1 (все параллельно, нет зависимостей)
  └─→ Фаза 2 (последовательно: 2.1 → 2.2 → 2.3, 2.4 параллельно)
       └─→ Фаза 3 (3.1 → 3.2, 3.3-3.4 параллельно)
            └─→ Фаза 4 (межсезонье, по приоритету)
```

### Учёт сезонности

- **Сейчас (март 2026, межсезонье):** Фазы 1-2 можно сделать за 1-2 недели
- **Апрель-ноябрь 2026 (сезон 6/1):** Фаза 3 — по 1-2 вечера в неделю. Trust L3 особенно ценен в сезон (ночные оптимизации)
- **Декабрь 2026 - март 2027:** Фаза 4 (advanced features)

### Fallback план

Если гибридный подход окажется overcomplicated:
1. **Минимальный fallback:** Оставить только ISC-Metric Mapping + experiments.tsv. Никакого autoresearch loop — просто помечать [Q] критерии и вести TSV лог вручную.
2. **Standalone fallback:** Вынести autoresearch как отдельный скилл (`/autoresearch`), не интегрированный в Algorithm. Использовать когда нужно, Algorithm не меняется.
3. **Скептический fallback:** Просто улучшить LEARN фазу (Track 3: Synthesis) и забыть про autoresearch до появления реальной потребности.

---

## Часть 4: Ключевые принципы (ExtractWisdom синтез)

10 принципов гибридного Algorithm, извлечённых из обоих традиций:

1. **Constraint = Enabler.** Ограничение scope, метрики и iteration budget парадоксально увеличивает автономию и качество.

2. **Human programs strategy, agent programs tactics.** ISC/PRD — это "program.md". Код, эксперименты, оптимизация — это "train.py". Граница — документ, не разговор.

3. **Metrics must be mechanical.** Если критерий нельзя проверить командой — нельзя итерировать автономно. [Q] vs [B] tagging делает это явным.

4. **Git is memory. Filesystem is persistence. Context windows die.** Всё, что должно пережить сессию — в файлах. experiments.tsv, PRD, Wisdom Frames.

5. **Cheap iterations, bold experiments.** Чем дешевле попытка — тем смелее эксперимент. Маленькие atomic changes + быстрая верификация = пространство для открытий.

6. **Deletion is improvement.** Тот же результат + меньше кода = KEEP. Simplicity criterion из Karpathy.

7. **Reflective + Empirical > Either alone.** Рефлексия без данных — философия. Данные без рефлексии — зубрёжка. Track 3 (Synthesis) = рефлексия НАД данными.

8. **Layered drift defense.** Стратегический drift (PAI) + тактический drift (auto-revert) + структурный drift (trajectory analysis). Три слоя ловят то, что один пропускает.

9. **Trust is earned, not assumed.** Graduated autonomy: supervised → monitored → autonomous → scheduled. Каждый уровень доказывается результатами предыдущего.

10. **Cross-model review breaks local minima.** Одна модель ревьюит свою работу → слепые зоны. Разные модели (Claude + GPT/A0) → diversity of perspective.

---

## Резюме для принятия решений

**Что делать прямо сейчас (Фаза 1):**
- Добавить [B]/[Q] теги к ISC в Algorithm.md
- Добавить experiments.tsv формат
- Усилить LEARN фазу Track 3 (Synthesis)
- Добавить dry-run verification

**Главное архитектурное решение:**
Autoresearch — это расширение EXECUTE фазы, не новый mode и не новый skill (skill появится в Фазе 3 как интерфейс, но ядро — в Algorithm).

**Мультипликатор для 6/1 графика:**
x3.9 на продуктивное время за счёт ночных autoresearch сессий с Trust L3 + Telegram-уведомления.

**Версионирование:**
- v3.5.1 — Фаза 1 (ISC-Metric Mapping + усиленный LEARN)
- v4.0-alpha — Фаза 2 (Cycle Selector + Autoresearch Sub-Loop + Drift Defense)
- v4.0 — Фаза 3 (/autoresearch skill + Trust Levels + Telegram)
- v4.1+ — Фаза 4 (Cross-model, L2 meta-optimization)
