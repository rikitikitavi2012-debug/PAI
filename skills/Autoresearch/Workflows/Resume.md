# Возобновление Autoresearch сессии

**Восстанавливает прерванную сессию автоисследования из experiments.tsv и PRD.**

---

## Шаг 1: Найти PRD

### Вариант A — пользователь указал slug:
```bash
ls ~/.claude/MEMORY/WORK/{slug}/PRD.md
```

### Вариант B — найти последний незавершённый PRD с [Q] критериями:
```bash
# Найти PRD с [Q] критериями и phase != complete
for prd in $(find ~/.claude/MEMORY/WORK/ -name "PRD.md" -newer ~/.claude/MEMORY/WORK/ | sort -r); do
  if grep -q '\[Q\]' "$prd" && ! grep -q 'phase: complete' "$prd"; then
    echo "$prd"
    break
  fi
done
```

Если PRD не найден — сообщить пользователю:
> Не найден незавершённый PRD с [Q] критериями. Используйте `/autoresearch plan` для создания или укажите slug.

---

## Шаг 2: Восстановить состояние из experiments.tsv

Прочитать файл `~/.claude/MEMORY/WORK/{slug}/experiments.tsv` и извлечь:

### 2.1 Количество итераций
```
Подсчитать data rows (строки без # и без заголовка iteration|commit|...).
```

### 2.2 Текущая метрика
```
Найти последнюю строку со status=keep или status=baseline.
Значение колонки metric — текущая метрика.
```

### 2.3 Счётчик re-entry
```
Найти заголовок: # think_reentries: N
Если отсутствует — значение 0.
```

### 2.4 Consecutive discards
```
Считать trailing строки с status=discard снизу файла.
Первая строка НЕ discard — остановить счёт.
```

### 2.5 Change amplitude
```
Найти заголовок: # amplitude: normal|amplified|reduced
Если отсутствует — normal.
```

### 2.6 Noise tolerance
```
Найти заголовок: # noise_tolerance: N%
Если отсутствует — 0%.
```

### 2.7 Baseline и target
```
Найти заголовок: # target: {value}
Найти первую строку со status=baseline — значение metric.
```

---

## Шаг 3: Прочитать frontmatter PRD

Извлечь из frontmatter:
- `phase` — текущая фаза (ожидается execute)
- `progress` — M/N проверенных критериев
- `trust_level` — уровень доверия (L1/L2/L3/L4), default L1
- `effort` — для определения iteration cap
- `iteration_cap` — если задан
- `execute_mode` — autoresearch или hybrid

---

## Шаг 4: Протокол Pause/Resume из Algorithm-Autoresearch.md

Следовать протоколу преднамеренного возобновления:

### 4.1 Перезамер baseline
```bash
timeout 60 {metric_command}
```
Записать текущее значение.

### 4.2 Сравнить с baseline из experiments.tsv
Вычислить drift:
```
drift = |current_baseline - original_baseline| / original_baseline * 100
```

### 4.3 Рекалибровка (если drift > 5%)
Если baseline изменился более чем на 5%:
- Записать новый baseline в experiments.tsv:
  ```
  # baseline_recalibrated: {old} → {new} (reason: external changes)
  ```
- Если drift > 20% — перезапустить Verification Rehearsal (вернуться к Run.md Шаг 5)

### 4.4 Проверить git log
```bash
git log --oneline HEAD~20..HEAD
```
Сравнить коммиты с записями в experiments.tsv. Если есть коммиты, не отражённые в experiments.tsv — внешние изменения. Зафиксировать в LOG:
```
# external_commits_detected: {count} commits since last recorded iteration
```

### 4.5 Проверить mid-iteration state
```bash
git status
```
Если есть uncommitted changes:
- Запустить sanity check (`bun build --dry-run`, lint, type-check)
- Если проходит — commit как `exp(N): recovered mid-iteration`, продолжить с VERIFY
- Если не проходит — `git checkout -- .` (discard), продолжить с IDEATE

---

## Шаг 5: Возобновить цикл с Phase 1 (REVIEW)

Загрузить `PAI/Algorithm/Algorithm-Autoresearch.md` и начать с Phase 1 (REVIEW):
- Прочитать текущую метрику
- Прочитать experiments.tsv (что пробовали, какие дельты)
- Прочитать recent git log
- Consecutive discard counter переносится из experiments.tsv

**НЕ ДУБЛИРОВАТЬ** логику 8-фазного цикла — следовать Algorithm-Autoresearch.md.

---

## Шаг 6: Trust Level нотификации

Применить поведение нотификаций аналогично Run.md:

### L1 — Supervised (контролируемый)
- AskUserQuestion каждые 5 итераций для одобрения

### L2 — Monitored (мониторинг)
- AskUserQuestion каждые 20 итераций для статус-чека

### L3 — Autonomous (автономный)
- Telegram через AgentZero каждые 10 итераций:
  ```bash
  bun ~/.claude/PAI/Tools/AgentZero.ts message "🔬 Autoresearch: итерация {N}/{cap}
  📊 Метрика: {current} (target: {target})
  📈 Траектория: {trajectory}
  ↩️ Revert rate: {revert_rate}%"
  ```

### L4 — Scheduled (запланированный)
- Telegram только при старте, завершении, ошибке

---

## Сводка перед возобновлением

Вывести summary перед началом цикла:

```
📋 Восстановление Autoresearch
🔄 Итерация: {last}/{cap}
📊 Текущая метрика: {current} (baseline: {baseline}, target: {target})
🔁 Reentries: {N}/2
📊 Consecutive discards: {N}
🔊 Amplitude: {normal|amplified|reduced}
⚡ Trust Level: {L1-L4}
```

Дополнительно, если были изменения:
```
⚠️ Baseline recalibrated: {old} → {new}
⚠️ External commits detected: {count}
⚠️ Mid-iteration state recovered: {commit|discard}
```

---

## Нотификации при завершении

### Target достигнут
**L1-L2 (голосовое):**
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Autoresearch завершён после возобновления, цель достигнута","voice_id":"hU3rD0Yk7DoiYULTX1pD","voice_enabled":true}'
```

**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "✅ Autoresearch завершён (resumed)!
🎯 Цель достигнута: {metric} (target: {target})
🔄 Итераций: {total}/{cap} (resumed at: {resume_point})
📈 Улучшение: {baseline} → {final} ({delta}%)"
```

### Стагнация (STOP)
**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "⚠️ Autoresearch STOP (resumed): стагнация
📊 Метрика: {current} (target: {target})
📈 Траектория: {trajectory}
↩️ Revert rate: {revert_rate}%
🔁 Consecutive discards: {N}"
```

### Ошибка
**L3-L4 (Telegram):**
```bash
bun ~/.claude/PAI/Tools/AgentZero.ts message "❌ Autoresearch ERROR (resumed)
📋 Итерация: {N}/{cap}
🔴 Ошибка: {error_details}
💡 Требуется ручное вмешательство"
```

---

## Чеклист перед возобновлением

- [ ] PRD найден и содержит [Q] критерии
- [ ] experiments.tsv прочитан, состояние восстановлено
- [ ] trust_level определён из frontmatter
- [ ] Baseline перезамерен и сравнён
- [ ] Рекалибровка выполнена (если drift > 5%)
- [ ] Git log проверен на внешние коммиты
- [ ] Mid-iteration state обработан (если есть uncommitted changes)
- [ ] Algorithm-Autoresearch.md загружен
- [ ] Summary выведен пользователю
