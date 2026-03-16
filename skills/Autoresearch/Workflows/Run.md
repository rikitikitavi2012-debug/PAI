# Запуск Autoresearch Sub-Loop

**Запускает цикл автоматической оптимизации метрики.** Этот воркфлоу НЕ содержит логику цикла — она определена в `PAI/Algorithm/Algorithm-Autoresearch.md`. Здесь: подготовка, валидация, запуск.

---

## Шаг 1: Найти PRD

Определить PRD с `[Q]` критериями для оптимизации:

**Вариант A — пользователь указал slug:**
```bash
ls ~/.claude/MEMORY/WORK/{slug}/PRD.md
```

**Вариант B — найти последний PRD с [Q] критериями:**
```bash
# Найти все PRD с [Q] критериями, отсортировать по дате
grep -rl '\[Q\]' ~/.claude/MEMORY/WORK/*/PRD.md | sort -r | head -1
```

Если PRD не найден — сообщить пользователю:
> Не найден PRD с [Q] критериями. Используйте `/autoresearch plan` для создания.

---

## Шаг 2: Загрузить PRD и извлечь параметры

Прочитать PRD и извлечь из frontmatter:
- `trust_level` — уровень доверия (L1/L2/L3/L4), по умолчанию L1
- `effort` — определяет iteration cap
- `execute_mode` — должен быть `autoresearch` или `hybrid`
- `iteration_cap` — если задан, использовать его

Из тела PRD извлечь:
- Все `[Q]` критерии — цели оптимизации
- Все `[B]` критерии — регрессионные гейты
- Все `[B-fast]` / `[B-slow]` — разделение гейтов по скорости
- Все `ISC-A` — анти-критерии (жёсткие стопы)
- Команду измерения метрики (из описания [Q] критерия)
- target и metric_direction (из [Q] критерия)

---

## Шаг 3: Проверить пререквизиты

### 3.1 Файл experiments.tsv
```bash
ls ~/.claude/MEMORY/WORK/{slug}/experiments.tsv
```
Если отсутствует — создать с заголовком:
```tsv
# [Q] ISC-N: Описание критерия
# metric_direction: higher_is_better|lower_is_better
# target: {значение}
# think_reentries: 0
# amplitude: normal
# noise_tolerance: 0%
iteration	commit	metric	delta	status	description
```

### 3.2 Команда измерения
Выполнить метрик-команду dry-run:
```bash
timeout 60 {metric_command}
```
Если команда не работает — ОСТАНОВИТЬСЯ, сообщить пользователю.

### 3.3 Verify-команда
Убедиться, что регрессионные гейты ([B] критерии) выполняются на текущем состоянии кода.

---

## Шаг 4: Загрузить протокол Sub-Loop

```
Прочитать: PAI/Algorithm/Algorithm-Autoresearch.md
```

Этот файл содержит:
- 8-фазный итерационный цикл (REVIEW → IDEATE → MODIFY → COMMIT → VERIFY → DECIDE → LOG → REPEAT)
- Layered Drift Defense (L1/L2/L3 — стратегический/тактический/структурный)
- Stagnation Detection (5 discards → amplify, 10 → STOP)
- Regression Gates (fast каждую итерацию, slow каждые 5)
- Context Recovery протокол
- Multiple [Q] — последовательная оптимизация

**НЕ ДУБЛИРОВАТЬ логику цикла здесь.** Следовать Algorithm-Autoresearch.md как единственному источнику истины.

---

## Шаг 5: Verification Rehearsal

Перед первой итерацией — обязательная валидация метрики (3 прогона):

### 5.1 Baseline
```bash
timeout 60 {metric_command}
# Записать результат как baseline
```

### 5.2 Known-good change
Внести заведомо улучшающее изменение (если возможно) и измерить:
```bash
timeout 60 {metric_command}
# Убедиться, что метрика изменилась в ожидаемом направлении
```

### 5.3 Revert и повторное измерение
```bash
git checkout -- .
timeout 60 {metric_command}
# Убедиться, что метрика вернулась к baseline (в пределах noise tolerance)
```

### 5.4 Noise calibration
Вычислить дисперсию 3 прогонов baseline. Если sigma > 2% от baseline:
- Расширить tolerance до `max(5%, 2 * sigma)`
- Записать в experiments.tsv: `# noise_tolerance: {X}%`

### 5.5 Cost model validation
Оценить стоимость гейтов:
```
(slow_gate_count * avg_slow_time * iterations/5) + (fast_gate_count * avg_fast_time * iterations)
```
Если > 30% бюджета — скорректировать частоту slow gates или iteration cap.
Записать: `# gate_cost_estimate: {X}s per iteration`

Если Rehearsal провалился — ОСТАНОВИТЬСЯ, сообщить пользователю о ненадёжности метрики.

---

## Шаг 6: Интеграция Trust Level

Прочитать `trust_level` из frontmatter PRD и настроить поведение нотификаций:

### L1 — Supervised (контролируемый)
- **Каждые 5 итераций** — AskUserQuestion с запросом одобрения на продолжение:
  > Autoresearch: итерация {N}/{cap}. Метрика: {current} (target: {target}). Продолжить?
- При отсутствии ответа — приостановить цикл
- Голосовое уведомление при завершении/ошибке

### L2 — Monitored (мониторинг)
- **Каждые 20 итераций** — AskUserQuestion со статусом:
  > Autoresearch: итерация {N}/{cap}. Метрика: {current} (target: {target}). Revert rate: {X}%. Продолжить или скорректировать?
- Автоматическое продолжение между чекпоинтами
- Голосовое уведомление при завершении/ошибке

### L3 — Autonomous (автономный)
- **Каждые 10 итераций** — Telegram уведомление через AgentZero:
  ```bash
  bun ~/.claude/PAI/Tools/AgentZero.ts message "🔬 Autoresearch: итерация {N}/{cap}
  📊 Метрика: {current} (target: {target})
  📈 Траектория: {trajectory}
  ↩️ Revert rate: {revert_rate}%"
  ```
- Без AskUserQuestion — полная автономия
- Telegram уведомление при завершении/ошибке/стагнации

### L4 — Scheduled (запланированный)
- Полная автономия, минимальные нотификации
- Telegram только при: старте, завершении, ошибке
- Формат старта:
  ```bash
  bun ~/.claude/PAI/Tools/AgentZero.ts message "🔬 Autoresearch запущен: {task}
  🎯 Target: {target}
  📊 Baseline: {baseline}
  🔄 Cap: {iteration_cap}"
  ```

---

## Шаг 7: Запуск 8-фазного итерационного цикла

Передать управление протоколу из `PAI/Algorithm/Algorithm-Autoresearch.md`.

Цикл выполняется по 8 фазам:
```
Phase 1: REVIEW → Phase 2: IDEATE → Phase 3: MODIFY → Phase 4: COMMIT →
Phase 5: VERIFY → Phase 6: DECIDE → Phase 7: LOG → Phase 8: REPEAT
```

**Условия остановки** (из Algorithm-Autoresearch.md):
- Target достигнут
- Iteration cap исчерпан
- Stagnation detected (10 consecutive discards)
- Re-entry limit (2) исчерпан
- Anti-criteria нарушены дважды
- Pareto deadlock (для multiple [Q])

---

## Нотификации при завершении

### Target достигнут
**L1-L2 (голосовое):**
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Autoresearch завершён, цель достигнута","voice_id":"hU3rD0Yk7DoiYULTX1pD","voice_enabled":true}'
```

**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "✅ Autoresearch завершён!
🎯 Цель достигнута: {metric} (target: {target})
🔄 Итераций: {N}/{cap}
📈 Улучшение: {baseline} → {final} ({delta}%)
⏱️ Время: {elapsed}"
```

### Стагнация (STOP)
**L1-L2 (голосовое):**
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Autoresearch остановлен: стагнация метрики","voice_id":"hU3rD0Yk7DoiYULTX1pD","voice_enabled":true}'
```

**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "⚠️ Autoresearch STOP: стагнация
📊 Метрика: {current} (target: {target})
📈 Траектория: {trajectory}
↩️ Revert rate: {revert_rate}%
🔁 Consecutive discards: {N}
💡 Рекомендация: пересмотреть подход в THINK фазе"
```

### Ошибка
**L1-L2 (голосовое):**
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Autoresearch: критическая ошибка, требуется внимание","voice_id":"hU3rD0Yk7DoiYULTX1pD","voice_enabled":true}'
```

**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "❌ Autoresearch ERROR
📋 Итерация: {N}/{cap}
🔴 Ошибка: {error_details}
📊 Последняя метрика: {current}
💡 Требуется ручное вмешательство"
```

---

## Чеклист перед запуском

- [ ] PRD найден и содержит [Q] критерии
- [ ] trust_level определён (default: L1)
- [ ] experiments.tsv существует с корректным заголовком
- [ ] Метрик-команда работает (dry-run успешен)
- [ ] Регрессионные гейты проходят на текущем коде
- [ ] Verification Rehearsal пройден (3 прогона стабильны)
- [ ] Algorithm-Autoresearch.md загружен
- [ ] Cost model validated (gate cost < 30% бюджета)
