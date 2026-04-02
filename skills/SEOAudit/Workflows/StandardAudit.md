# StandardAudit Workflow

Full SEO audit with 3 parallel agents. Technical + On-Page + Content sample.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю полный SEO аудит, три агента параллельно", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **StandardAudit** в скилле **SEOAudit**...

## Agent Assignments

| Agent | Focus | Checks |
|-------|-------|--------|
| **Agent 1: Technical** | Crawlability, Indexation, Speed | robots.txt, sitemap, redirects, CWV, HTTPS |
| **Agent 2: On-Page** | Meta tags, Headings, Images | Titles, descriptions, H1/H2, alt text |
| **Agent 3: Content** | Quality, E-E-A-T, Internal links | Content depth, author info, linking |

## Execution Steps

### 1. Gather Inputs

```
URL to audit: [domain]
Key pages (besides homepage): [list, max 10]
Top competitors (optional): [list, max 3]
Primary keywords: [list]
```

### 2. Spawn Agents

**Agent 1 Prompt:**
```
You are a Technical SEO Specialist. Audit {domain} for:

1. CRAWLABILITY
   - Fetch robots.txt, check for blocks
   - Check XML sitemap exists at /sitemap.xml
   - Verify sitemap contains canonical URLs

2. INDEXATION
   - Run site:{domain} check
   - Check for noindex tags on key pages
   - Verify canonical tags present
   - Check HTTP/HTTPS consistency
   - Check www/non-www consistency

3. SPEED & CORE WEB VITALS
   - Generate PageSpeed Insights URL
   - Note LCP, INP, CLS scores if available
   - Check for render-blocking resources

4. MOBILE
   - Check viewport meta tag
   - Note any obvious mobile issues

Output findings in this format:
## [P0-P4] Issue Title
**Evidence:** [specific URL/line/data]
**Fix:** [exact steps]
**Impact:** [traffic/revenue estimate]

Focus on P0-P2 issues only.
```

**Agent 2 Prompt:**
```
You are an On-Page SEO Specialist. Audit these pages on {domain}:

Pages: {homepage} + {key_pages}

For EACH page, check:

1. TITLE TAG
   - Present and unique
   - Length 50-60 chars
   - Keyword near beginning
   - Compelling

2. META DESCRIPTION
   - Present and unique
   - Length 150-160 chars
   - Includes keyword
   - Has CTA

3. HEADING STRUCTURE
   - Exactly one H1
   - H1 contains primary keyword
   - Logical H1 → H2 → H3 hierarchy
   - No skipped levels

4. IMAGES (sample first 5 per page)
   - Alt text present
   - Descriptive file names
   - Reasonable file sizes

5. URL STRUCTURE
   - Clean, descriptive URLs
   - No unnecessary parameters
   - Lowercase, hyphen-separated

Output findings in this format:
## [P0-P4] Issue Title
**Page:** [URL]
**Evidence:** [specific element]
**Fix:** [exact change needed]
**Impact:** [estimate]

Flag any duplicate content issues across pages.
```

**Agent 3 Prompt:**
```
You are a Content Quality Specialist. Audit content on {domain}:

Pages to analyze: {homepage} + {key_pages}

1. CONTENT DEPTH
   - Word count per page
   - Does it answer the search intent?
   - Is it comprehensive for the topic?
   - Compare to top competitors

2. E-E-A-T SIGNALS
   - Author information visible?
   - Credentials/expertise demonstrated?
   - Original data/insights?
   - Contact information present?
   - Privacy policy linked?

3. KEYWORD TARGETING
   - Primary keyword: {keyword}
   - Is keyword in first 100 words?
   - Is it in H1?
   - Is it naturally integrated throughout?

4. INTERNAL LINKING
   - Key pages linked from homepage?
   - Descriptive anchor text?
   - Any orphan pages?
   - Link to important conversion pages?

5. CONTENT GAPS
   - Missing topics that competitors cover?
   - Questions users might have that aren't answered?

Output findings in this format:
## [P0-P4] Issue Title
**Evidence:** [specific example]
**Current:** [what exists now]
**Recommended:** [what should exist]
**Impact:** [estimate]

Prioritize content that affects money pages.
```

### 3. Aggregate Results

Combine all agent outputs into unified report:

```markdown
# SEO Audit Report: {domain}
Date: {date}
Auditors: 3 agents (Technical, On-Page, Content)

## Executive Summary

**Health Score:** {score}/100

**Top 5 Priority Issues:**
1. [P0/P1] {issue} - {impact}
2. [P0/P1] {issue} - {impact}
3. [P2] {issue} - {impact}
4. [P2] {issue} - {impact}
5. [P2] {issue} - {impact}

**Quick Wins:** {count} issues fixable this week

---

## Technical SEO Findings

{Agent 1 output}

## On-Page SEO Findings

{Agent 2 output}

## Content Quality Findings

{Agent 3 output}

---

## Prioritized Action Plan

### This Week (P0-P1)
1. {action} - Effort: {quick/medium}
2. {action} - Effort: {quick/medium}

### This Month (P2)
1. {action} - Effort: {medium/large}
2. {action} - Effort: {medium/large}

### Next Quarter (P3-P4)
1. {action}
2. {action}

---

## Verification Checklist

After fixes, verify:
- [ ] {verification_step_1}
- [ ] {verification_step_2}
- [ ] {verification_step_3}

## Tools Used
- PageSpeed Insights
- site: operator
- Manual inspection
```

## Quality Gates

- [ ] All 3 agents completed
- [ ] At least 15 findings total
- [ ] Every finding has evidence
- [ ] Every finding has specific fix
- [ ] Priorities assigned correctly
- [ ] Action plan is actionable

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/`
- `report.md` — Full report
- `technical.md` — Agent 1 raw output
- `onpage.md` — Agent 2 raw output
- `content.md` — Agent 3 raw output
