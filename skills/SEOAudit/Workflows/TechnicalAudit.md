# TechnicalAudit Workflow

Deep technical SEO audit with 2 agents. Speed, Core Web Vitals, Indexation, Security.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю технический SEO аудит", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **TechnicalAudit** в скилле **SEOAudit**...

## Agent Assignments

| Agent | Focus | Tools |
|-------|-------|-------|
| **Agent 1: Crawl & Index** | Robots, Sitemap, Redirects, Canonicals | curl, WebSearch |
| **Agent 2: Performance** | Core Web Vitals, Speed, Mobile, HTTPS | PageSpeed, Browser |

## Execution Steps

### 1. Gather Inputs

```
URL: [domain]
Expected page count: [number]
Any known issues: [description]
```

### 2. Agent 1: Crawlability & Indexation

**Prompt:**
```
You are a Technical SEO Specialist focusing on Crawlability and Indexation.

Audit {domain} for:

## CRAWLABILITY

1. Robots.txt
   - Fetch https://{domain}/robots.txt
   - Check for Disallow: / (blocking all)
   - Check for Disallow: /important-path/
   - Verify Sitemap: directive present
   - Check for Crawl-Delay (may slow indexing)

2. XML Sitemap
   - Fetch https://{domain}/sitemap.xml
   - Verify XML is valid
   - Count URLs in sitemap
   - Check all URLs are canonical (not redirects)
   - Check all URLs are HTTPS
   - Note last modification dates

3. Site Architecture
   - Check homepage links to key pages
   - Estimate click depth to important pages
   - Flag any obvious orphan pages

## INDEXATION

1. Site Operator Check
   - Run site:{domain} via WebSearch
   - Note approximate indexed pages
   - Compare to expected count
   - Flag major discrepancies (>50% difference)

2. Noindex Check (sample 5 key pages)
   - Fetch each page
   - Check for <meta name="robots" content="noindex">
   - Check for X-Robots-Tag: noindex header

3. Canonical Tags
   - Check homepage has self-referencing canonical
   - Check canonicals point to HTTPS
   - Check www/non-www consistency
   - Check trailing slash consistency

4. Redirects
   - Test http:// → https:// redirect
   - Test www → non-www (or vice versa)
   - Check for redirect chains (>1 hop)
   - Check for redirect loops

5. HTTP Status Codes
   - Test a known 404 URL (should return 404, not 200)
   - Check homepage returns 200

Output format:
## [P0-P4] Issue Title
**Evidence:** [URL, status code, or specific finding]
**Impact:** [indexation/traffic loss estimate]
**Fix:** [exact steps]

Prioritize P0 (blocking) and P1 (critical) issues.
```

### 3. Agent 2: Performance & Mobile

**Prompt:**
```
You are a Technical SEO Specialist focusing on Performance and Mobile.

Audit {domain} for:

## CORE WEB VITALS

1. Generate PageSpeed Insights URL:
   https://pagespeed.web.dev/analysis?url=https://{domain}/

2. Key Metrics to Check:
   - LCP (Largest Contentful Paint): Target < 2.5s
   - INP (Interaction to Next Paint): Target < 200ms
   - CLS (Cumulative Layout Shift): Target < 0.1
   - TTFB (Time to First Byte): Target < 600ms

3. Common LCP Issues:
   - Unoptimized images
   - Render-blocking JavaScript
   - Slow server response
   - No preload for critical resources

4. Common CLS Issues:
   - Images without dimensions
   - Dynamic content insertion
   - Fonts causing layout shifts
   - Ads/embeds without reserved space

## MOBILE

1. Viewport Meta Tag
   - Check for: <meta name="viewport" content="width=device-width, initial-scale=1">
   - Flag if missing or incorrect

2. Tap Targets
   - Check button/link sizes >= 48x48px
   - Check spacing between tap targets

3. Horizontal Scroll
   - Check for content overflow on mobile
   - Flag elements causing horizontal scroll

4. Mobile Content Parity
   - Check that mobile shows same content as desktop
   - Flag if important content hidden on mobile

## SECURITY

1. HTTPS
   - Verify HTTPS works
   - Check SSL certificate valid
   - Check HTTP → HTTPS redirect

2. Mixed Content
   - Check for HTTP resources on HTTPS page
   - Flag insecure scripts, images, iframes

3. Security Headers (bonus)
   - Check for HSTS header
   - Check for X-Frame-Options
   - Check for X-Content-Type-Options

Output format:
## [P0-P4] Issue Title
**Evidence:** [metric value, URL, or specific finding]
**Current:** [current state]
**Target:** [desired state]
**Fix:** [exact steps]

Prioritize issues affecting Core Web Vitals.
```

### 4. Generate Report

```markdown
# Technical SEO Audit: {domain}
Date: {date}

## Executive Summary

**Crawlability Score:** {score}/100
**Performance Score:** {score}/100
**Mobile Score:** {score}/100

**Blocking Issues (P0):** {count}
**Critical Issues (P1):** {count}

---

## Crawlability & Indexation

### Robots.txt
{findings}

### XML Sitemap
{findings}

### Canonicals
{findings}

### Redirects
{findings}

### Indexation Status
{findings}

---

## Performance (Core Web Vitals)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| LCP | {value}s | <2.5s | ✓/✗ |
| INP | {value}ms | <200ms | ✓/✗ |
| CLS | {value} | <0.1 | ✓/✗ |
| TTFB | {value}ms | <600ms | ✓/✗ |

### Performance Issues
{findings}

---

## Mobile

{findings}

---

## Security

{findings}

---

## Prioritized Action Plan

### This Week (P0-P1)
1. {action}
2. {action}

### This Month (P2)
1. {action}

## Tools & Resources

- PageSpeed Insights: https://pagespeed.web.dev/analysis?url=https://{domain}/
- Rich Results Test: https://search.google.com/test/rich-results
- Search Console: https://search.google.com/search-console
```

## Quality Gates

- [ ] Robots.txt checked
- [ ] Sitemap checked
- [ ] Redirects tested
- [ ] Core Web Vitals referenced
- [ ] Mobile viewport checked
- [ ] HTTPS verified
- [ ] All issues have evidence + fix

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/technical-audit.md`
