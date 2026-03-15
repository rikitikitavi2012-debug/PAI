#!/usr/bin/env bash
# Measure LEARN persistence rate across completed Algorithm sessions
# Usage: bash measure-learn-rate.sh

WORK_DIR="${PAI_DIR:-$HOME/.claude}/MEMORY/WORK"

# Count completed PRDs (phase: complete)
completed=$(grep -rl 'phase: complete' "$WORK_DIR"/*/PRD.md 2>/dev/null | wc -l)

# Count PRDs that have a LEARN.md sibling
with_learn=0
for prd in $(grep -rl 'phase: complete' "$WORK_DIR"/*/PRD.md 2>/dev/null); do
  dir=$(dirname "$prd")
  if [ -f "$dir/LEARN.md" ]; then
    with_learn=$((with_learn + 1))
  fi
done

if [ "$completed" -eq 0 ]; then
  echo "No completed Algorithm sessions found."
  exit 0
fi

rate=$(awk "BEGIN { printf \"%.1f\", $with_learn * 100 / $completed }")

echo "=== LEARN Persistence Rate ==="
echo "Completed sessions: $completed"
echo "With LEARN.md:      $with_learn"
echo "Rate:               ${rate}%"
echo "Target:             90%+"
echo ""

# List recent sessions without LEARN.md (last 10)
echo "=== Recent sessions missing LEARN.md ==="
count=0
for prd in $(ls -t "$WORK_DIR"/*/PRD.md 2>/dev/null); do
  dir=$(dirname "$prd")
  if grep -q 'phase: complete' "$prd" 2>/dev/null && [ ! -f "$dir/LEARN.md" ]; then
    slug=$(basename "$dir")
    echo "  - $slug"
    count=$((count + 1))
    [ $count -ge 10 ] && break
  fi
done
[ $count -eq 0 ] && echo "  (none — all have LEARN.md)"
exit 0
