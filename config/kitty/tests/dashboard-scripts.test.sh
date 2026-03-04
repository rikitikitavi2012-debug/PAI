#!/bin/bash
# dashboard-scripts.test.sh — Tests for PAI Kitty dashboard scripts
# Post lib/ui.sh migration: scripts source shared library, not inline helpers

PASS=0
FAIL=0

assert() {
  local desc="$1" result="$2"
  if [ "$result" = "0" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc"
    FAIL=$((FAIL+1))
  fi
}

assert_not() {
  local desc="$1" result="$2"
  if [ "$result" != "0" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc"
    FAIL=$((FAIL+1))
  fi
}

SCRIPTS_DIR="$(dirname "$0")/../scripts"
LIB="$SCRIPTS_DIR/lib/ui.sh"

echo "Running Kitty dashboard script tests..."

# ── 1. Syntax validation ──
echo -e "\n1. Syntax validation:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh events-tail.sh a0-chat-tail.sh; do
  target="$SCRIPTS_DIR/$script"
  if [ ! -f "$target" ]; then
    assert "$script exists" 1
    continue
  fi
  bash -n "$target" 2>/dev/null
  assert "$script valid syntax" $?
  head -n 1 "$target" | grep -q "^#!/bin/bash"
  assert "$script has bash shebang" $?
done

# ── 2. Shared library exists and is valid ──
echo -e "\n2. Shared library (lib/ui.sh):"
[ -f "$LIB" ]
assert "lib/ui.sh exists" $?
bash -n "$LIB" 2>/dev/null
assert "lib/ui.sh valid syntax" $?

# Verify lib exports required functions
for fn in box_top box_bot box_sep box_line two_col two_col_top two_col_mid two_col_bot hline vwidth progress_bar section_header badge_active badge_done badge_fail tab_ok tab_warn tab_crit tab_reset set_tab_state spin_start spin_stop; do
  grep -q "^${fn}()" "$LIB"
  assert "lib/ui.sh defines $fn" $?
done

# Verify lib defines canonical PAI color palette
for color in RST BLD DIM GRN RED YLW CYN SLT SEP VIO WHT ORG BLU; do
  grep -q "^${color}=" "$LIB"
  assert "lib/ui.sh defines $color" $?
done

grep -q "PAI_UI_WIDTH" "$LIB"
assert "lib/ui.sh defines PAI_UI_WIDTH" $?

# ── 3. Scripts source lib/ui.sh (no inline duplicates) ──
echo -e "\n3. Scripts source lib/ui.sh:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh; do
  target="$SCRIPTS_DIR/$script"
  grep -q 'lib/ui.sh' "$target"
  assert "$script sources lib/ui.sh" $?

  # Should NOT define box_top inline (comes from lib)
  grep -q "^box_top()" "$target"
  assert_not "$script no inline box_top (from lib)" $?

  # Should NOT define hline inline
  grep -q "^hline()" "$target"
  assert_not "$script no inline hline (from lib)" $?
done

# ── 4. Flicker-free refresh ──
echo -e "\n4. Flicker-free refresh:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh; do
  target="$SCRIPTS_DIR/$script"
  grep -q 'FIRST_RENDER' "$target"
  assert "$script uses FIRST_RENDER flag" $?

  grep -q '\\033\[H' "$target"
  assert "$script uses cursor-home escape" $?

  # Should NOT use 'clear' command
  grep -qw "^  clear$" "$target"
  assert_not "$script no 'clear' command" $?
done

# ── 5. poll() function exists ──
echo -e "\n5. Core functions:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh; do
  target="$SCRIPTS_DIR/$script"
  grep -q "^poll()" "$target"
  assert "$script has poll() function" $?
done

# ── 6. Section structure (command-center.sh) ──
echo -e "\n6. Section structure (command-center.sh):"
target="$SCRIPTS_DIR/command-center.sh"
grep -q "COMMAND CENTER" "$target"
assert "Contains COMMAND CENTER header" $?
grep -q "СИСТЕМА" "$target"
assert "Contains СИСТЕМА section" $?
grep -q "БРИГАДА" "$target"
assert "Contains БРИГАДА section" $?
grep -q "АКТИВНЫЕ СЕССИИ" "$target"
assert "Contains АКТИВНЫЕ СЕССИИ section" $?
grep -q "PULL REQUESTS" "$target"
assert "Contains PULL REQUESTS section" $?
grep -q "ХУКИ & ТЕСТЫ" "$target"
assert "Contains ХУКИ & ТЕСТЫ section" $?
grep -q "АВТОМЕРЖ" "$target"
assert "Contains АВТОМЕРЖ section" $?

# Should NOT duplicate Telos content
grep -q "АКТИВНЫЕ ЦЕЛИ" "$target"
assert_not "No АКТИВНЫЕ ЦЕЛИ (Telos-only)" $?
grep -q "ПОБЕДЫ" "$target"
assert_not "No ПОБЕДЫ (Telos-only)" $?
grep -q "БЛОКЕРЫ" "$target"
assert_not "No БЛОКЕРЫ (Telos-only)" $?

# ── 7. Section structure (telos-dashboard.sh) ──
echo -e "\n7. Section structure (telos-dashboard.sh):"
target="$SCRIPTS_DIR/telos-dashboard.sh"
grep -q "TELOS RADAR" "$target"
assert "Contains TELOS RADAR header" $?
grep -q "LEVEL 1" "$target"
assert "Contains LEVEL 1 (Actionable)" $?
grep -q "LEVEL 2" "$target"
assert "Contains LEVEL 2 (Progress)" $?
grep -q "LEVEL 3" "$target"
assert "Contains LEVEL 3 (Challenges)" $?
grep -q "LEVEL 4" "$target"
assert "Contains LEVEL 4 (Wins)" $?
grep -q "LEVEL 5" "$target"
assert "Contains LEVEL 5 (Compass)" $?

# ── 8. Data source validation ──
echo -e "\n8. Data source validation:"
target="$SCRIPTS_DIR/command-center.sh"
grep -q "WORK_DIR" "$target"
assert "command-center references WORK_DIR" $?
grep -q "AUTOMERGE_JSON" "$target"
assert "command-center references AUTOMERGE_JSON" $?
grep -q "jules_pr_json" "$target"
assert "command-center caches jules PR data" $?

target="$SCRIPTS_DIR/telos-dashboard.sh"
grep -q "telos-state.json" "$target"
assert "telos-dashboard references telos-state.json" $?
grep -q "TelosParser" "$target"
assert "telos-dashboard references TelosParser" $?

target="$SCRIPTS_DIR/brigade-watch.sh"
grep -q "A0_HEALTH_URL" "$target"
assert "brigade-watch references A0 health" $?
grep -q "JAM_STATE" "$target"
assert "brigade-watch references AutoMerge state" $?
grep -q "JulesAPI" "$target"
assert "brigade-watch references JulesAPI" $?

# ── 9. Pulse indicator ──
echo -e "\n9. Pulse indicator:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh; do
  target="$SCRIPTS_DIR/$script"
  grep -q 'pulse' "$target"
  assert "$script has pulse indicator" $?
done

# ── 10. Dynamic tab colors ──
echo -e "\n10. Dynamic tab colors:"
for script in command-center.sh telos-dashboard.sh brigade-watch.sh; do
  target="$SCRIPTS_DIR/$script"
  grep -q "tab_ok\|tab_warn\|tab_crit" "$target"
  assert "$script uses dynamic tab colors" $?
done

# ── Summary ──
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ $PASS passed  ❌ $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit "$FAIL"
