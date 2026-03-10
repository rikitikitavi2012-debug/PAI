#!/bin/bash
# telos-sync.test.sh — Tests for TELOS tab system data consistency and synchronization
# Requires MEMORY/STATE/telos-state.json to be generated

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

# --- Paths ---
REPO_ROOT="$(dirname "$0")/../../.."
STATE_FILE="$REPO_ROOT/MEMORY/STATE/telos-state.json"
RADAR_SCRIPT="$REPO_ROOT/config/kitty/scripts/telos-radar.sh"
NAVIGATOR_SCRIPT="$REPO_ROOT/config/kitty/scripts/telos-navigator.sh"
GOALS_MD="$REPO_ROOT/PAI/USER/TELOS/GOALS.md"
TELOS_PARSER="$REPO_ROOT/PAI/Tools/TelosParser.ts"

echo "Running TELOS Data Sync tests..."

# Ensure state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo "Generating state file for tests..."
    bun "$TELOS_PARSER"
fi

if [ ! -f "$STATE_FILE" ]; then
    echo "❌ Failed to find or generate telos-state.json"
    exit 1
fi

# ── 1. short_goal() consistency across scripts ──
echo -e "\n1. Label consistency (short_goal):"

# Extract G0-G13 mappings from both scripts
grep -E '[[:space:]]+G[0-9]+\).*"' "$RADAR_SCRIPT" | sed -E 's/.*(G[0-9]+\)).*"([^"]+)".*/\1 \2/' > /tmp/radar_goals.txt
grep -E 'G[0-9]+\).*s_short="[^"]+"' "$NAVIGATOR_SCRIPT" | sed -E 's/.*(G[0-9]+\)).*s_short="([^"]+)".*/\1 \2/' | tr -s ';' '\n' | grep -E '^G[0-9]+' > /tmp/nav_goals.txt

# The navigator has them on the same line, so parsing is a bit trickier
# Let's extract them properly by standardizing format
grep -o 'G[0-9]\+)[^"]*"[^"]*"' "$RADAR_SCRIPT" | sed 's/[^"]*"\(.*\)"/\1/' > /tmp/radar_vals.txt
grep -o 'G[0-9]\+)[^"]*"[^"]*"' "$NAVIGATOR_SCRIPT" | sed 's/[^"]*"\(.*\)"/\1/' > /tmp/nav_vals.txt

# Create standard mappings mapping G# to value
awk -F')' '{ gsub(/.*"/, "", $2); gsub(/".*/, "", $2); print $1, $2 }' /tmp/radar_vals.txt | sort -V > /tmp/radar_clean.txt
awk -F')' '{ gsub(/.*"/, "", $2); gsub(/".*/, "", $2); print $1, $2 }' /tmp/nav_vals.txt | sort -V > /tmp/nav_clean.txt

diff_output=$(diff /tmp/radar_clean.txt /tmp/nav_clean.txt)
if [ -z "$diff_output" ]; then
  assert "Labels in telos-radar.sh and telos-navigator.sh match exactly" 0
else
  assert "Labels in telos-radar.sh and telos-navigator.sh match exactly" 1
  echo "Diff:"
  echo "$diff_output"
fi

# Ensure all G0-G13 are present
for i in {0..13}; do
  grep -q "G${i})" /tmp/radar_goals.txt
  assert "Label for G${i} exists" $?
done

# ── 2. jq query validation ──
echo -e "\n2. jq query validation:"

# Extract and test dynamic jq queries from both scripts
jq_errors=0
while IFS= read -r jq_query; do
  # Run the query against state file to ensure it's valid syntax
  # We use jq -e (exit 0 on valid result/null, 4 on syntax err)
  eval "$jq_query \"\$STATE_FILE\"" >/dev/null 2>&1
  status=$?
  if [ $status -ne 0 ] && [ $status -ne 1 ]; then
    echo "  ❌ Failed query: $jq_query"
    jq_errors=$((jq_errors+1))
  fi
done < <(grep -ho -E "jq -[rce]* *'[^']*'" "$RADAR_SCRIPT" "$NAVIGATOR_SCRIPT" | sort -u)

assert "All extracted jq queries are syntactically valid" $jq_errors

# Check blockers format sanity check
# Every item in blockers should be an object with .blocker, .urgency, .next
invalid_blockers=$(jq -c '.status.blockers[] | select(type != "object" or has("blocker") == false)' "$STATE_FILE" 2>/dev/null)
if [ -z "$invalid_blockers" ]; then
  assert "All blockers are correctly formatted objects" 0
else
  assert "All blockers are correctly formatted objects" 1
  echo "Invalid blockers: $invalid_blockers"
fi

# ── 3. Cross-reference integrity ──
echo -e "\n3. Cross-reference integrity (Data Consistency):"

# Goal count matches ### G headers in GOALS.md
actual_md_count=$(grep -E '^### G[0-9]+:' "$GOALS_MD" | wc -l)
json_goal_count=$(jq '.goals | length' "$STATE_FILE")
if [ "$actual_md_count" -eq "$json_goal_count" ]; then
  assert "JSON goals count ($json_goal_count) matches GOALS.md count ($actual_md_count)" 0
else
  assert "JSON goals count matches GOALS.md count" 1
fi

# Project progress sanity (No 'LIVE' or 'Активна' project should have progress=0 if there are checkboxes)
# Note: It's possible for an active project to have 0 progress if 0 checkboxes are checked,
# but the bug was that a project had 27 completed items and still showed 0 progress.
# Let's ensure no project with checked > 0 has 0 progress.
bad_projects=$(jq -c '.projects[] | select(.checked > 0 and .progress == 0)' "$STATE_FILE")
if [ -z "$bad_projects" ]; then
  assert "Project progress calculation is sane (no 0 progress if checked > 0)" 0
else
  assert "Project progress calculation is sane" 1
  echo "Bad projects: $bad_projects"
fi

# Mission↔Goal bidirectional check via jq
# For every goal, its missions must include it in linkedGoals
bad_mission_link=$(jq -c '. as $root | .goals[] | .id as $gid | .missions[] as $mid | $root.missions[] | select(.id == $mid) | select(.linkedGoals | index($gid) | not)' "$STATE_FILE")
if [ -z "$bad_mission_link" ]; then
  assert "Goals accurately map to Missions (Bidirectional)" 0
else
  assert "Goals accurately map to Missions (Bidirectional)" 1
  echo "Missing links: $bad_mission_link"
fi

# Strategy↔Challenge bidirectional check
# If S addresses C, C must list S in linkedStrategies.
# Wait, this is derived from markdown. Since the markdown determines this mapping, we can check
# if the parser accurately extracted both. Our markdown files should have this mapping.
bad_strat_link=$(jq -c '. as $root | .strategies[] | .id as $sid | .addresses[] | select(startswith("C")) as $cid | $root.challenges[] | select(.id == $cid) | select(.linkedStrategies | index($sid) | not)' "$STATE_FILE")
if [ -z "$bad_strat_link" ]; then
  assert "Strategies correctly address Challenges (Bidirectional)" 0
else
  assert "Strategies correctly address Challenges (Bidirectional)" 1
  # Might be acceptable if markdown is not perfectly bidirectional, but we'll flag it
  echo "Warning: Some strategies address challenges that don't link back. See: $bad_strat_link"
fi

# ── 4. Navigator dynamic counts ──
echo -e "\n4. Navigator script validation:"
# Verify navigator uses dynamic counts for help text (i.e. doesn't hardcode numbers)
grep -q 'length' "$NAVIGATOR_SCRIPT"
assert "Navigator script reads arrays sizes dynamically (length)" $?
grep -q 'STATE_FILE' "$NAVIGATOR_SCRIPT"
assert "Navigator script reads from STATE_FILE" $?

# ── Summary ──
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ $PASS passed  ❌ $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit "$FAIL"
