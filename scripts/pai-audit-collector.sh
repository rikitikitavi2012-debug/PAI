#!/usr/bin/env bash
# PAI Infrastructure Audit — File Collector
# Gathers PAI files, bundles by tier, outputs to /tmp/pai-audit/
# Usage: ./scripts/pai-audit-collector.sh [--days N] [--dry-run]
#
# Reads manifest from PAI/config/audit-manifest.yaml
# Max file size: 2.5MB (~450K words) to stay under NLM's 500K word limit

set -uo pipefail

PAI_ROOT="${HOME}/.claude"
OUTPUT_DIR="/tmp/pai-audit"
FAILURES_DAYS=90
DRY_RUN=false
MAX_BUNDLE_BYTES=$((2500000))  # 2.5MB

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --days) FAILURES_DAYS="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

echo "═══ PAI Audit Collector ═══════════════════"
echo "Root: $PAI_ROOT"
echo "Output: $OUTPUT_DIR"
echo "Failures window: ${FAILURES_DAYS} days"
echo ""

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

FILE_COUNT=0
TOTAL_BYTES=0

# --- Helper: add file to output ---
add_file() {
    local src="$1"
    local dst_name="${2:-$(basename "$src")}"

    if [[ ! -f "$src" ]]; then
        echo "  SKIP (not found): $src"
        return
    fi

    local size
    size=$(wc -c < "$src")

    if [[ $size -gt $MAX_BUNDLE_BYTES ]]; then
        echo "  WARN (oversized ${size}B): $src — splitting needed"
        # Split into chunks
        local chunk=1
        local base="${dst_name%.md}"
        split -b $MAX_BUNDLE_BYTES "$src" "${OUTPUT_DIR}/${base}-part"
        for part in "${OUTPUT_DIR}/${base}-part"*; do
            mv "$part" "${part}.md"
            echo "  ADD: ${base}-part${chunk}.md ($(wc -c < "${part}.md")B)"
            ((FILE_COUNT++))
            ((chunk++))
        done
        return
    fi

    cp "$src" "${OUTPUT_DIR}/${dst_name}"
    echo "  ADD: $dst_name (${size}B)"
    ((FILE_COUNT++))
    TOTAL_BYTES=$((TOTAL_BYTES + size))
}

# --- Helper: combine files matching glob ---
combine_glob() {
    local pattern="$1"
    local output="$2"
    local header="$3"
    local recent_days="${4:-0}"

    local outpath="${OUTPUT_DIR}/${output}"
    echo "$header" > "$outpath"
    echo "" >> "$outpath"

    local count=0
    local find_args=()

    if [[ $recent_days -gt 0 ]]; then
        find_args=(-mtime "-${recent_days}")
    fi

    # Use find for recursive patterns, ls for simple globs
    while IFS= read -r -d '' f; do
        local relpath="${f#${PAI_ROOT}/}"
        echo "---" >> "$outpath"
        echo "## ${relpath}" >> "$outpath"
        echo "" >> "$outpath"
        cat "$f" >> "$outpath"
        echo "" >> "$outpath"
        ((count++))
    done < <(find "${PAI_ROOT}" -path "${PAI_ROOT}/${pattern}" -type f "${find_args[@]}" -print0 2>/dev/null | sort -z)

    local size
    size=$(wc -c < "$outpath")

    if [[ $size -gt $MAX_BUNDLE_BYTES ]]; then
        echo "  WARN: ${output} oversized (${size}B / ${count} files) — splitting"
        # Split into parts
        local base="${output%.md}"
        cd "$OUTPUT_DIR"
        split -b $MAX_BUNDLE_BYTES "$output" "${base}-part"
        rm "$output"
        for part in ${base}-part*; do
            mv "$part" "${part}.md"
            echo "  ADD: ${part}.md"
            ((FILE_COUNT++))
        done
        cd - > /dev/null
    else
        echo "  ADD: ${output} (${size}B / ${count} files)"
        ((FILE_COUNT++))
        TOTAL_BYTES=$((TOTAL_BYTES + size))
    fi
}

# ═══ TIER 1: Core System ═══
echo "📦 Tier 1: Core System"
for f in CLAUDE.md PAI/Algorithm/v4.0.0.md PAI/BRIGADE.md PAI/SKILLSYSTEM.md \
         PAI/THEHOOKSYSTEM.md PAI/THENOTIFICATIONSYSTEM.md PAI/CLIFIRSTARCHITECTURE.md; do
    add_file "${PAI_ROOT}/${f}"
done
# Steering Rules with distinct names to avoid collision
add_file "${PAI_ROOT}/PAI/AISTEERINGRULES.md" "AISTEERINGRULES-SYSTEM.md"
add_file "${PAI_ROOT}/PAI/USER/AISTEERINGRULES.md" "AISTEERINGRULES-USER.md"
echo ""

# ═══ TIER 2: Memory & Learning ═══
echo "📦 Tier 2: Memory & Learning"
add_file "${PAI_ROOT}/MEMORY/MEMORY.md"

# Individual memory files
for f in "${PAI_ROOT}"/MEMORY/reference_*.md "${PAI_ROOT}"/MEMORY/feedback_*.md \
         "${PAI_ROOT}"/MEMORY/project_*.md; do
    [[ -f "$f" ]] && add_file "$f"
done

# Combined wisdom frames
combine_glob "MEMORY/WISDOM/FRAMES/*.md" "wisdom-frames-combined.md" \
    "# PAI Wisdom Frames (Combined for Audit)"

# Combined failures (recent N days)
combine_glob "MEMORY/LEARNING/FAILURES/*/CONTEXT.md" "failures-combined.md" \
    "# PAI Learning Failures (Last ${FAILURES_DAYS} days)" "$FAILURES_DAYS"
echo ""

# ═══ TIER 3: Skills ═══
echo "📦 Tier 3: Skills Architecture"
add_file "${PAI_ROOT}/skills/skill-index.json"
combine_glob "skills/*/SKILL.md" "skills-combined.md" \
    "# PAI Skills (All SKILL.md files combined)"
echo ""

# ═══ TIER 4: Hooks ═══
echo "📦 Tier 4: Hooks"
combine_glob "hooks/*.ts" "hooks-combined.ts" \
    "// PAI Hooks (Combined for Audit)"
echo ""

# ═══ TIER 5: Integrations ═══
echo "📦 Tier 5: Integration Tools"
combine_glob "PAI/Tools/*.ts" "tools-combined.ts" \
    "// PAI Tools (Combined for Audit)"
echo ""

# ═══ Summary ═══
echo "═══════════════════════════════════════════"
echo "Files: ${FILE_COUNT}"
echo "Total: $((TOTAL_BYTES / 1024))KB"
echo "Output: ${OUTPUT_DIR}/"
echo ""

if $DRY_RUN; then
    echo "DRY RUN — no upload"
    ls -la "$OUTPUT_DIR/"
else
    echo "Ready for upload. Run:"
    echo "  notebooklm create 'PAI Audit $(date +%Y-%m)'"
    echo "  for f in ${OUTPUT_DIR}/*; do notebooklm source add \"\$f\"; done"
fi
