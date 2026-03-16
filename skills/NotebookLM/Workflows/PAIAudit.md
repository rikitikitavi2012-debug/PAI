# PAI Infrastructure Audit Workflow

**Mode:** Monthly automated audit of PAI system via NotebookLM cross-model analysis | **Timeout:** 30 minutes

## When to Use

- Monthly PAI infrastructure audit
- "аудит PAI", "PAI audit", "проверь систему", "infrastructure review"
- After major PAI changes (new hooks, skills, algorithm updates)
- When suspecting contradictions or bloat in rules

## Why This Workflow

NotebookLM (Gemini) analyzes PAI files with zero hallucination — every finding is grounded in actual file content with citations. Then brigade (Gemini CLI + OpenCode + A0) cross-reviews findings. Different models see different blind spots.

## Workflow

### Step 1: Collect Files

```bash
~/.claude/scripts/pai-audit-collector.sh
```

This gathers ~30 files (2.5MB) from:
- Tier 1: Core system (CLAUDE.md, Algorithm, Steering Rules, Brigade, Skills, Hooks)
- Tier 2: Memory (references, feedback, projects, wisdom frames, failures)
- Tier 3: Skills architecture (all SKILL.md files)
- Tier 4: Hooks (all .ts files combined)
- Tier 5: Integration tools (all Tools/*.ts combined)

### Step 2: Create Notebook and Upload

```bash
notebooklm create "PAI Audit $(date +%Y-%m)"
```

Upload all collected files:
```bash
for f in /tmp/pai-audit/*; do
    echo "Uploading: $(basename $f)..."
    notebooklm source add "$f"
done
```

Wait for processing to complete (check source list for all "ready" status).

### Step 3: Fixed Questions (8 questions)

Run each question sequentially, capture answers:

```bash
notebooklm ask "Проанализируй все документы. Какие ПРОТИВОРЕЧИЯ между файлами ты видишь?"

notebooklm ask "Какие повторяющиеся паттерны в failures и feedback? Что система не учится исправлять?"

notebooklm ask "Где избыточная сложность (bloat)? Что можно убрать без потери функционала?"

notebooklm ask "Проверь consistency: все ли скиллы следуют SKILLSYSTEM.md? Все ли хуки документированы?"

notebooklm ask "Проверь интеграции бригады: пересечение функционала, зоны конфликта, устаревшие ссылки."

notebooklm ask "Какие Wisdom Frames противоречат текущим Steering Rules или Algorithm?"

notebooklm ask "Какие файлы ссылаются на несуществующие пути, UUID, или устаревшие компоненты?"

notebooklm ask "Что является самым ценным в системе — что НЕ надо трогать?"
```

### Step 4: Adaptive Questions (from recent failures)

For each unique failure pattern in last 90 days, ask:
```bash
notebooklm ask "Проверь — паттерн '[FAILURE_NAME]' всё ещё присутствует в системе? Есть ли scaffolding которое предотвращает его повторение?"
```

### Step 5: Compile Report

Synthesize NLM answers into structured audit report:

```markdown
# PAI Infrastructure Audit — {YYYY-MM}

## Audit Metadata
- Date: {date}
- Sources: {count} files, {size}KB
- NLM Notebook: {notebook_id}
- Questions asked: {count}

## Findings

### Critical (must fix)
1. [Finding] — [Evidence from NLM with citation]

### Important (should fix)
1. [Finding] — [Evidence]

### Advisory (nice to fix)
1. [Finding] — [Evidence]

## What's Working Well
- [Confirmed strengths from NLM]

## Comparison with Previous Audit
- [Fixed since last time]
- [Still present]
- [New issues]

## Recommended Actions
1. [Action] — Priority: HIGH/MEDIUM/LOW
```

Save to: `~/.claude/MEMORY/RESEARCH/audits/{YYYY}-{MM}-audit.md`

### Step 6: Brigade Cross-Review

Send findings to 2 brigade members (rotate monthly):

**Month 1:** Gemini CLI (primary) + A0 (cross-check)
**Month 2:** OpenCode (primary) + Gemini CLI (cross-check)
**Month 3:** A0 (primary) + OpenCode (cross-check)

```bash
# Primary reviewer
echo "REVIEW_PROMPT" | gemini -p "" -y -o text

# Cross-check reviewer
opencode run "REVIEW_PROMPT"
```

If cross-checker finds zero new issues for 3 consecutive months → drop to 1 reviewer.

### Step 7: Fix and Commit

For each confirmed finding:
1. Implement fix
2. Verify (mandatory evidence per "Verification Rigor" rule)
3. Commit with `Source: PAI monthly audit {YYYY-MM}`

### Step 8: Report

```markdown
════ PAI | NotebookLM ═══════════════════════
🔍 AUDIT: PAI Infrastructure {YYYY-MM}
📚 SOURCES: {count} files analyzed
🔴 CRITICAL: {count} findings
🟡 IMPORTANT: {count} findings
🟢 ADVISORY: {count} findings
✅ FIXED: {count} issues resolved
📁 REPORT: MEMORY/RESEARCH/audits/{YYYY}-{MM}-audit.md
🗣️ Navi: Аудит завершён, {total} находок, {fixed} пофикшено
```

## Metrics (track monthly)

| Metric | How to measure |
|---|---|
| Findings count | Total from NLM |
| Severity distribution | Critical / Important / Advisory |
| Time-to-fix | Days from finding to commit |
| False positive rate | Findings dismissed as non-issues |
| Escape rate | ISC escapes to NATIVE in last 30 days |
| Repeat findings | Issues found in previous audit still present |

## Schedule

- **Monthly**: Full audit (1st week of month)
- **Quarterly**: Review and update audit-manifest.yaml
- **On-demand**: After major PAI changes

## Notes

- Use **separate Google account** for NotebookLM (never primary)
- Cookie auth expires — re-run `notebooklm login` if auth fails
- NLM file limit: 500K words / 200MB per source, 50 sources per notebook (free)
- Collector bundles files to stay under limits automatically
