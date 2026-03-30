#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Jules Batch — Autoresearch Skill Test Coverage
# ═══════════════════════════════════════════════════════════════
#
# 15 задач на покрытие нового скилла Autoresearch:
#   - SKILL.md структура и routing (3)
#   - Plan.md wizard (3)
#   - Run.md sub-loop launch (3)
#   - Resume.md state recovery (2)
#   - Report.md TSV analysis (2)
#   - Trust Level integration (2)
#
# Использование:
#   bash scripts/jules-autoresearch-tests.sh           # запустить
#   bash scripts/jules-autoresearch-tests.sh --dry-run # показать без создания
#   bash scripts/jules-autoresearch-tests.sh --count   # количество задач
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

REPO="rikitikitavi2012-debug/PAI-personal"
BRANCH="master"
JULES_API="bun $HOME/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts"
COUNT=0
CREATED=0
FAILED=0
SKIPPED=0
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --count)
      count=$(grep -c '^create_task ' "$0" 2>/dev/null || echo 0)
      echo "Задач в скрипте: $count"
      exit 0
      ;;
  esac
done

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

create_task() {
  local name="$1"
  local prompt="$2"
  COUNT=$((COUNT + 1))
  echo -e "${YELLOW}[$COUNT] $name${NC}"
  if $DRY_RUN; then
    echo -e "  ${CYAN}DRY RUN${NC} — пропущено"
    SKIPPED=$((SKIPPED + 1))
    echo ""
    return
  fi
  result=$($JULES_API create --repo "$REPO" --branch "$BRANCH" --prompt "$prompt" 2>&1) || true
  if echo "$result" | grep -q "Session created"; then
    session_id=$(echo "$result" | grep -oP 'sessions/\K\d+')
    echo -e "  ${GREEN}OK${NC} → sessions/$session_id"
    CREATED=$((CREATED + 1))
  else
    echo -e "  ${RED}FAIL${NC}: $(echo "$result" | head -1)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
  sleep 2
}

SUFFIX="

Код и комментарии на английском. PR title на английском (conventional commits: test: ...).
PR description на русском. Используй bun:test для всех тестов.
Расположение тестов: skills/Autoresearch/tests/ (создай директорию если нет).
Паттерн: прочитай hooks/tests/AlgorithmTracker.test.ts для примера стиля.
Запусти 'bun test skills/Autoresearch/tests/' для проверки перед отправкой PR."

echo -e "${CYAN}═══ Jules Batch — Autoresearch Skill Tests ($REPO @ $BRANCH) ═══${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# SKILL.md Structure & Routing (3 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: SKILL.md frontmatter validation" \
  "Напиши тесты для skills/Autoresearch/SKILL.md — валидация структуры скилла.

Файл: skills/Autoresearch/tests/skill-structure.test.ts

Сценарии:
1. SKILL.md существует и парсится как valid YAML frontmatter
2. Frontmatter содержит обязательные поля: name, description, context
3. name === 'Autoresearch'
4. description содержит русские триггеры: 'автоисследование', 'оптимизация метрики'
5. description содержит английские триггеры: 'autoresearch', 'optimize metric'
6. context === 'fork'
7. Voice notification template содержит русский текст 'Запускаю'

Прочитай skills/Autoresearch/SKILL.md для понимания структуры.
Прочитай skills/YandexDirect/SKILL.md как эталон формата.$SUFFIX"

create_task "test: SKILL.md workflow routing table" \
  "Напиши тесты для routing table в skills/Autoresearch/SKILL.md.

Файл: skills/Autoresearch/tests/skill-routing.test.ts

Сценарии:
1. Routing table содержит ровно 4 маршрута
2. 'plan' паттерн маршрутизируется к Workflows/Plan.md
3. 'run' паттерн маршрутизируется к Workflows/Run.md
4. 'resume' паттерн маршрутизируется к Workflows/Resume.md
5. 'report' паттерн маршрутизируется к Workflows/Report.md
6. Каждый workflow файл из routing table реально существует на диске
7. Русские паттерны присутствуют: 'настрой', 'запусти', 'возобнови', 'отчёт'

Прочитай skills/Autoresearch/SKILL.md для routing table.$SUFFIX"

create_task "test: SKILL.md quality gates completeness" \
  "Напиши тесты для Quality Gates в skills/Autoresearch/SKILL.md.

Файл: skills/Autoresearch/tests/skill-gates.test.ts

Сценарии:
1. SKILL.md содержит секцию 'Quality Gates'
2. Gate 1 (Metric Safety) — проверяет наличие verify command, baseline, target
3. Gate 2 (PRD Integrity) — проверяет PRD перед запуском
4. Gate 3 (Trust Level Validation) — проверяет trust_level L1-L4
5. Gate 4 (Regression Protection) — проверяет regression gates
6. Каждый gate содержит чекбоксы (- [ ])
7. Нет дублирования gate критериев между разными gates

Прочитай skills/Autoresearch/SKILL.md.$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# Plan.md Wizard (3 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: Plan.md wizard steps completeness" \
  "Напиши тесты для skills/Autoresearch/Workflows/Plan.md — проверка 10 шагов wizard.

Файл: skills/Autoresearch/tests/plan-steps.test.ts

Сценарии:
1. Plan.md содержит ровно 10 шагов (Шаг 1 через Шаг 10)
2. Шаг 1 спрашивает про метрику (содержит 'метрик' или 'metric')
3. Шаг 4 вызывает LearningRecall (содержит 'LearningRecall')
4. Шаг 5 делает dry-run baseline (содержит 'baseline')
5. Шаг 7 спрашивает trust_level (содержит 'trust_level' и L1-L4)
6. Шаг 8 показывает confirmation prompt
7. Шаг 9 создаёт PRD с [Q] критерием
8. Шаг 10 НЕ запускает оптимизацию (содержит 'НЕ запускает' или '/autoresearch run')

Прочитай skills/Autoresearch/Workflows/Plan.md.$SUFFIX"

create_task "test: Plan.md PRD template generation" \
  "Напиши тесты для PRD шаблона в Plan.md — что генерирует wizard.

Файл: skills/Autoresearch/tests/plan-prd-template.test.ts

Сценарии:
1. Plan.md содержит YAML frontmatter шаблон для PRD
2. Шаблон включает поля: task, slug, effort, phase, progress, mode, started, updated
3. Шаблон включает trust_level и iteration_cap
4. Шаблон содержит [Q] ISC criterion с metric definition
5. Metric definition имеет формат: metric || cmd || baseline || target || direction
6. Шаблон содержит секцию для [B] regression gates
7. Шаблон содержит experiments.tsv header с metric_direction и target

Прочитай skills/Autoresearch/Workflows/Plan.md (Шаг 9).$SUFFIX"

create_task "test: Plan.md trust level options" \
  "Напиши тесты для Trust Level опций в Plan.md wizard.

Файл: skills/Autoresearch/tests/plan-trust-levels.test.ts

Сценарии:
1. Plan.md описывает 4 уровня доверия: L1, L2, L3, L4
2. L1 описан как 'supervised' с периодом 5 итераций
3. L2 описан как 'monitored' с периодом 20 итераций
4. L3 описан как 'autonomous' с Telegram уведомлениями
5. L4 описан как 'scheduled' с cron
6. Default trust level = L2
7. Каждый уровень имеет русское описание

Прочитай skills/Autoresearch/Workflows/Plan.md (Шаг 7).$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# Run.md Sub-Loop Launch (3 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: Run.md protocol reference integrity" \
  "Напиши тесты для Run.md — проверка что он корректно ссылается на Algorithm-Autoresearch.md.

Файл: skills/Autoresearch/tests/run-protocol-ref.test.ts

Сценарии:
1. Run.md содержит ссылку на 'PAI/Algorithm/Algorithm-Autoresearch.md'
2. Run.md явно говорит НЕ дублировать логику цикла
3. Run.md содержит 'единственному источнику истины' или 'source of truth'
4. Algorithm-Autoresearch.md реально существует на диске
5. Run.md НЕ содержит полную имплементацию 8-phase cycle (только перечисление фаз)
6. Run.md содержит Verification Rehearsal шаг
7. Run.md ссылается на стагнацию detection из Algorithm-Autoresearch.md

Прочитай skills/Autoresearch/Workflows/Run.md.$SUFFIX"

create_task "test: Run.md trust level notification behavior" \
  "Напиши тесты для Trust Level нотификаций в Run.md.

Файл: skills/Autoresearch/tests/run-trust-notifications.test.ts

Сценарии:
1. Run.md описывает поведение для L1 (AskUserQuestion каждые 5 итераций)
2. Run.md описывает поведение для L2 (AskUserQuestion каждые 20 итераций)
3. Run.md описывает поведение для L3 (Telegram каждые 10 итераций)
4. Run.md описывает поведение для L4 (start/complete/error only)
5. L3 использует AgentZero.ts для отправки Telegram
6. Формат Telegram сообщения содержит: iteration, cap, метрику, trajectory, revert rate
7. Completion алерт существует для всех уровней
8. Stagnation алерт существует для L3+

Прочитай skills/Autoresearch/Workflows/Run.md (Шаг 6).$SUFFIX"

create_task "test: Run.md prerequisite validation" \
  "Напиши тесты для валидации prerequisites в Run.md.

Файл: skills/Autoresearch/tests/run-prerequisites.test.ts

Сценарии:
1. Run.md требует наличие PRD с [Q] критериями
2. Run.md требует наличие experiments.tsv
3. Run.md требует работающую verify command
4. Run.md описывает Verification Rehearsal (3 прогона: baseline, known-good, revert)
5. Run.md проверяет noise calibration (3x запуск, variance check)
6. Run.md проверяет cost model (gate_cost_estimate)
7. Если Rehearsal провалился — STOP описан

Прочитай skills/Autoresearch/Workflows/Run.md (Шаги 3-5).$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# Resume.md State Recovery (2 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: Resume.md state recovery from experiments.tsv" \
  "Напиши тесты для Resume.md — восстановление состояния из experiments.tsv.

Файл: skills/Autoresearch/tests/resume-state-recovery.test.ts

Сценарии:
1. Resume.md извлекает iteration count из data rows
2. Resume.md извлекает current metric из последней keep/baseline строки
3. Resume.md извлекает think_reentries из header comment
4. Resume.md считает consecutive discards из trailing discard rows
5. Resume.md читает amplitude из header comment
6. Resume.md читает noise_tolerance из header comment
7. Resume.md проверяет git log для коммитов вне experiments.tsv

Прочитай skills/Autoresearch/Workflows/Resume.md (Шаг 2).$SUFFIX"

create_task "test: Resume.md baseline recalibration" \
  "Напиши тесты для Resume.md — рекалибровка baseline при drift.

Файл: skills/Autoresearch/tests/resume-recalibration.test.ts

Сценарии:
1. Resume.md перезапускает baseline metric command при возобновлении
2. Если drift > 5% — рекалибрует baseline
3. Если drift <= 5% — продолжает с текущим baseline
4. При рекалибровке записывает комментарий 'baseline_recalibrated: old → new'
5. Resume.md возобновляет с Phase 1 (REVIEW), не с середины итерации
6. Resume.md показывает статус summary на русском перед возобновлением
7. Resume.md проверяет PRD frontmatter для phase и progress

Прочитай skills/Autoresearch/Workflows/Resume.md (Шаг 4).$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# Report.md TSV Analysis (2 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: Report.md trajectory and breakdown analysis" \
  "Напиши тесты для Report.md — траектория и breakdown.

Файл: skills/Autoresearch/tests/report-trajectory.test.ts

Сценарии:
1. Report.md парсит experiments.tsv header (metric_direction, target)
2. Report.md вычисляет trajectory: baseline → current (start → end)
3. Report.md генерирует breakdown таблицу (keep/discard/crash/skip/timeout)
4. Report.md идентифицирует top-5 highest-impact experiments по delta
5. Report.md обрабатывает edge case: пустой TSV (только header)
6. Report.md обрабатывает edge case: все эксперименты discard
7. Report.md поддерживает multiple [Q] sections (разделитель '# [Q] ISC-N:')
8. Весь output на русском языке

Прочитай skills/Autoresearch/Workflows/Report.md (Шаги 2-5).$SUFFIX"

create_task "test: Report.md diminishing returns analysis" \
  "Напиши тесты для Report.md — анализ убывающей отдачи и рекомендации.

Файл: skills/Autoresearch/tests/report-diminishing.test.ts

Сценарии:
1. Report.md анализирует diminishing returns (сравнение avg delta first 10 vs last 10)
2. Report.md определяет inflection point
3. Report.md группирует эксперименты по категориям (description keywords)
4. Report.md находит highest-impact категорию
5. Report.md генерирует рекомендации на основе данных
6. Report.md включает LEARN.md synthesis если PRD phase = complete
7. Report.md output использует table format (| разделитель)

Прочитай skills/Autoresearch/Workflows/Report.md (Шаги 6-8).$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# Trust Level Integration (2 задачи)
# ═══════════════════════════════════════════════════════════════

create_task "test: Algorithm v4.0.0 Trust Level section" \
  "Напиши тесты для Trust Level секции в PAI/Algorithm/v4.0.0.md.

Файл: skills/Autoresearch/tests/algorithm-trust-level.test.ts

Сценарии:
1. v4.0.0.md содержит 'Trust Level' секцию
2. Секция документирует 4 уровня: L1, L2, L3, L4
3. L1 = Supervised, L2 = Monitored, L3 = Autonomous, L4 = Scheduled
4. Default trust level = L2
5. L3/L4 Telegram format содержит AgentZero.ts команду
6. Alerts описаны: completion, stagnation, error
7. trust_level указан в frontmatter field inventory (строка с 'optional:')
8. trust_level указан в PRD.md Format секции

Прочитай PAI/Algorithm/v4.0.0.md — найди 'Trust Level'.$SUFFIX"

create_task "test: skill-index.json Autoresearch entry" \
  "Напиши тесты для Autoresearch записи в skills/skill-index.json.

Файл: skills/Autoresearch/tests/skill-index-entry.test.ts

Сценарии:
1. skill-index.json парсится как valid JSON
2. totalSkills >= 12
3. skills.autoresearch entry существует
4. autoresearch.name === 'Autoresearch'
5. autoresearch.path === 'Autoresearch/SKILL.md'
6. autoresearch.triggers содержит 'autoresearch'
7. autoresearch.triggers содержит русский триггер 'автоисследование' или 'оптимизация'
8. autoresearch.tier === 'deferred'
9. Файл по пути autoresearch.path реально существует

Прочитай skills/skill-index.json.$SUFFIX"

# ═══════════════════════════════════════════════════════════════

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "Итого: ${COUNT} задач"
echo -e "  ${GREEN}Создано: ${CREATED}${NC}"
echo -e "  ${RED}Ошибки: ${FAILED}${NC}"
echo -e "  ${YELLOW}Пропущено: ${SKIPPED}${NC}"
echo ""
echo "Проверка: bun \$HOME/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions"
echo "PRs: gh pr list --repo $REPO --state open"
