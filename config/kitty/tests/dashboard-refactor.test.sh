#!/bin/bash
# PAI Dashboard Refactor Test Suite
# Runs simple bash assertions on the modified dashboard scripts

# Path setup
TEST_DIR=$(dirname "$(readlink -f "$0")")
SCRIPT_DIR="$(dirname "$TEST_DIR")/scripts"

# Source ui.sh for shared colors (RST, GRN, RED)
export PAI_UI_WIDTH=96
# shellcheck disable=SC1091
. "$SCRIPT_DIR/lib/ui.sh"

# Initialize test counters
tests_run=0
tests_passed=0

# Assertion helper
assert() {
  local test_name="$1"
  local condition="$2"

  ((tests_run++))
  if eval "$condition"; then
    echo -e "${GRN}PASS${RST}: $test_name"
    ((tests_passed++))
  else
    echo -e "${RED}FAIL${RST}: $test_name"
    return 1
  fi
}

echo "=== Running PAI Dashboard Refactor Tests ==="

# 1. bash -n syntax validation
for script in "$SCRIPT_DIR"/command-center.sh "$SCRIPT_DIR"/brigade-watch.sh "$SCRIPT_DIR"/strategic-dashboard.sh "$SCRIPT_DIR"/telemetry-dashboard.sh; do
  assert "Syntax check $(basename "$script")" "bash -n '$script'"
done

# 2. lib/ui.sh is sourced correctly
for script in "$SCRIPT_DIR"/command-center.sh "$SCRIPT_DIR"/brigade-watch.sh "$SCRIPT_DIR"/strategic-dashboard.sh "$SCRIPT_DIR"/telemetry-dashboard.sh; do
  assert "$(basename "$script") sources lib/ui.sh" "grep -q 'lib/ui.sh' '$script'"
done

# 3. Float comparison safety
assert "telemetry-dashboard.sh truncates floats for comparison" "grep -q 'M_ERR_RATE_5M=\"\${M_ERR_RATE_5M%%.*}\"' '$SCRIPT_DIR/telemetry-dashboard.sh'"

# 4. brigade-watch.sh: verify 7 brigade members
assert "brigade-watch.sh contains Navi" "grep -q -i 'Navi' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains A0" "grep -q -i 'A0' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains Jules" "grep -q -i 'Jules' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains OpenCode" "grep -q -i 'OpenCode' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains Gemini" "grep -q -i 'Gemini' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains Voice" "grep -q -i 'Voice' '$SCRIPT_DIR/brigade-watch.sh'"
assert "brigade-watch.sh contains Z.AI" "grep -q -i 'Z.AI' '$SCRIPT_DIR/brigade-watch.sh'"

# 5. command-center.sh: verify brigade_total=5 and traffic-light logic
assert "command-center.sh has brigade_total=5" "grep -q 'brigade_total=5' '$SCRIPT_DIR/command-center.sh'"
assert "command-center.sh has traffic-light logic (brigade_up -eq brigade_total)" "grep -q '\"\$brigade_up\" -eq \"\$brigade_total\"' '$SCRIPT_DIR/command-center.sh'"

# 6. strategic-dashboard.sh: verify Anthropic reads from cost-budget.json
assert "strategic-dashboard.sh reads from cost-budget.json" "grep -q 'cost-budget.json' '$SCRIPT_DIR/strategic-dashboard.sh'"
assert "strategic-dashboard.sh reads Anthropic API usage" "grep -q 'Anthropic API' '$SCRIPT_DIR/strategic-dashboard.sh'"

# Summary
echo "-----------------------------------"
echo "Tests run: $tests_run"
echo "Tests passed: $tests_passed"

if [ "$tests_run" -eq "$tests_passed" ]; then
  echo -e "${GRN}ALL TESTS PASSED${RST}"
  exit 0
else
  echo -e "${RED}SOME TESTS FAILED${RST}"
  exit 1
fi
