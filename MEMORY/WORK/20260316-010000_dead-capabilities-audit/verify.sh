#!/bin/bash
# Count phantom dependencies in PAI system
# Each check adds 1 to count if phantom (described but not working)
count=0

# CLI tools described but missing
for tool in qpdf tesseract shellcheck; do
  which $tool > /dev/null 2>&1 || ((count++))
done

# API keys: Perplexity and xAI are agent types using built-in search, not direct API
# Only check keys actually used in .ts code
# Cloudflare: has CF_ACCOUNT_ID — wrangler uses CF_API_TOKEN or CLOUDFLARE_API_TOKEN
grep -q "^CLOUDFLARE_API_TOKEN=" /home/ser/.config/PAI/.env 2>/dev/null || \
grep -q "^CF_API_TOKEN=" /home/ser/.config/PAI/.env 2>/dev/null || \
grep -q "^CF_ACCOUNT_ID=" /home/ser/.config/PAI/.env 2>/dev/null || ((count++))

# macOS hardcoded paths in skills
grep -ql '/Applications/' /home/ser/.claude/skills/Utilities/Browser/SKILL.md 2>/dev/null && ((count++))
grep -ql 'open -a' /home/ser/.claude/skills/Utilities/Browser/SKILL.md 2>/dev/null && ((count++))
grep -ql 'Finder\|Preview.app' /home/ser/.claude/skills/Media/Art/SKILL.md 2>/dev/null && ((count++))
grep -ql '/Applications/Gephi\|/Applications/Maltego' /home/ser/.claude/skills/Security/ -r 2>/dev/null && ((count++))

# APIFY_TOKEN: code supports both APIFY_TOKEN and APIFY_API_KEY
# Check that at least one is in .env
grep -q '^APIFY_TOKEN=' /home/ser/.config/PAI/.env 2>/dev/null || \
grep -q '^APIFY_API_KEY=' /home/ser/.config/PAI/.env 2>/dev/null || ((count++))

# yaml package not in PAI root
[ ! -d /home/ser/.claude/node_modules/yaml ] && ((count++))

# THEHOOKSYSTEM.md outdated (check if hook file count matches documented)
doc_hooks=$(grep -c '\.hook\.ts' /home/ser/.claude/PAI/THEHOOKSYSTEM.md 2>/dev/null || echo 0)
real_hooks=$(ls /home/ser/.claude/hooks/*.hook.ts 2>/dev/null | wc -l)
[ "$doc_hooks" -lt "$((real_hooks - 5))" ] && ((count++))

echo $count
