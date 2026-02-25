# Upstream Sync Workflow

**Mode:** Compare local PAI with upstream danielmiessler/PAI | **Time:** ~1 min

## When to Use

- "compare upstream", "sync check", "what's new upstream"
- After upstream releases new version
- Before submitting PRs to upstream
- Checking if our local patches are still needed

## Workflow

### Step 1: Gather Upstream Data (parallel gh CLI calls)

Run these in parallel via Bash:

```bash
# Latest release
gh release view --repo danielmiessler/PAI --json tagName,publishedAt,body

# Open issues (ours and relevant)
gh issue list --repo danielmiessler/PAI --state open --limit 30 --json number,title,labels,author

# Open PRs (ours and relevant)
gh pr list --repo danielmiessler/PAI --state open --limit 30 --json number,title,author,labels

# Upstream skill list (repo stores releases in Releases/vX.Y/.claude/)
# First get latest release tag, then query that path
LATEST_TAG=$(gh release view --repo danielmiessler/PAI --json tagName --jq '.tagName')
gh api "repos/danielmiessler/PAI/git/trees/main?recursive=1" \
  --jq "[.tree[] | select(.path | test(\"^Releases/${LATEST_TAG}/.claude/skills/[^/]+/SKILL\\\\.md$\"))] | [.[].path | split(\"/\")[4]] | sort | .[]"

# Upstream hooks list
gh api "repos/danielmiessler/PAI/git/trees/main?recursive=1" \
  --jq "[.tree[] | select(.path | test(\"^Releases/${LATEST_TAG}/.claude/hooks/[^/]+\\\\.hook\\\\.ts$\"))] | [.[].path | split(\"/\")[4]] | sort | .[]"
```

### Step 2: Compare Local vs Upstream

**Skills diff:**
```bash
# Local skills
ls ~/.claude/skills/ | sort > /tmp/local-skills.txt

# Compare with upstream list from Step 1
# Identify: skills we have that upstream doesn't, and vice versa
```

**Hooks diff:**
```bash
# Local hooks
ls ~/.claude/hooks/*.hook.ts 2>/dev/null | xargs -I{} basename {} | sort > /tmp/local-hooks.txt

# Compare with upstream list from Step 1
```

**Version comparison:**
- Read local version from `~/.claude/skills/PAI/SKILL.md` or `settings.json`
- Compare with upstream latest release tag

### Step 3: Check Our Issues & PRs

Filter from Step 1 data:
- **Our open issues:** filter by author = `rikitikitavi2012-debug`
- **Our open PRs:** filter by author = `rikitikitavi2012-debug`
- **Issues with fixes:** issues that have linked PRs or "fixed" labels
- **Issues relevant to us:** matching keywords from our known issues (#766, #767, #768, #769, #771, #772, #773, #800)

### Step 4: Present Sync Report

```markdown
# Upstream Sync Report
**Date:** YYYY-MM-DD | **Upstream:** vX.Y.Z | **Local:** vX.Y.Z

## Version Status
[Behind by N versions / Up to date / Ahead (custom patches)]

## Skills Diff
| Status | Skill | Notes |
|--------|-------|-------|
| ✅ Both | SkillName | In sync |
| 🆕 Upstream only | SkillName | Consider installing |
| 🔧 Local only | SkillName | Our custom skill |

## Hooks Diff
| Status | Hook | Notes |
|--------|------|-------|
| ✅ Both | hook.ts | In sync |
| 🆕 Upstream only | hook.ts | Consider adopting |
| 🔧 Local only | hook.ts | Our custom hook |

## Our Issues (Open)
| # | Title | Status | Action Needed |
|---|-------|--------|---------------|

## Our PRs (Open)
| # | Title | Status | Action Needed |
|---|-------|--------|---------------|

## Recommendations
1. [What to update/adopt/submit]
```

### Step 5: Voice Summary

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Синхронизация с апстримом завершена. [result summary in Russian]"}'
```
