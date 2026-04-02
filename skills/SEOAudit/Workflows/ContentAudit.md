# ContentAudit Workflow

Content quality and E-E-A-T audit with 2 agents. Depth, Authority, User Value.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю аудит качества контента", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **ContentAudit** в скилле **SEOAudit**...

## Agent Assignments

| Agent | Focus | Checks |
|-------|-------|--------|
| **Agent 1: E-E-A-T** | Experience, Expertise, Authority, Trust | Author info, credentials, sourcing |
| **Agent 2: Content Quality** | Depth, intent, freshness, gaps | Word count, comprehensiveness, updates |

## Execution Steps

### 1. Gather Inputs

```
URL: [domain]
Key pages to audit: [list, up to 10]
Target audience: [description]
Primary keywords: [list]
Top competitors for content: [list, optional]
```

### 2. Agent 1: E-E-A-T Assessment

**Prompt:**
```
You are an E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) Specialist.

Audit {domain} for E-E-A-T signals:

## EXPERIENCE Signals

For each key page, check:

1. First-Hand Experience
   - Does content show personal experience with the topic?
   - Are there real examples/case studies?
   - Original insights vs. aggregated content?
   - Photos of actual work/projects?

2. Practical Knowledge
   - Does content show "I've done this" vs "I read about this"?
   - Specific details only practitioners would know?
   - Real-world constraints and edge cases mentioned?

## EXPERTISE Signals

1. Author Information
   - Is author name visible? Y/N
   - Author bio present? Y/N
   - Author credentials listed? Y/N
   - Links to author's other work? Y/N
   - Author photo? Y/N

2. Content Quality
   - Technical accuracy? (spot check 3 claims)
   - Depth appropriate for topic?
   - Citations/sources for claims?
   - Industry terminology used correctly?

3. Team/Company Credentials
   - About page with team info? Y/N
   - Certifications listed? Y/N
   - Years in business mentioned? Y/N
   - Portfolio/case studies? Y/N

## AUTHORITATIVENESS Signals

1. External Recognition
   - Testimonials/reviews? Y/N
   - Client logos (for B2B)? Y/N
   - Awards/certifications? Y/N
   - Media mentions? Y/N

2. Content Citations
   - Do other sites cite this content? (check via WebSearch)
   - Is content referenced in industry discussions?

3. Thought Leadership
   - Original research/data? Y/N
   - Unique frameworks/methodologies? Y/N
   - Industry speaking/writing? Y/N

## TRUSTWORTHINESS Signals

1. Transparency
   - Contact information visible? Y/N
   - Physical address (for local)? Y/N
   - Phone number? Y/N
   - Email? Y/N

2. Legal/Policy
   - Privacy policy? Y/N
   - Terms of service? Y/N
   - Return/refund policy (e-commerce)? Y/N

3. Security
   - HTTPS site-wide? Y/N
   - SSL certificate valid? Y/N

4. Accuracy
   - No obvious factual errors? Y/N
   - Dates on content? Y/N
   - Content recently updated? Y/N

## OUTPUT FORMAT

### E-E-A-T Scorecard

| Signal | Present | Missing | Notes |
|--------|---------|---------|-------|
| Author Name | ✓/✗ | | {note} |
| Author Bio | ✓/✗ | | {note} |
| Author Credentials | ✓/✗ | | {note} |
| Contact Info | ✓/✗ | | {note} |
| Privacy Policy | ✓/✗ | | {note} |
| HTTPS | ✓/✗ | | {note} |
| Testimonials | ✓/✗ | | {note} |
| Portfolio | ✓/✗ | | {note} |

### Critical E-E-A-T Issues

## [P1-P3] {Issue}
**Signal Missing:** {which_signal}
**Impact:** {why_matters_for_google}
**Fix:** {specific_action}
**Example:** {competitor_example_if_available}
```

### 3. Agent 2: Content Quality

**Prompt:**
```
You are a Content Quality Specialist.

Audit content on {domain}:

Pages: {page_list}
Target keywords: {keyword_list}

## CONTENT DEPTH

For each page:

1. Word Count
   - Count: {number}
   - Sufficient for topic? (compare to top 3 results)
   - Top 10 competitor average: {number}

2. Topic Coverage
   - Does it answer the primary question?
   - Does it address related questions?
   - Are there gaps vs. competitors?

3. Content Structure
   - Logical flow?
   - Scannable (headings, bullets)?
   - Visual elements (images, charts)?

## SEARCH INTENT ALIGNMENT

1. Identify Primary Intent
   - Informational? (learn something)
   - Transactional? (buy something)
   - Navigational? (find specific page)
   - Commercial? (research before buying)

2. Check Content Matches Intent
   - If informational: comprehensive guide?
   - If transactional: clear path to purchase?
   - If commercial: comparisons, reviews, pricing?

## CONTENT FRESHNESS

1. Date Signals
   - Publish date visible? Y/N
   - Last updated date? Y/N
   - Content references current year? Y/N

2. Outdated Elements
   - References to old products/prices?
   - Broken links to external resources?
   - Statistics that need updating?

## CONTENT GAPS

Compare to competitors: {competitor_list}

1. Topics competitors cover that you don't:
   - {gap_1}
   - {gap_2}

2. Questions competitors answer that you don't:
   - {question_1}
   - {question_2}

3. Content types competitors have:
   - {type_1} (e.g., calculator, video, infographic)
   - {type_2}

## AI CONTENT DETECTION

Check for AI writing patterns:
- Overuse of em dashes (—)
- Phrases like "It's worth noting", "In conclusion", "In today's digital landscape"
- Repetitive sentence structure
- Lack of personal voice/opinion
- No original data or examples

If AI content detected: Note as P3 issue (not critical but affects E-E-A-T)

## OUTPUT FORMAT

### Content Quality Summary

| Page | Words | Intent | Depth | Fresh | Issues |
|------|-------|--------|-------|-------|--------|
| {url} | {count} | {type} | ✓/✗ | ✓/✗ | {count} |

### Critical Content Issues

## [P1-P3] {Issue}
**Page:** {url}
**Current:** {what_exists}
**Should Be:** {what_should_exist}
**Competitor Example:** {url}
**Fix:** {specific_action}

### Content Gap Opportunities

1. **{Topic}**
   - Competitor: {url}
   - Est. Traffic: {value}
   - Recommendation: Create {content_type}
```

### 4. Generate Report

```markdown
# Content Quality Audit: {domain}
Date: {date}

## Executive Summary

**E-E-A-T Score:** {score}/100
**Content Depth Score:** {score}/100
**Critical Issues:** {count}
**Content Gaps:** {count}

---

## E-E-A-T Analysis

### Scorecard

| Category | Score | Critical Missing |
|----------|-------|------------------|
| Experience | {score}/25 | {items} |
| Expertise | {score}/25 | {items} |
| Authoritativeness | {score}/25 | {items} |
| Trustworthiness | {score}/25 | {items} |
| **Total** | **{total}/100** | |

### Priority E-E-A-T Fixes

1. **[P1] {Issue}**
   - {description}
   - Fix: {action}

---

## Content Quality Analysis

### Depth Assessment

| Page | Word Count | vs Competitors | Intent Match |
|------|------------|----------------|--------------|
| {page} | {count} | {above/below} | ✓/✗ |

### Freshness Issues

{list_of_outdated_content}

---

## Content Gaps

### Missing Topics

1. **{Topic}**
   - Why important: {reason}
   - Competitor example: {url}
   - Recommended action: {action}

### Missing Content Types

1. **{Type}** (e.g., Calculator, Video, FAQ)
   - Competitor has: {url}
   - Benefit: {why_matters}

---

## Content Improvement Plan

### Immediate (This Week)
1. {action}
2. {action}

### Short-term (This Month)
1. {action}
2. {action}

### New Content to Create
1. {content_piece_1}
2. {content_piece_2}

---

## AI Content Notes

{findings_if_any}

---

## Quality Gates After Fixes

- [ ] All pages have author attribution
- [ ] Contact info visible on all pages
- [ ] Privacy policy linked from footer
- [ ] Content updated within last 12 months
- [ ] Word count competitive for topic
```

## Quality Gates

- [ ] E-E-A-T signals checked for all pages
- [ ] Content depth compared to competitors
- [ ] Content gaps identified
- [ ] Freshness assessed
- [ ] AI content patterns checked
- [ ] Specific fixes for all issues

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/content-audit.md`
