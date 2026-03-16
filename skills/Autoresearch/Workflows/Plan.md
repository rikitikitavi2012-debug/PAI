# Autoresearch Plan Workflow

Интерактивный визард для настройки автоматической оптимизации метрики. Создаёт PRD с `[Q]` критерием и `experiments.tsv` — но НЕ запускает оптимизацию.

**Результат:** готовый PRD + experiments.tsv. Для запуска — `/autoresearch run`.

---

## Шаг 1: Выбор метрики

Спросить у пользователя, какую метрику оптимизировать.

**AskUserQuestion:**
```
Какую метрику вы хотите оптимизировать?

Примеры:
- Lighthouse Performance Score
- Bundle size (KB)
- CPA (стоимость привлечения)
- Time to Interactive (секунды)
- Количество ошибок в логах
- Своя метрика: опишите

Введите название метрики:
```

Сохранить ответ как `METRIC_NAME`.

---

## Шаг 2: Команда верификации

Спросить, какая shell-команда возвращает числовое значение метрики.

**AskUserQuestion:**
```
Какая команда измеряет эту метрику?

Команда должна выводить одно число в stdout (или число, извлекаемое grep/jq/awk).

Примеры:
- `npx lighthouse https://site.com --output=json | jq '.categories.performance.score * 100'`
- `du -sb dist/ | awk '{print $1/1024}'`
- `bun run test 2>&1 | grep -oP 'Tests: \K\d+'`
- `curl -s https://api.metrika.yandex.net/... | jq '.data[0].metrics[0]'`

Введите команду верификации:
```

Сохранить ответ как `VERIFY_CMD`.

---

## Шаг 3: Цель и направление

Спросить целевое значение и направление оптимизации.

**AskUserQuestion:**
```
Какое целевое значение метрики «METRIC_NAME»?

Укажите:
1. Целевое значение (число)
2. Направление: выше лучше (higher_is_better) или ниже лучше (lower_is_better)

Формат ответа: `ЧИСЛО НАПРАВЛЕНИЕ`
Примеры:
- `90 higher_is_better` (Lighthouse score > 90)
- `150 lower_is_better` (bundle < 150 KB)
- `500 lower_is_better` (CPA < 500 руб)
```

Сохранить как `TARGET_VALUE` и `DIRECTION`.

---

## Шаг 4: Поиск прошлого опыта

Выполнить LearningRecall для поиска релевантного опыта из прошлых сессий.

```bash
bun ~/.claude/PAI/Tools/LearningRecall.ts "METRIC_NAME optimization"
```

Если результаты найдены (score >= 3):
- Показать пользователю: какие подходы работали, какие нет
- Учесть при выборе начальных экспериментов

Если результаты пусты:
- Сообщить: «Прошлый опыт по этой метрике не найден. Начинаем с чистого листа.»

---

## Шаг 5: Dry-run — измерение baseline

Выполнить команду верификации для получения базового значения.

```bash
timeout 60 VERIFY_CMD
```

**Обработка результатов:**
- Команда вернула число — сохранить как `BASELINE_VALUE`
- Команда завершилась с ошибкой — показать вывод, попросить исправить команду (вернуться к Шагу 2)
- Timeout (exit code 124) — предупредить пользователя, предложить оптимизировать команду

Показать пользователю:
```
Baseline: METRIC_NAME = BASELINE_VALUE
Цель: TARGET_VALUE (DIRECTION)
Разрыв: |TARGET_VALUE - BASELINE_VALUE| (X% от baseline)
```

### 5b. Проверка оптимизируемости метрики

После получения baseline — выполнить диагностику:

**Тест 1: Causal link.** Спросить себя: «Если я изменю код проекта, изменится ли эта метрика?»
Красные флаги — предупредить пользователя:
- Метрика зависит от внешнего состояния (API, CDN, чужой сервер) → `⚠️ Метрика зависит от внешнего состояния — autoresearch может быть нестабилен.`
- Метрика агрегирует результаты с test pollution (pass individual, fail batch) → `⚠️ Метрика может содержать test pollution — рекомендуется проверить: запустите команду на подмножестве.`
- Разрыв > 100% от baseline → `⚠️ Разрыв очень большой ({X}%). Возможно, нужно пересмотреть target или разбить на промежуточные цели.`

**Тест 2: Повторный запуск.** Выполнить verify command ещё раз:
```bash
timeout 60 VERIFY_CMD
```
Если результат отличается от baseline > 5% — предупредить:
> ⚠️ Метрика нестабильна: {run1} vs {run2}. Autoresearch может тратить итерации на шум. Рекомендация: стабилизировать измерение или увеличить noise tolerance.

Если оба теста прошли — продолжить.
Если есть предупреждения — показать через AskUserQuestion:
> Обнаружены потенциальные проблемы с метрикой. Продолжить настройку? (да/нет/изменить метрику)

---

## Шаг 6: Лимит итераций

Спросить у пользователя бюджет итераций, предложив значение по умолчанию на основе effort tier.

**AskUserQuestion:**
```
Сколько итераций выделить на оптимизацию?

Рекомендации по effort tier:
| Tier          | Default | Диапазон |
|---------------|---------|----------|
| Extended      | 50      | 30-80    |
| Advanced      | 75      | 50-120   |
| Deep          | 100     | 80-200   |
| Comprehensive | 200     | 150-500  |

Для большинства задач рекомендуется Extended (50 итераций).

Введите количество итераций (или Enter для 50):
```

Сохранить как `ITERATION_CAP`. Если не указано — по умолчанию 50.

---

## Шаг 7: Уровень доверия

Спросить у пользователя уровень автономности.

**AskUserQuestion:**
```
Какой уровень доверия для оптимизации?

| Уровень | Режим        | Описание                                              |
|---------|--------------|-------------------------------------------------------|
| L1      | supervised   | Подтверждение каждые 5 итераций                        |
| L2      | monitored    | Автономно до 20 итераций, отчёт каждые 5 (РЕКОМЕНДУЕТСЯ) |
| L3      | autonomous   | Полная автономия, уведомления в Telegram при STOP/завершении |
| L4      | scheduled    | Запуск по расписанию (cron), результаты в Telegram     |

Введите уровень (L1/L2/L3/L4, по умолчанию L2):
```

Сохранить как `TRUST_LEVEL`. Если не указано — по умолчанию `L2`.

---

## Шаг 8: Подтверждение

Показать полную конфигурацию и запросить подтверждение.

**AskUserQuestion:**
```
Конфигурация Autoresearch:

  Метрика:       METRIC_NAME
  Команда:       VERIFY_CMD
  Baseline:      BASELINE_VALUE
  Цель:          TARGET_VALUE
  Направление:   DIRECTION
  Итераций:      ITERATION_CAP
  Уровень:       TRUST_LEVEL (TRUST_DESCRIPTION)

Хотите добавить regression gates [B]?
Примеры: «тесты проходят», «бандл < 500KB», «нет TS ошибок»
Введите gates через запятую или Enter для стандартных (тесты + build):

Подтвердите создание PRD (да/нет):
```

Если пользователь добавил regression gates — сохранить как `CUSTOM_GATES`.
Стандартные gates (если не указаны):
- `bun test` — тесты проходят
- `bun run build` — сборка успешна

---

## Шаг 9: Создание PRD и experiments.tsv

### 9a. Создание PRD

Создать PRD в рабочей директории проекта (определить по `git rev-parse --show-toplevel`).

Путь: `PRD-autoresearch-METRIC_SLUG.md` (где METRIC_SLUG = slug от METRIC_NAME).

```markdown
---
title: "Autoresearch: METRIC_NAME optimization"
status: active
phase: execute
iteration_cap: ITERATION_CAP
trust_level: TRUST_LEVEL
created: YYYY-MM-DD
---

# Autoresearch: METRIC_NAME

## Ideal State Criteria

### Optimization Target
- [ ] ISC-1 [Q]: METRIC_NAME (metric: METRIC_NAME || cmd: VERIFY_CMD || baseline: BASELINE_VALUE || target: TARGET_VALUE || direction: DIRECTION)

### Regression Gates
- [ ] ISC-2 [B-fast]: Lint/type-check passes
- [ ] ISC-3 [B-slow]: Test suite passes (`bun test`)
- [ ] ISC-4 [B-slow]: Build succeeds (`bun run build`)
CUSTOM_GATES_HERE

### Anti-Criteria
- [ ] ISC-A1: No secrets/tokens committed to git
- [ ] ISC-A2: No data loss or destructive migrations

## Notes
- Baseline measured: YYYY-MM-DD
- LearningRecall results: LEARNING_SUMMARY
- Trust level: TRUST_LEVEL — TRUST_DESCRIPTION
```

Если пользователь добавил custom gates, включить их как `[B-fast]` или `[B-slow]` в зависимости от ожидаемого времени выполнения.

### 9b. Создание experiments.tsv

Путь: `experiments-autoresearch-METRIC_SLUG.tsv` (рядом с PRD).

```tsv
# [Q] ISC-1: METRIC_NAME
# cmd: VERIFY_CMD
# metric_direction: DIRECTION
# target: TARGET_VALUE
# amplitude: normal
# think_reentries: 0
# trust_level: TRUST_LEVEL
# gate_cost_estimate: TBD (calculated at first iteration)
iteration	commit	metric	delta	status	description
0	baseline	BASELINE_VALUE	0	baseline	Initial measurement
```

---

## Шаг 10: Завершение

Вывести финальное сообщение:

```
PRD создан: PRD_PATH
Эксперименты: TSV_PATH

Baseline: METRIC_NAME = BASELINE_VALUE
Цель: TARGET_VALUE (DIRECTION)
Бюджет: ITERATION_CAP итераций (TRUST_LEVEL)

Запустите `/autoresearch run` для начала оптимизации.
```

**НЕ запускать оптимизацию автоматически.** Пользователь должен явно вызвать `/autoresearch run`.
