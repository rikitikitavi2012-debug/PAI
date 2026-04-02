# OnPageAudit Workflow

On-page SEO audit with 2 agents. Meta tags, Headings, Content structure, Images.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю on-page SEO аудит", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **OnPageAudit** в скилле **SEOAudit**...

## Agent Assignments

| Agent | Focus | Pages |
|-------|-------|-------|
| **Agent 1: Meta & Structure** | Titles, Descriptions, Headings, URLs | All key pages |
| **Agent 2: Content & Images** | Content optimization, Images, Internal links | All key pages |

## Execution Steps

### 1. Gather Inputs

```
URL: [domain]
Key pages to audit: [list, up to 15]
Primary keywords per page: [map]
```

### 2. Agent 1: Meta & Structure

**Prompt:**
```
You are an On-Page SEO Specialist focusing on Meta Tags and Structure.

Audit these pages on {domain}:

Pages: {page_list}

For EACH page, extract and analyze:

## TITLE TAGS

1. Extract: <title>content</title>
2. Check:
   - Present? (Y/N)
   - Unique across site? (Y/N)
   - Length: {count}/60 chars (ideal: 50-60)
   - Primary keyword position: first 60 chars? (Y/N)
   - Compelling/click-worthy? (Y/N)
   - NO brand name at end (SERPs add it)

## META DESCRIPTIONS

1. Extract: <meta name="description" content="...">
2. Check:
   - Present? (Y/N)
   - Unique across site? (Y/N)
   - Length: {count}/160 chars (ideal: 150-160)
   - Primary keyword included? (Y/N)
   - Has CTA? (Y/N)
   - Compelling value proposition? (Y/N)

## HEADING STRUCTURE

1. Extract all H1, H2, H3, H4
2. Check:
   - Exactly ONE H1? (Y/N)
   - H1 contains primary keyword? (Y/N)
   - H1 different from title? (Y/N)
   - Logical hierarchy (H1→H2→H3, no skipping)? (Y/N)
   - Headings describe content? (Y/N)

## URL STRUCTURE

1. Analyze URL path
2. Check:
   - Descriptive/readable? (Y/N)
   - Contains keyword? (Y/N)
   - Lowercase? (Y/N)
   - Hyphen-separated? (Y/N)
   - No unnecessary parameters? (Y/N)
   - No trailing parameters (?session=, ?utm=)? (Y/N)

## CANONICAL TAGS

1. Extract: <link rel="canonical" href="...">
2. Check:
   - Present? (Y/N)
   - Self-referencing? (Y/N)
   - HTTPS? (Y/N)
   - Correct domain? (Y/N)

## OUTPUT FORMAT

Create a table:

| Page | Title | Title Len | Title Issue | Desc | Desc Len | Desc Issue | H1 | H1 Issue |
|------|-------|-----------|-------------|------|----------|------------|----|----------|

Then detail critical issues:

## [P0-P4] {Issue Title}
**Page:** {url}
**Current:** {what exists}
**Should Be:** {what should exist}
**Fix:** {exact change}

Focus on:
- Duplicate titles/descriptions (P1)
- Missing titles/descriptions on money pages (P1)
- Multiple H1s (P2)
- Missing H1 (P2)
- Title/description too long or too short (P3)
```

### 3. Agent 2: Content & Images

**Prompt:**
```
You are an On-Page SEO Specialist focusing on Content and Images.

Audit these pages on {domain}:

Pages: {page_list}
Target keywords: {keyword_map}

For EACH page, analyze:

## CONTENT OPTIMIZATION

1. First 100 Words Check
   - Does primary keyword appear? (Y/N)
   - Is it natural, not stuffed? (Y/N)

2. Keyword Density
   - Count primary keyword occurrences
   - Calculate rough density (should be 1-2%)
   - Check for keyword stuffing

3. Related Keywords/LSI
   - Are related terms naturally included? (Y/N)
   - Are semantic variations used? (Y/N)

4. Content Length
   - Word count: {count}
   - Is it sufficient for the topic? (Y/N)
   - Compare to top 3 competitors

5. Content Structure
   - Short paragraphs (2-3 sentences)? (Y/N)
   - Bullet lists where appropriate? (Y/N)
   - Clear sections with subheadings? (Y/N)

## IMAGES

For first 5 images per page:

1. Extract: <img src="..." alt="...">
2. Check:
   - Alt text present? (Y/N)
   - Alt text descriptive? (Y/N)
   - Alt text includes keyword where relevant? (Y/N)
   - File name descriptive? (Y/N)
   - File size reasonable (<100KB)? (Y/N)
   - Modern format (WebP)? (Y/N)

## INTERNAL LINKING

1. Count internal links on page
2. Check:
   - Key pages linked from this page? (Y/N)
   - Anchor text descriptive? (Y/N)
   - No "click here" anchors? (Y/N)
   - Links to conversion pages? (Y/N)

## OUTPUT FORMAT

### Content Optimization Summary

| Page | Word Count | Keyword in First 100 | Content Depth | Images w/o Alt |
|------|------------|---------------------|---------------|----------------|

### Critical Issues

## [P0-P4] {Issue Title}
**Page:** {url}
**Current:** {what exists}
**Should Be:** {what should exist}
**Fix:** {exact change}

### Image Issues (if >3)

List all images missing alt text with suggested alt text.
```

### 4. Generate Report

```markdown
# On-Page SEO Audit: {domain}
Date: {date}

## Executive Summary

**Pages Audited:** {count}
**Critical Issues:** {count}
**Quick Wins:** {count}

---

## Meta Tags Summary

| Metric | Good | Needs Work | Critical |
|--------|------|------------|----------|
| Title Tags | {count} | {count} | {count} |
| Meta Descriptions | {count} | {count} | {count} |
| H1 Tags | {count} | {count} | {count} |
| Canonicals | {count} | {count} | {count} |

## Detailed Findings by Page

### {Page URL}

**Title:** {title} ({length}/60)
- {issue_1}
- {issue_2}

**Description:** {desc} ({length}/160)
- {issue_1}

**H1:** {h1}
- {issue_1}

**Content:** {word_count} words
- {issue_1}

**Images:** {total} images, {missing_alt} missing alt
- {issue_1}

---

## Prioritized Issues

### P1: Critical (Fix This Week)
1. {issue}
2. {issue}

### P2: High (Fix This Month)
1. {issue}
2. {issue}

### P3: Medium (Next Quarter)
1. {issue}

---

## Quick Wins

1. **{page}** — Add meta description (2 min)
2. **{page}** — Fix duplicate title (5 min)
3. **{page}** — Add alt text to 3 images (5 min)

---

## Implementation Checklist

- [ ] Fix all duplicate titles
- [ ] Add missing meta descriptions
- [ ] Fix multiple H1s
- [ ] Add missing alt text
- [ ] Optimize keyword placement
```

## Quality Gates

- [ ] All key pages audited
- [ ] Titles/descriptions extracted for all
- [ ] H1 structure verified for all
- [ ] Images checked (at least sample)
- [ ] Internal linking reviewed
- [ ] Every issue has specific fix

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/onpage-audit.md`
