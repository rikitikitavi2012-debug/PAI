#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Jules Batch Tasks — 2026-03-16 — Algorithm + System hardening
# ═══════════════════════════════════════════════════════════════
# Задачи по результатам сессии:
# - Algorithm v4.0-alpha improvements (mid-session downshift, ISC Quality Gate, time budget)
# - RU localization verification
# - Hook system integrity
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

echo -e "${CYAN}═══ Jules Batch — Algorithm + System (2026-03-16) ═══${NC}"
echo ""

SUFFIX="

Код и комментарии на английском. PR title на английском (conventional commits: test: ...).
PR description на русском. Используй bun:test для всех тестов.
Расположение тестов: следуй существующим паттернам в репозитории.
Запусти 'bun test' для проверки перед отправкой PR."

# ═══════════════════════════════════════════════════════════════
# ALGORITHM v4.0-alpha TESTS
# ═══════════════════════════════════════════════════════════════

create_task "test-mid-session-downshift" "Create tests for the mid-session downshift mechanism in PAI/Algorithm/v4.0-alpha.md.

Verify:
1. The downshift table exists with 4 rows (<8 → NATIVE, 8-15 → Standard, 16-23 → Extended, meets floor → no downshift)
2. The mechanism section describes: voice announcement, PRD preservation, effort frontmatter update
3. Anti-gaming clause exists (LEARN Track 1 logging, >30% rate flag)
4. Condition clause exists (Splitting Test must be applied first)
5. Downshift to NATIVE includes: skip THINK/PLAN/BUILD, go direct to EXECUTE

Place test in: PAI/Algorithm/tests/mid-session-downshift.test.ts$SUFFIX"

create_task "test-isc-quality-gate" "Create tests for the ISC Quality Gate in PAI/Algorithm/v4.0-alpha.md.

Verify:
1. Quality Gate section exists in Critical Rules
2. Triviality test definition is present (checks existence/no-error/no-typos = trivial)
3. Enforcement threshold: >30% trivial → STOP
4. Quick self-test question exists ('If this criterion passes, does the user notice?')
5. Quality Gate is described as running AFTER Count Gate

Place test in: PAI/Algorithm/tests/isc-quality-gate.test.ts$SUFFIX"

create_task "test-time-budget-enforcement" "Create tests for the Time Budget Enforcement in PAI/Algorithm/v4.0-alpha.md.

Verify:
1. Section title is 'Time Budget Enforcement' (not just 'Time Budget per Phase')
2. Phase header format includes elapsed time: '[elapsed: Xm / budget: Ym]'
3. Three enforcement rules exist: >75% (compress), >100% (no new capabilities), >150% (skip to VERIFY + TIMEOUT)
4. Voice warning message is in Russian ('Бюджет времени превышен')
5. Reference to Effort Levels table for budget values

Place test in: PAI/Algorithm/tests/time-budget-enforcement.test.ts$SUFFIX"

create_task "test-capability-audit-tiers" "Create tests for the tier-based Capability Audit depth in PAI/Algorithm/v4.0-alpha.md.

Verify:
1. TIER-BASED AUDIT DEPTH table exists with 3 rows (Standard, Extended, Advanced+)
2. Standard tier: 'Fast-path' — list only USE capabilities, no DECLINE/N/A
3. Extended tier: USE + DECLINE for relevant, N/A can batch
4. Advanced+ tier: Full audit with all 25 capabilities
5. Rationale explains why Standard skips full enumeration

Place test in: PAI/Algorithm/tests/capability-audit-tiers.test.ts$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# LOCALIZATION TESTS
# ═══════════════════════════════════════════════════════════════

create_task "test-voice-messages-russian" "Create a test that verifies ALL voice notification messages in PAI production code are in Russian.

Scan these directories for voice curl calls (localhost:8888/notify with 'message' field):
- hooks/*.ts (exclude tests/)
- hooks/handlers/*.ts
- PAI/Tools/*.ts
- skills/*/Tools/*.ts and skills/*/*/Tools/*.ts
- skills/*/Workflows/*.md and skills/*/*/Workflows/*.md
- skills/*/SKILL.md and skills/*/*/SKILL.md
- agents/*.md

For each file with a hardcoded message string (not a variable), verify:
1. The message contains at least one Cyrillic character (regex: /[а-яА-Я]/)
2. The message does NOT start with English words like 'Running', 'Loading', 'Starting', 'Checking'

Exclude: test files, comments (// lines), console.error, PAI-Install/

Place test in: hooks/tests/voice-messages-russian.test.ts$SUFFIX"

create_task "test-skill-triggers-russian" "Create a test that verifies all user-invocable PAI skills have Russian triggers in their USE WHEN clause.

For each SKILL.md in skills/ (top-level and one-level nested):
1. Read the YAML frontmatter
2. Check that 'description' field contains 'USE WHEN'
3. Check that 'description' field contains at least one Cyrillic word (Russian trigger)
4. Exception: skills with 'disable-model-invocation: true' may skip Russian triggers

Skills to check: Research, Thinking, ContentAnalysis, TFContent, YandexDirect, Media, Telos, Utilities, Investigation, Agents

Place test in: skills/tests/skill-triggers-russian.test.ts$SUFFIX"

create_task "test-update-tab-title-russian" "Create a test for UpdateTabTitle.hook.ts verifying the SYSTEM_PROMPT is in Russian.

Read hooks/UpdateTabTitle.hook.ts and verify:
1. SYSTEM_PROMPT variable contains Russian text (Cyrillic characters)
2. SYSTEM_PROMPT does NOT contain 'Create a 2-4 word' (old English version)
3. SYSTEM_PROMPT contains 'ПРАВИЛА' or 'Создай' (Russian instruction keywords)
4. Example section uses Russian examples ('Чиню', 'Проверяю', 'Обновляю')
5. The prompt instructs to respond in Russian ('русском' or 'РУССКОМ')

Place test in: hooks/tests/update-tab-title-russian.test.ts$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# HOOK SYSTEM INTEGRITY
# ═══════════════════════════════════════════════════════════════

create_task "test-stdin-sharing-fix" "Create a test that verifies settings.json has NO stdin sharing violations.

Read settings.json hooks configuration and verify:
1. For EVERY event type (UserPromptSubmit, SessionEnd, Stop, SubagentStart, SubagentStop, etc.)
2. Each entry in the event's array has MAXIMUM 1 hook in its 'hooks' array
3. This prevents stdin sharing where multiple hooks in one entry compete for stdin
4. PreToolUse and PostToolUse entries should also follow this pattern (each matcher entry has 1 hook)
5. Count total hooks configured and verify > 40 (system has ~50)

Place test in: hooks/tests/stdin-sharing.test.ts$SUFFIX"

create_task "test-hook-io-fast-path" "Create a test for hooks/lib/hook-io.ts verifying the fast path for voice completion.

Read hooks/lib/hook-io.ts and verify:
1. parseTranscriptFromInput() checks for input.last_assistant_message
2. If last_assistant_message exists, it calls extractVoiceCompletion() directly
3. The fast path returns a ParsedTranscript with voiceCompletion field
4. The slow path uses a 300ms delay (not 150ms — was increased from 150 to 300)
5. The function imports extractVoiceCompletion from TranscriptParser

Place test in: hooks/tests/hook-io-fast-path.test.ts$SUFFIX"

create_task "test-thehooksystem-accuracy" "Create a test that verifies THEHOOKSYSTEM.md documentation matches actual settings.json.

1. Read PAI/THEHOOKSYSTEM.md
2. Read settings.json hooks section
3. Count event types in settings.json — must be >= 15
4. Verify THEHOOKSYSTEM.md mentions all event types from settings.json
5. Verify the documented hook count mentions '34' or more hook files
6. Verify these event types are documented: ConfigChange, SubagentStart, SubagentStop, WorktreeCreate, WorktreeRemove, InstructionsLoaded, TeammateIdle, TaskCompleted

Place test in: hooks/tests/thehooksystem-accuracy.test.ts$SUFFIX"

# ═══════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════

echo -e "${CYAN}═══ Summary ═══${NC}"
echo -e "Задач: $COUNT | Создано: ${GREEN}$CREATED${NC} | Ошибок: ${RED}$FAILED${NC} | Пропущено: ${YELLOW}$SKIPPED${NC}"
