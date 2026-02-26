#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Transcript Rotation — Clean up old Claude Code session transcripts
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   bash TranscriptRotation.sh [--dry-run] [--keep-days N] [--compress-days N]
#
# Defaults:
#   --keep-days 90      Delete transcripts older than 90 days
#   --compress-days 30  Compress (gzip) transcripts older than 30 days
#   --dry-run           Show what would be done without doing it
#
# Targets: ~/.claude/projects/**/*.jsonl
#          ~/.claude/MEMORY/LEARNING/FAILURES/**/*.jsonl
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Defaults
DRY_RUN=false
KEEP_DAYS=90
COMPRESS_DAYS=30
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
PROJECTS_DIR="$PAI_DIR/projects"
FAILURES_DIR="$PAI_DIR/MEMORY/LEARNING/FAILURES"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)     DRY_RUN=true; shift ;;
        --keep-days)   KEEP_DAYS="$2"; shift 2 ;;
        --compress-days) COMPRESS_DAYS="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: TranscriptRotation.sh [--dry-run] [--keep-days N] [--compress-days N]"
            echo "  --dry-run          Show what would be done (default: false)"
            echo "  --keep-days N      Delete transcripts older than N days (default: 90)"
            echo "  --compress-days N  Compress transcripts older than N days (default: 30)"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Stats
deleted_count=0
deleted_bytes=0
compressed_count=0
compressed_bytes_saved=0
skipped_count=0

echo "═══ Transcript Rotation ═══"
echo "  Keep:     last ${KEEP_DAYS} days"
echo "  Compress: older than ${COMPRESS_DAYS} days"
echo "  Dry run:  ${DRY_RUN}"
echo ""

# Process a single directory of JSONL files
process_dir() {
    local dir="$1"
    local label="$2"

    [ -d "$dir" ] || return 0

    local dir_deleted=0
    local dir_compressed=0

    while IFS= read -r -d '' file; do
        local file_age_days=$(( ($(date +%s) - $(stat -c %Y "$file" 2>/dev/null || echo 0)) / 86400 ))
        local file_size=$(stat -c %s "$file" 2>/dev/null || echo 0)
        local file_basename=$(basename "$file")

        if [ "$file_age_days" -gt "$KEEP_DAYS" ]; then
            # Delete old transcripts
            if [ "$DRY_RUN" = true ]; then
                echo "  [DELETE] ${file_basename} (${file_age_days}d old, $(numfmt --to=iec "$file_size" 2>/dev/null || echo "${file_size}B"))"
            else
                rm -f "$file"
            fi
            deleted_count=$((deleted_count + 1))
            deleted_bytes=$((deleted_bytes + file_size))
            dir_deleted=$((dir_deleted + 1))
        elif [ "$file_age_days" -gt "$COMPRESS_DAYS" ]; then
            # Compress medium-age transcripts
            if [ "$DRY_RUN" = true ]; then
                echo "  [GZIP]   ${file_basename} (${file_age_days}d old, $(numfmt --to=iec "$file_size" 2>/dev/null || echo "${file_size}B"))"
            else
                gzip "$file"
            fi
            compressed_count=$((compressed_count + 1))
            # Estimate ~80% compression ratio for JSONL
            compressed_bytes_saved=$((compressed_bytes_saved + file_size * 80 / 100))
            dir_compressed=$((dir_compressed + 1))
        else
            skipped_count=$((skipped_count + 1))
        fi
    done < <(find "$dir" -name "*.jsonl" -type f -print0 2>/dev/null)

    [ "$dir_deleted" -gt 0 ] || [ "$dir_compressed" -gt 0 ] && \
        echo "  ${label}: ${dir_deleted} deleted, ${dir_compressed} compressed"
}

# Process each project directory
if [ -d "$PROJECTS_DIR" ]; then
    for project_dir in "$PROJECTS_DIR"/*/; do
        [ -d "$project_dir" ] || continue
        project_name=$(basename "$project_dir")
        process_dir "$project_dir" "$project_name"
    done
fi

# Process failures directory
process_dir "$FAILURES_DIR" "failures"

# Summary
total_saved=$((deleted_bytes + compressed_bytes_saved))
echo ""
echo "═══ Summary ═══"
echo "  Deleted:    ${deleted_count} files ($(numfmt --to=iec "$deleted_bytes" 2>/dev/null || echo "${deleted_bytes}B"))"
echo "  Compressed: ${compressed_count} files (~$(numfmt --to=iec "$compressed_bytes_saved" 2>/dev/null || echo "${compressed_bytes_saved}B") saved)"
echo "  Kept:       ${skipped_count} files (< ${COMPRESS_DAYS} days old)"
echo "  Total saved: ~$(numfmt --to=iec "$total_saved" 2>/dev/null || echo "${total_saved}B")"
[ "$DRY_RUN" = true ] && echo "  ⚠️  Dry run — no changes made. Remove --dry-run to execute."
