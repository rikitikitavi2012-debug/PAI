#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Jules Batch Task Creator — PAI Repository
# ═══════════════════════════════════════════════════════════════
#
# Массовое создание задач для Jules в PAI-personal репозитории.
#
# Использование:
#   bash scripts/jules-batch-tasks.sh           # запустить все задачи
#   bash scripts/jules-batch-tasks.sh --dry-run # показать без создания
#   bash scripts/jules-batch-tasks.sh --count   # показать количество задач
#
# Лимиты Jules:
#   - ~15 задач одновременно (concurrent limit)
#   - 100 задач/день (daily limit)
#
# После завершения:
#   1. bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions
#   2. gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open
#   3. Review + merge
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

echo -e "${CYAN}═══ Jules Batch Tasks — PAI ($REPO @ $BRANCH) ═══${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# СТАНДАРТНЫЙ СУФФИКС — РУССКИЙ ЯЗЫК
# ═══════════════════════════════════════════════════════════════

SUFFIX="

Код и комментарии на английском. PR title на английском (conventional commits: test: ...).
PR description на русском. Используй bun:test для всех тестов.
Расположение тестов: следуй существующим паттернам в репозитории.
Запусти 'bun test' для проверки перед отправкой PR."

# ═══════════════════════════════════════════════════════════════
# TASKS — Batch 2: Хуки + интеграция + robustness
# ═══════════════════════════════════════════════════════════════

# ── Тесты хуков (5) ──

create_task "test: ModeClassifier — классификация режимов" \
  "Напиши тесты для hooks/ModeClassifier.hook.ts.

Файл: hooks/tests/ModeClassifier-modes.test.ts

Сценарии:
1. Приветствие ('привет', 'hello') → возвращает MINIMAL режим
2. Рейтинг ('8', '9/10') → возвращает MINIMAL режим
3. Сложная задача ('создай компонент для...') → возвращает ALGORITHM режим
4. Простая задача ('покажи git status') → возвращает NATIVE режим
5. Пустой промпт → корректная обработка без краша

Прочитай hooks/ModeClassifier.hook.ts для понимания логики классификации.
Используй паттерны из hooks/tests/AlgorithmTracker.test.ts.$SUFFIX"

create_task "test: VoiceCompletion — отправка голоса" \
  "Напиши тесты для hooks/VoiceCompletion.hook.ts.

Файл: hooks/tests/VoiceCompletion-send.test.ts

Сценарии:
1. Хук отправляет POST на localhost:8888/notify
2. Корректное чтение voice_id из settings.json (daidentity.voices.main)
3. Пустой ответ от API → fail-open, не крашится
4. Таймаут подключения → fail-open
5. Отсутствие settings.json → использует fallback voice_id

Прочитай hooks/VoiceCompletion.hook.ts и hooks/lib/identity.ts.$SUFFIX"

create_task "test: AutoWorkCreation — создание PRD" \
  "Напиши тесты для hooks/AutoWorkCreation.hook.ts.

Файл: hooks/tests/AutoWorkCreation-prd.test.ts

Сценарии:
1. Новый промпт создаёт директорию в MEMORY/WORK/ с slug формата YYYYMMDD-HHMMSS_kebab
2. PRD.md создаётся с правильным YAML frontmatter (task, slug, effort, phase, progress, mode, started, updated)
3. Короткий промпт (<20 символов) → НЕ создаёт PRD (фильтр мусора)
4. Повторный промпт в той же сессии → НЕ дублирует PRD
5. Slug корректно кебаб-кейсит кириллицу и длинные строки

Прочитай hooks/AutoWorkCreation.hook.ts. Используй временные директории.$SUFFIX"

create_task "test: PreCompact — сохранение state перед компакцией" \
  "Напиши тесты для hooks/PreCompact.hook.ts.

Файл: hooks/tests/PreCompact-state.test.ts

Сценарии:
1. Хук сохраняет текущую фазу алгоритма в snapshot
2. Хук сохраняет progress (N/M) критериев
3. Хук сохраняет effort level
4. Хук сохраняет slug текущей PRD
5. Snapshot файл создаётся в MEMORY/STATE/

Прочитай hooks/PreCompact.hook.ts и hooks/PostCompactRecovery.hook.ts для понимания пары.$SUFFIX"

create_task "test: PostCompactRecovery — восстановление после компакции" \
  "Напиши тесты для hooks/PostCompactRecovery.hook.ts.

Файл: hooks/tests/PostCompactRecovery-restore.test.ts

Сценарии:
1. Хук загружает snapshot из PreCompact
2. Восстанавливает identity context (имя DA, principal)
3. Инжектит подсказку с текущей фазой и progress
4. Без snapshot файла → работает без краша (fail-open)
5. Повреждённый snapshot JSON → fallback на базовый контекст

Прочитай hooks/PostCompactRecovery.hook.ts.$SUFFIX"

# ── Интеграционные тесты (5) ──

create_task "test: Inference — все уровни и провайдеры" \
  "Напиши тесты для PAI/Tools/Inference.ts.

Файл: hooks/tests/Inference-levels.test.ts

Сценарии:
1. Уровень fast → использует модель haiku, timeout 15s, provider claude
2. Уровень standard → модель sonnet, timeout 30s, provider claude
3. Уровень smart → модель opus, timeout 90s, provider claude
4. Уровень glm5 → provider zai, timeout 30s
5. Параметр --json → парсит JSON из ответа
6. Кастомный --timeout переопределяет дефолтный
7. Timeout → возвращает success:false с error:'timeout'
8. emitInferenceEvent записывает в events.jsonl

Прочитай PAI/Tools/Inference.ts. Мокай fetch для тестов, не делай реальных API вызовов.$SUFFIX"

create_task "test: hook-io readHookInput" \
  "Напиши тесты для hooks/lib/hook-io.ts.

Файл: hooks/tests/hook-io.test.ts

Сценарии:
1. readHookInput() корректно парсит JSON из stdin
2. Пустой stdin → возвращает null
3. Невалидный JSON → возвращает null
4. Timeout (если реализован) → возвращает null
5. Все обязательные поля (session_id, transcript_path) присутствуют в типе

Прочитай hooks/lib/hook-io.ts.$SUFFIX"

create_task "test: prd-utils — полный набор функций" \
  "Напиши тесты для hooks/lib/prd-utils.ts — все экспортируемые функции.

Файл: hooks/tests/prd-utils-full.test.ts

Сценарии:
1. findLatestPRD() — находит PRD с самым свежим mtime
2. parseFrontmatter() — парсит все 8 полей (task, slug, effort, phase, progress, mode, started, updated)
3. writeFrontmatterField() — обновляет существующее поле
4. writeFrontmatterField() — добавляет новое поле если не существует
5. countCriteria() — считает checked и unchecked чекбоксы
6. syncToWorkJson() — создаёт/обновляет запись в work.json
7. readRegistry() — читает work.json, возвращает пустой объект если файл не существует

Используй временные директории. Прочитай hooks/lib/prd-utils.ts.$SUFFIX"

create_task "test: identity — чтение DA и Principal из settings" \
  "Напиши тесты для hooks/lib/identity.ts.

Файл: hooks/tests/identity.test.ts

Сценарии:
1. getIdentity() возвращает объект с name, fullName, displayName, color
2. getPrincipal() возвращает объект с name, timezone
3. getPrincipalName() возвращает строку с именем
4. getVoiceId() возвращает voice ID из daidentity.voices.main
5. getAlgorithmVoice() возвращает voice из daidentity.voices.algorithm
6. Отсутствие settings.json → возвращает дефолтные значения без краша

Прочитай hooks/lib/identity.ts и settings.json (секция daidentity/principal).$SUFFIX"

create_task "test: event-emitter — запись событий" \
  "Напиши тесты для hooks/lib/event-emitter.ts.

Файл: hooks/tests/event-emitter.test.ts

Сценарии:
1. appendEvent() добавляет JSON строку в events.jsonl
2. Событие содержит timestamp в ISO формате
3. Событие содержит session_id
4. Событие содержит type и source поля
5. Несколько вызовов → каждый на отдельной строке (JSONL формат)
6. Несуществующий файл → создаётся автоматически
7. Ошибка записи → не бросает исключение (fail-open)

Прочитай hooks/lib/event-emitter.ts. Используй временный файл для тестов.$SUFFIX"

# ── Robustness тесты (5) ──

create_task "test: все хуки fail-open при пустом stdin" \
  "Напиши тест проверяющий что ВСЕ PreToolUse хуки корректно обрабатывают пустой stdin.

Файл: hooks/tests/all-hooks-failopen.test.ts

Сценарии:
Для каждого PreToolUse хука из settings.json:
1. Запустить как subprocess с пустым stdin (echo '' | bun hook.ts)
2. Проверить что exit code = 0
3. Проверить что stdout содержит валидный JSON
4. Проверить что stdout содержит 'continue' (fail-open)
5. Проверить что stderr пустой (нет ошибок)

Хуки для проверки: SecurityValidator, LearnGate, SetQuestionTab, AgentExecutionGuard, SkillGuard.
Запускай через Bun.spawn с piped stdin/stdout/stderr.$SUFFIX"

create_task "test: gitignore покрытие генерируемых файлов" \
  "Напиши тест проверяющий что .gitignore покрывает все паттерны генерируемых файлов.

Файл: hooks/tests/gitignore-coverage.test.ts

Сценарии:
1. tasks/ директория в .gitignore
2. sessions/ директория в .gitignore
3. ide/ директория в .gitignore
4. *.cache.json в .gitignore
5. MEMORY/LEARNING/**/tool-calls.json в .gitignore
6. MEMORY/LEARNING/**/sentiment.json в .gitignore
7. tmp*/ в .gitignore
8. MEMORY/WORK/*/tasks/ в .gitignore
9. git ls-files НЕ содержит файлы matching эти паттерны (ничего tracked из gitignored)

Прочитай .gitignore и используй 'git ls-files' для проверки.$SUFFIX"

create_task "test: Algorithm LEARN.md во всех complete PRDs" \
  "Напиши тест проверяющий что LearnGate enforcement работает ретроспективно.

Файл: hooks/tests/learn-gate-retrospective.test.ts

Сценарии:
1. Найди все PRD.md с phase: complete в MEMORY/WORK/
2. Для каждого — проверь наличие LEARN.md в той же директории
3. Выведи список PRDs БЕЗ LEARN.md (ожидаемо: все до 2026-03-15)
4. Выведи список PRDs С LEARN.md (ожидаемо: 20260315-230000 и новее)
5. Рассчитай процент покрытия
6. Тест НЕ должен fail если старые PRDs без LEARN.md — это ожидаемо

Это не enforcement тест а аудит — показывает прогресс adoption.$SUFFIX"

create_task "test: settings.json JSON валидность и структура" \
  "Напиши тест проверяющий структурную целостность settings.json.

Файл: hooks/tests/settings-structure.test.ts

Сценарии:
1. settings.json парсится как валидный JSON
2. Содержит обязательные секции: env, permissions, hooks, daidentity, principal
3. daidentity содержит name, voices.main.voiceId, voices.algorithm.voiceId
4. principal содержит name, timezone
5. hooks содержит PreToolUse, PostToolUse, SessionEnd, SessionStart, Stop
6. Каждый hook entry содержит type:'command' и command с путём к файлу
7. counts.hooks = реальное количество *.hook.ts файлов в hooks/
8. Ни один matcher entry НЕ содержит >1 хука если оба читают stdin (stdin sharing баг)

Прочитай settings.json. Проверь hooks/ директорию.$SUFFIX"

create_task "test: Algorithm v4.0-alpha полнота секций" \
  "Напиши тест проверяющий что v4.0-alpha.md содержит все необходимые секции.

Файл: PAI/Algorithm/tests/test-sections-completeness.ts

Сценарии:
1. Содержит все 7 фаз: OBSERVE, THINK, PLAN, CYCLE SELECTOR, BUILD, EXECUTE, VERIFY, LEARN
2. Каждая фаза имеет FIRST ACTION инструкцию
3. Содержит Effort Levels таблицу с 5 тирами
4. Содержит ISC Decomposition Methodology
5. Содержит Splitting Test (4 теста)
6. Содержит Critical Rules секцию
7. Содержит Context Recovery секцию
8. Содержит PRD.md Format секцию
9. Содержит PERSIST LEARNINGS (MANDATORY) в LEARN фазе
10. Содержит Iteration Budget таблицу

Прочитай PAI/Algorithm/v4.0-alpha.md и проверяй regex/includes.$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# ИТОГО
# ═══════════════════════════════════════════════════════════════

echo -e "${CYAN}═══ РЕЗУЛЬТАТ ═══${NC}"
if $DRY_RUN; then
  echo -e "Режим:   ${CYAN}DRY RUN${NC}"
fi
echo -e "Создано: ${GREEN}$CREATED${NC}"
echo -e "Ошибок:  ${RED}$FAILED${NC}"
echo -e "Всего:   $COUNT"
echo ""
echo "Проверить: $JULES_API sessions"
echo "PR список: gh pr list --repo $REPO --state open"
