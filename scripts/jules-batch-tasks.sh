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
#   3. Review + merge: gh pr merge N --squash
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

# Аргументы
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --count)
      # Подсчёт задач — grep create_task вызовы (не закомментированные)
      count=$(grep -c '^create_task ' "$0" 2>/dev/null || echo 0)
      echo "Задач в скрипте: $count"
      exit 0
      ;;
  esac
done

# Цвета
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

  # Пауза между задачами — Jules rate limiting
  sleep 2
}

echo -e "${CYAN}═══ Jules Batch Tasks — PAI ($REPO @ $BRANCH) ═══${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# СТАНДАРТНЫЙ СУФФИКС
# ═══════════════════════════════════════════════════════════════

SUFFIX="

Code and comments in English. PR title in English (conventional commits: test: ...).
PR description in English. Use bun:test for all tests.
Test file location: follow existing patterns in the repo.
Run 'bun test' to verify before submitting PR."

# ═══════════════════════════════════════════════════════════════
# TASKS
# ═══════════════════════════════════════════════════════════════

# ── LearnGate Hook Tests (3) ──

create_task "test: LearnGate — block without LEARN.md" \
  "Write tests for hooks/LearnGate.hook.ts.

File: hooks/tests/LearnGate.test.ts

Test scenarios:
1. Edit PRD.md with phase:complete and NO LEARN.md → returns {decision:'block'}
2. Edit PRD.md with phase:complete and LEARN.md exists → returns {continue:true}
3. Edit non-PRD file with phase:complete → returns {continue:true}
4. Write PRD.md with phase:complete in frontmatter and no LEARN.md → returns {decision:'block'}

Use temporary directories (mkdtempSync) for test PRD files.
See hooks/tests/AlgorithmTracker.test.ts for hook testing patterns in this repo.
The hook reads from stdin (readFileSync(0)) — mock by spawning subprocess with piped input.$SUFFIX"

create_task "test: LearnGate — false positive prevention" \
  "Write tests for hooks/LearnGate.hook.ts false positive edge cases.

File: hooks/tests/LearnGate-edge-cases.test.ts

Test scenarios:
1. Edit PRD.md criteria text mentioning 'phase: complete' (old_string does NOT start with 'phase:') → returns {continue:true} (NOT blocked)
2. Edit PRD.md with old_string='phase: execute' new_string='phase: verify' → returns {continue:true}
3. Edit PRD.md with old_string='phase: learn' new_string='phase: complete' and LEARN.md is empty (0 bytes) → returns {continue:true} (existence check only, not size)
4. Write PRD.md with no frontmatter at all → returns {continue:true}
5. Empty stdin → returns {continue:true}

Use mkdtempSync for temp dirs. Pipe JSON to subprocess stdin.$SUFFIX"

create_task "test: LearnGate — parseFrontmatter integration" \
  "Write tests verifying LearnGate.hook.ts correctly uses parseFrontmatter from hooks/lib/prd-utils.ts.

File: hooks/tests/LearnGate-frontmatter.test.ts

Test scenarios:
1. Write tool with valid frontmatter containing 'phase: complete' → correctly parsed and blocked
2. Write tool with frontmatter containing 'phase: Complete' (mixed case) → correctly parsed and blocked
3. Write tool with phase in body but NOT in frontmatter → NOT blocked
4. Write tool with multiple '---' separators (frontmatter + content with horizontal rules) → only checks first frontmatter block

Read hooks/lib/prd-utils.ts to understand parseFrontmatter behavior.$SUFFIX"

# ── Algorithm v4.0-alpha Tests (4) ──

create_task "test: Algorithm voice phrases are Russian" \
  "Write a test verifying all Algorithm v4.0-alpha.md voice phrases use Russian.

File: PAI/Algorithm/tests/test-voice-language.ts

Read PAI/Algorithm/v4.0-alpha.md. Find all Voice announce instructions.
Verify:
1. No 'Entering the' phrases remain (English)
2. All voice phrases contain Cyrillic characters (Russian)
3. Algorithm entry message is 'Вхожу в Алгоритм'
4. Each of 7 phases has a Russian voice phrase
5. Cross-reference with PAI/config/algorithm-phases.yaml russian values

Use bun:test.$SUFFIX"

create_task "test: LEARN phase mandatory persistence" \
  "Write a test verifying Algorithm v4.0-alpha.md LEARN phase has mandatory LEARN.md creation.

File: PAI/Algorithm/tests/test-learn-persistence.ts

Read PAI/Algorithm/v4.0-alpha.md LEARN section. Verify:
1. Contains 'PERSIST LEARNINGS (MANDATORY'
2. Contains 'enforced by LearnGate hook'
3. LEARN.md template has 3 sections: Reflections, Patterns, Actions
4. Contains 'before setting phase: complete'
5. Standard tier guidance exists ('5-10 lines')
6. Extended+ tier guidance exists ('specific evidence')
7. 'phase: complete' instruction comes AFTER LEARN.md instruction

Use bun:test. Read the actual file, parse with regex.$SUFFIX"

create_task "test: Cycle Selector search space heuristic" \
  "Write tests for the Cycle Selector routing logic in PAI/Algorithm/v4.0-alpha.md.

File: PAI/Algorithm/tests/test-cycle-selector-heuristic.ts

Read v4.0-alpha.md Cycle Selector section. Verify documented routing rules:
1. Standard tier → always Standard EXECUTE
2. Extended+ all [B] → Standard EXECUTE
3. Extended+ with [Q] and <3 approaches → Standard
4. Extended+ with [Q] and 3+ approaches → Autoresearch
5. Mixed [B]+[Q] → Hybrid (Standard for [B], then per-[Q] heuristic)
6. Human override syntax 'execute_mode:' documented
7. Rules are evaluated in order (first match wins)

Parse the markdown table and rules text.$SUFFIX"

create_task "test: Algorithm ISC Count Gate enforcement" \
  "Write tests for ISC Count Gate in PAI/Algorithm/v4.0-alpha.md.

File: PAI/Algorithm/tests/test-isc-count-gate.ts

Read v4.0-alpha.md ISC COUNT GATE section. Verify:
1. Gate exists between OBSERVE output and THINK phase
2. Floor values: Standard=8, Extended=16, Advanced=24, Deep=40, Comprehensive=64
3. Instruction 'DO NOT proceed' if below floor
4. Splitting Test referenced as decomposition method
5. Gate marked as MANDATORY
6. The table has all 5 effort tiers

Parse the table from markdown.$SUFFIX"

# ── Existing Hooks + New Algorithm Integration (4) ──

create_task "test: AlgorithmTracker detects Russian voice curls" \
  "Write tests verifying AlgorithmTracker.hook.ts correctly detects Russian voice phrases.

File: hooks/tests/AlgorithmTracker-russian.test.ts

The Algorithm now uses Russian voice phrases ('Вхожу в фазу наблюдения' instead of 'Entering the Observe phase'). AlgorithmTracker detects phases from voice curl commands.

Test scenarios:
1. Bash curl with 'Вхожу в фазу наблюдения' → detects OBSERVE phase
2. Bash curl with 'Вхожу в фазу мышления' → detects THINK phase
3. Bash curl with 'Вхожу в фазу обучения' → detects LEARN phase
4. Bash curl with 'Вхожу в Алгоритм' → detects algorithm entry
5. All 7 phases detected via Russian phrases from PAI/config/algorithm-phases.yaml

Read hooks/AlgorithmTracker.hook.ts and PAI/config/algorithm-phases.yaml.
See hooks/tests/AlgorithmTracker.test.ts for existing test patterns.$SUFFIX"

create_task "test: PRDSync handles phase:complete correctly" \
  "Write tests verifying PRDSync.hook.ts syncs phase:complete to work.json.

File: hooks/tests/PRDSync-complete.test.ts

Test scenarios:
1. Edit PRD.md to phase:complete → work.json updated with phase='complete'
2. Phase change from learn→complete triggers tab color update
3. Phase 'COMPLETE' is in the VALID_PHASES set
4. Change detection: same phase twice doesn't re-sync (hasChanges=false)

Read hooks/PRDSync.hook.ts and hooks/lib/prd-utils.ts.
Use temp directories for test data.$SUFFIX"

create_task "test: SecurityValidator patterns.yaml regex validity" \
  "Write tests verifying all regex patterns in PAI/USER/PAISECURITYSYSTEM/patterns.yaml are valid JavaScript RegExp.

File: hooks/tests/SecurityValidator-patterns.test.ts

Read PAI/USER/PAISECURITYSYSTEM/patterns.yaml. Parse all 'pattern:' values.
Test scenarios:
1. Every pattern compiles as new RegExp(pattern, 'i') without throwing
2. No patterns use PCRE-only syntax: (?i), (?P<name>), (?<=...) in unsupported engines
3. Bash blocked patterns match their documented examples
4. File path patterns with globs expand correctly

This test prevents regressions like the (?i) bug that caused PreToolUse errors.$SUFFIX"

create_task "test: WorkCompletionLearning coexists with LearnGate" \
  "Write tests verifying WorkCompletionLearning.hook.ts (SessionEnd) and LearnGate.hook.ts (PreToolUse) don't conflict.

File: hooks/tests/WorkCompletionLearning-LearnGate.test.ts

Test scenarios:
1. WorkCompletionLearning writes to MEMORY/LEARNING/ (its own directory)
2. LearnGate checks for LEARN.md in MEMORY/WORK/{slug}/ (different directory)
3. Both can fire in same session without conflict
4. WorkCompletionLearning output format is different from LEARN.md template

Read both hooks to understand their responsibilities and output locations.$SUFFIX"

# ── System Hardening Tests (4) ──

create_task "test: prd-utils parseFrontmatter edge cases" \
  "Write tests for parseFrontmatter() in hooks/lib/prd-utils.ts.

File: hooks/tests/prd-utils-frontmatter.test.ts

Test scenarios:
1. Valid frontmatter with all 8 standard fields → correctly parsed
2. Frontmatter with extra whitespace around ':' → correctly parsed
3. Frontmatter with quoted values ('phase: \"complete\"') → quotes stripped
4. No frontmatter (no '---' markers) → returns null
5. Empty frontmatter ('---\n---') → returns empty object
6. Frontmatter with multiline values → handles gracefully
7. Content with '---' horizontal rules after frontmatter → only first block parsed
8. parseCriteriaList: correctly counts checked vs unchecked checkboxes

Read hooks/lib/prd-utils.ts for function signatures.$SUFFIX"

create_task "test: Algorithm phases config consistency" \
  "Write tests verifying PAI/config/algorithm-phases.yaml is consistent with Algorithm v4.0-alpha.md.

File: PAI/Algorithm/tests/test-phases-config.ts

Test scenarios:
1. Every phase in yaml has both english and russian fields
2. Every phase in yaml has an emoji
3. All phases from v4.0-alpha.md are present in yaml (OBSERVE, THINK, PLAN, CYCLE SELECTOR, BUILD, EXECUTE, VERIFY, LEARN)
4. algorithm_entry field exists and is non-empty
5. Russian phrases in yaml match the voice phrases in v4.0-alpha.md
6. No duplicate phases

Read both files and cross-reference.$SUFFIX"

create_task "test: LEARN.md measurement script" \
  "Write tests for the LEARN persistence measurement script.

File: hooks/tests/learn-measurement.test.ts

The script is at MEMORY/WORK/20260315-230000_learn-phase-persistence/measure-learn-rate.sh.

Test scenarios:
1. Script exits with code 0
2. Script correctly counts completed PRDs (grep 'phase: complete')
3. Script correctly detects LEARN.md siblings
4. Script output contains 'Completed sessions:', 'With LEARN.md:', 'Rate:'
5. Rate calculation is correct (use temp dir with known PRDs)
6. Script lists missing sessions (recent 10)

Create temp MEMORY/WORK structure with mix of PRDs with/without LEARN.md.$SUFFIX"

create_task "test: settings.json hook registration integrity" \
  "Write tests verifying all hooks referenced in settings.json actually exist on disk.

File: hooks/tests/settings-integrity.test.ts

Read settings.json. For every hook command in hooks.PreToolUse, hooks.PostToolUse, hooks.SessionEnd, hooks.SessionStart, hooks.Stop, hooks.UserPromptSubmit, hooks.PreCompact, hooks.ConfigChange, hooks.WorktreeCreate, hooks.WorktreeRemove, hooks.SubagentStart, hooks.SubagentStop, hooks.TaskCompleted, hooks.InstructionsLoaded, hooks.TeammateIdle:

1. Extract all hook file paths (expand \${PAI_DIR} to process.env.PAI_DIR or ~/.claude)
2. Verify each file exists on disk (existsSync)
3. Verify each file is executable or has shebang
4. Count total registered hooks = should match settings.json counts.hooks value
5. No duplicate hook registrations (same file on same matcher)

This prevents broken references after hook renames/deletes.$SUFFIX"

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
