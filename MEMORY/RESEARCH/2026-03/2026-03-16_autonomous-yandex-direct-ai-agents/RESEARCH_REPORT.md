# Автономная оптимизация Яндекс Директа через AI-агентов

**Дата:** 2026-03-16
**Режим:** Standard Research (2 исследователя + WebFetch + WebSearch)
**Тема:** Автономная оптимизация контекстной рекламы Яндекс Директ с использованием AI-агентов, autoresearch-подхода и MCP-серверов

---

## 1. Karpathy Autoresearch + Uditgoenka Skill

### 1.1 Karpathy Autoresearch (оригинал)

**Репозиторий:** [github.com/karpathy/autoresearch](https://github.com/karpathy/autoresearch)
**Дата релиза:** 6 марта 2026 | **Звезды:** 30,307 за первую неделю

**Архитектура** (630 строк Python):
- **prepare.py** -- неизменяемый, фиксированные константы, данные, токенизатор
- **train.py** -- единственный файл, который модифицирует агент (архитектура, гиперпараметры, оптимизатор, batch size)
- **program.md** -- инструкции человека для агента (lightweight skill)

**Цикл работы:**
1. Агент читает train.py и формулирует гипотезу
2. Модифицирует код
3. Запускает 5-минутное обучение на GPU
4. Измеряет val_bpb (validation bits per byte)
5. Если улучшение -- сохраняет; если ухудшение -- откатывает
6. Повторяет (~12 экспериментов/час, ~100 за ночь)

**Результаты:** 700 автономных изменений за 2 дня, ~20 аддитивных улучшений, снижение "Time to GPT-2" с 2.02 до 1.80 часов (11% efficiency gain).

**Ограничения:**
- Только NVIDIA GPU (H100 рекомендуется)
- Только ML/training -- жестко привязан к train.py
- Нет кросс-модельной верификации

### 1.2 Uditgoenka Autoresearch (обобщение на любой домен)

**Репозиторий:** [github.com/uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch)

**Ключевое отличие:** обобщает принцип autoresearch на ЛЮБУЮ область с измеримой метрикой -- не только ML, но и маркетинг, DevOps, безопасность, контент.

**Универсальный цикл:**
1. Baseline -- текущее значение метрики
2. Verify command -- shell-команда, возвращающая число
3. Direction -- "выше лучше" или "ниже лучше"
4. Изменение -> commit -> verify -> keep/revert

**Guard-система (v1.0.4):** опциональная команда, которая ВСЕГДА должна пройти. Если оптимизация улучшает метрику, но ломает Guard (тесты), Claude переделывает (до 2 попыток).

**Домены и примеры:**
- Тесты: покрытие, скорость
- Перфоманс: bundle size, Lighthouse
- Безопасность: STRIDE + OWASP Top 10 (автономный red team)
- Контент: SEO-оценки
- ML: validation loss
- DevOps: размер Docker-образа

**Маркетинговое применение (Eric Siu, Single Grain):**
Заменил train.py на маркетинговый ассет (лендинг, ad creative, cold email). Агент меняет переменную (subject line, CTA), деплоит, измеряет "positive reply rate", keeps/discards. Обычная команда: ~30 экспериментов/год. С autoresearch: 36,500+/год.

---

## 2. Direct-MCP -- MCP-сервер для Яндекс Директа

**Сайт:** [direct-mcp.aatex.ru](https://direct-mcp.aatex.ru/)
**Документация:** [direct-mcp.aatex.ru/docs](https://direct-mcp.aatex.ru/docs)

### Возможности

| Платформа | Инструментов | Функции |
|-----------|-------------|---------|
| Яндекс Директ | 119 | Кампании, объявления, ставки, ключи, статистика, ретаргетинг, справочники |
| VK Ads | 76 | Кампании, группы, объявления, статистика, аудитории |
| LidFly | 13 + 22 блока | Лендинги, отчеты |
| Яндекс Вордстат | 5 | Анализ частотности |
| CRM | - | Задачи, напоминания |

**Всего: 209+ инструментов.**

### Ценообразование

| Тариф | Стоимость | Включает |
|-------|-----------|----------|
| Рекламодатель | 990 руб/мес | 119 Direct + 76 VK, безлимит запросов, 7 дней бесплатно |
| Агентство | 4,990 руб/мес | Все + безлимит клиентских кабинетов |

### Совместимые клиенты
Claude Desktop, Claude Code, ChatGPT, Cursor, Windsurf, Cline, Cherry Studio, Gemini.

### Реальный кейс (vc.ru)
Управление 300+ кампаниями: сокращение работы с 4-6 часов/день до 30-40 минут. Стоимость: $20/мес (ChatGPT Plus) + 990 руб/мес (direct-mcp). Функции: полный аудит, создание кампаний с нуля за 4.5 минуты, массовая чистка запросов, управление автотаргетингом.

### Альтернативные MCP-серверы

| Проект | Назначение |
|--------|-----------|
| [yandex-mcp (pip)](https://github.com/svechapvl/yandex-mcp) | Open-source, Direct + Metrika, OAuth |
| [yandex-search-mcp-server](https://github.com/yandex/yandex-search-mcp-server) | Официальный от Яндекса, только поиск |
| [yandex-tracker-mcp](https://github.com/aikts/yandex-tracker-mcp) | Яндекс Трекер |
| [yandex-metrika-mcp](https://osipenkov.ru/yandex-metrika-mcp/) | Node.js, только Метрика |

**Вывод:** direct-mcp -- единственный полнофункциональный коммерческий MCP для Директа. Open-source альтернатива yandex-mcp существует, но менее проверена.

---

## 3. Яндекс Директ API + Метрика API

### 3.1 Yandex Direct API v5 -- Ключевые сервисы

| Сервис | Методы | Для чего |
|--------|--------|----------|
| **Campaigns** | Get, Add, Update, Delete, Archive, Suspend, Resume | Управление кампаниями |
| **AdGroups** | Get, Add, Update, Delete | Группы объявлений |
| **Ads** | Get, Add, Update, Delete, Moderate, Suspend, Resume | Объявления |
| **Keywords** | Get, Add, Update, Delete, Suspend, Resume | Ключевые фразы + автотаргетинг |
| **Bids / KeywordBids** | Get, Set, SetAuto | Управление ставками |
| **BidModifiers** | Get, Add, Set, Delete, Toggle | Корректировки ставок |
| **NegativeKeywordSharedSets** | Get, Add, Update, Delete | Наборы минус-фраз |
| **Reports** | GetReport | Статистика, метрики, конверсии |
| **Changes** | CheckCampaigns, CheckDictionaries, Check | Отслеживание изменений |
| **AdExtensions** | Get, Add, Delete | Расширения объявлений |
| **AudienceTargets** | Get, Add, SetBids, Delete, Suspend, Resume | Аудиторный таргетинг |

### 3.2 CPA/Конверсии через API -- ОТВЕТ: ДА

**Через Reports API Директа** доступны метрики:
- `Conversions` -- количество конверсий
- `CostPerConversion` -- стоимость конверсии (CPA)
- `ConversionRate` -- процент конверсии
- `GoalsRoi` -- ROI по целям

**Через Metrika API** (дополнительно):
- `ym:s:goal<goal_id>visits` -- визиты с достижением цели
- `ym:s:goal<goal_id>conversionRate` -- коэффициент конверсии
- `ym:s:goal<goal_id>IsReached` -- достижение цели
- Management API: создание/редактирование целей программно
- Offline conversions: импорт из CRM

### 3.3 Стратегии управления ставками через API

Доступные автоматические стратегии:
- **Maximum conversions** (WB_MAXIMUM_CONVERSION_RATE) -- максимум конверсий с ограничением CPA
- **Maximum clicks** (WB_MAXIMUM_CLICKS) -- максимум кликов с ограничением CPC
- **Maximum conversion value** -- максимизация ценности конверсий
- Ручное управление ставками (HIGHEST_POSITION, LOWEST_COST и др.)

**Ключевой вывод:** Полный цикл "получить статистику -> проанализировать CPA -> изменить ставки/минус-слова -> A/B тест объявлений" реализуем ПОЛНОСТЬЮ через API без ручного интерфейса.

### 3.4 A/B тесты через API

Яндекс Директ поддерживает "Эксперименты с кампаниями" -- сплит-тест трафика между кампаниями. Однако создание экспериментов через API v5 ограничено: основная настройка через интерфейс, API позволяет читать результаты.

**Workaround для A/B объявлений:** создать несколько объявлений в одной группе через Ads.Add -- Директ автоматически ротирует и выбирает лучшее.

---

## 4. ARIS (Auto-Research-In-Sleep)

**Репозиторий:** [github.com/wanshuiyin/Auto-claude-code-research-in-sleep](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)

### Ключевое отличие от базового autoresearch

**Двухмодельная adversarial архитектура:**
- **Исполнитель:** Claude Code (быстрое выполнение)
- **Рецензент:** GPT-5.4 xhigh через Codex MCP (строгая критика)

> "Single-model self-review создает слепые зоны. Adversarial collaboration преодолевает единый набор предубеждений."

### 18+ составных навыков

| Навык | Назначение | Codex MCP? |
|-------|-----------|-----------|
| idea-creator | Генерация 8-12 идей | Да |
| research-review | Глубокий кросс-модельный анализ | Да |
| auto-review-loop | Многораундовый цикл (до 4 раундов) | Да |
| research-lit | Поиск литературы (Zotero + arXiv) | Нет |
| novelty-check | Проверка оригинальности | Да |
| run-experiment | Развертывание на GPU | Нет |
| paper-plan/write/compile | Генерация LaTeX статей | Да |
| idea-discovery | Полный пайплайн Workflow 1 | Да |

### Три рабочих процесса

1. **Idea Discovery** (45-60 мин): литература -> идеи -> новизна -> оценка -> пилотные эксперименты
2. **Auto Review Loop** (1-4+ часа): рецензирование (GPT, оценка 0-10) -> исправление -> GPU -> мониторинг -> повтор до score >= 6
3. **Paper Writing** (2-3 часа): план -> фигуры -> LaTeX -> компиляция -> 2 раунда улучшений

### Поддерживаемые комбинации моделей

| Исполнитель | Рецензент | OpenAI API? |
|------------|----------|-------------|
| Claude Opus/Sonnet | GPT-5.4 xhigh | Да |
| GLM-5 (ZhiPu) | GPT-5.4 xhigh | Да |
| GLM-5 (ZhiPu) | MiniMax-M2.5 | Нет |
| Любой | DeepSeek/Kimi/LongCat | Нет |

### Дополнения к базовому autoresearch

1. Кросс-модельная adversarial верификация (не self-review)
2. State persistence (REVIEW_STATE.json) для восстановления после context overflow
3. Human checkpoints между workflow
4. Честность по умолчанию (запрет скрывать слабости)
5. Реальные BibTeX из DBLP/CrossRef (не галлюцинации)
6. Проверка лимитов страниц через pdftotext
7. Интеграции: Zotero, Obsidian, Feishu, arXiv API

---

## 5. Синтез: Архитектура автономной оптимизации Яндекс Директа

### Рекомендуемая архитектура

```
                    +-----------------------+
                    |   Autoresearch Loop    |
                    |  (uditgoenka skill)   |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |   Claude Code Agent    |
                    |  (исполнитель)        |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |     Direct-MCP        |
                    |  (119 инструментов)   |
                    +-----------+-----------+
                                |
              +-----------------+-----------------+
              |                                   |
   +----------v----------+           +-----------v-----------+
   |  Yandex Direct API  |           |  Yandex Metrika API   |
   |  (кампании, ставки, |           |  (конверсии, CPA,     |
   |   минус-слова, ads)  |           |   goals, ROI)         |
   +-----------------------+           +-----------------------+
```

### Конкретный сценарий: Autoresearch для CPA-оптимизации

```
Метрика: CPA (стоимость конверсии) -- ниже лучше
Verify: python scripts/get_cpa.py --campaign-id 12345 --days 7
Guard: python scripts/check_budget_limits.py (бюджет не превышен)

Цикл:
1. Агент анализирует поисковые запросы через Reports API
2. Формулирует гипотезу (добавить минус-слова / изменить ставки / ...)
3. Вносит изменение через Direct-MCP
4. Ждет накопления статистики (24-72 часа)
5. Измеряет CPA через Metrika API
6. Keep/revert
```

### Риски

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Автономные изменения ставок могут "слить" бюджет | ВЫСОКИЙ | Guard-проверка бюджетных лимитов, daily spend caps |
| Накопление статистики занимает 24-72 часа (не 5 минут как в ML) | ВЫСОКИЙ | Длинные циклы эксперимента, batch-оптимизация |
| API rate limits Яндекса | СРЕДНИЙ | Throttling, кеширование, ночные batch-операции |
| Сезонность и внешние факторы искажают метрики | СРЕДНИЙ | A/B сплит вместо before/after, контрольные группы |
| direct-mcp -- сторонний платный сервис, vendor lock-in | СРЕДНИЙ | Open-source yandex-mcp как fallback |
| Эксперименты Директа ограничены в API | НИЗКИЙ | Workaround через множественные объявления в группе |

### Рекомендации

1. **Начать с direct-mcp** (990 руб/мес, 7 дней бесплатно) -- быстрый старт без разработки
2. **Адаптировать uditgoenka/autoresearch** под рекламные метрики (CPA, ROAS, CTR) -- уже поддерживает произвольные домены
3. **Критически:** увеличить длину цикла эксперимента с 5 минут (ML) до 24-72 часов (реклама) -- статистическая значимость
4. **Guard обязателен:** лимиты бюджета, минимальный CTR, запрет на удаление работающих кампаний
5. **Кросс-модельный review (ARIS-подход)** для верификации решений агента -- Claude предлагает, GPT рецензирует перед применением
6. **Human checkpoint** перед крупными изменениями (> 20% бюджета, новые кампании, массовые операции)
7. **CPA/конверсии полностью доступны через API** -- нет необходимости в ручном интерфейсе

---

## Источники (все URL верифицированы, HTTP 200)

- [Karpathy autoresearch (GitHub)](https://github.com/karpathy/autoresearch)
- [Uditgoenka autoresearch skill (GitHub)](https://github.com/uditgoenka/autoresearch)
- [ARIS - Auto-Research-In-Sleep (GitHub)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)
- [Direct-MCP -- MCP-сервер для Яндекс Директа](https://direct-mcp.aatex.ru/)
- [Direct-MCP документация](https://direct-mcp.aatex.ru/docs)
- [Яндекс Директ API](https://yandex.ru/dev/direct)
- [Яндекс Метрика API](https://yandex.com/dev/metrika)
- [Кейс: управление 300+ кампаниями с ИИ (vc.ru)](https://vc.ru/marketing/2751697-effektivnoe-upravlenie-300-kampaniyami-v-yandeks-direkt-s-pomoshchyu-ii)
- [ARIS на DeepWiki](https://deepwiki.com/wanshuiyin/Auto-claude-code-research-in-sleep)
- [VentureBeat: Karpathy autoresearch](https://venturebeat.com/technology/andrej-karpathys-new-open-source-autoresearch-lets-you-run-hundreds-of-ai)
