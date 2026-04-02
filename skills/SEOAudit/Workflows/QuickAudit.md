# QuickAudit Workflow

5-minute SEO health check with 1 agent. Focus: Crawlability + Critical On-Page.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю быстрый SEO аудит", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **QuickAudit** в скилле **SEOAudit**...

## Scope

| Check | Time | Tool |
|-------|------|------|
| Robots.txt | 30s | `web_fetch` |
| Meta tags (homepage) | 30s | `web_fetch` |
| Indexation check | 30s | `site:operator` via WebSearch |
| Core Web Vitals | 2min | PageSpeed Insights URL |
| Mobile friendly | 1min | Visual check |

**Total: ~5 minutes**

## Execution Steps

### 1. Gather Inputs

Ask user (if not provided):
```
URL to audit: [domain]
Any specific concerns? [optional]
```

### 2. Run Checks

**2.1 Robots.txt**
```bash
# Fetch robots.txt
curl -s https://{domain}/robots.txt
```

Check:
- [ ] File exists
- [ ] Not blocking important paths
- [ ] Sitemap URL present

**2.2 Homepage Meta Tags**
```bash
# Fetch homepage
curl -s https://{domain}/ | grep -E '<title>|<meta name="description"|<meta name="robots"|<h1'
```

Check:
- [ ] Title tag present, 50-60 chars
- [ ] Meta description present, 150-160 chars
- [ ] No noindex on homepage
- [ ] Exactly one H1

**2.3 Indexation**
```
site:{domain}
```
- Compare indexed pages vs expected
- Flag major discrepancies

**2.4 Core Web Vitals**
- Generate PageSpeed Insights URL: `https://pagespeed.web.dev/analysis?url=https://{domain}/`
- If user can provide results, analyze; otherwise note as "manual check required"

### 3. Generate Report

```markdown
# SEO Quick Audit: {domain}
Date: {date}

## Health Score: {score}/100

## Critical Issues (P0-P1)

### [P0] {issue_title}
- **Problem:** {description}
- **Fix:** {specific_fix}
- **Evidence:** {link/screenshot}

## Quick Wins
1. {quick_fix_1}
2. {quick_fix_2}

## Next Steps
- Full audit recommended: [Yes/No]
- Priority areas: {list}
```

## Quality Gates

- [ ] At least 5 checks performed
- [ ] Every issue has evidence
- [ ] Every issue has specific fix
- [ ] Priority assigned (P0-P4)
- [ ] Quick wins identified

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/quick-report.md`
