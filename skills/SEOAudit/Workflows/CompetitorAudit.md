# CompetitorAudit Workflow

SEO competitive analysis with 3 agents. Compare site against top competitors.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю конкурентный SEO анализ", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **CompetitorAudit** в скилле **SEOAudit**...

## Agent Assignments

| Agent | Target | Focus |
|-------|--------|-------|
| **Agent 1** | Your site | Technical + On-Page baseline |
| **Agent 2** | Competitor 1 | Same checks for comparison |
| **Agent 3** | Competitor 2 | Same checks for comparison |

## Execution Steps

### 1. Gather Inputs

```
Your site: [domain]
Top 3 competitors: [list]
Primary keywords: [list]
Key pages to compare: [list]
```

### 2. Agent Prompts

**All agents receive identical prompts for fair comparison:**

```
You are an SEO Competitive Analyst.

Audit {domain} for competitive comparison:

## TECHNICAL BASELINE

1. Core Web Vitals
   - LCP: [value]
   - INP: [value]
   - CLS: [value]

2. Mobile Friendliness
   - Viewport configured: Y/N
   - Tap targets adequate: Y/N

3. HTTPS & Security
   - HTTPS: Y/N
   - Valid SSL: Y/N

## ON-PAGE FACTORS

1. Homepage
   - Title: {title} ({length}/60)
   - Description: {desc} ({length}/160)
   - H1: {h1}

2. Key Pages (sample 3)
   - For each: title, description, H1, word count

## CONTENT ANALYSIS

1. Blog/Content Hub
   - Blog exists: Y/N
   - Estimated article count: {count}
   - Content depth (avg word count): {count}

2. Content Types
   - How-to guides: Y/N
   - Comparisons: Y/N
   - Case studies: Y/N
   - FAQs: Y/N

## KEYWORD TARGETING

For primary keywords: {keyword_list}

1. Check if keyword appears in:
   - Title tag
   - H1
   - First 100 words
   - Meta description

2. Assess keyword targeting quality

## BACKLINK PROFILE (if accessible)

1. Estimate domain authority (using available signals)
2. Note content that might attract links

## OUTPUT FORMAT

### Site Summary

| Metric | Value |
|--------|-------|
| LCP | {value}s |
| INP | {value}ms |
| CLS | {value} |
| Title Length | {value}/60 |
| Desc Length | {value}/160 |
| Avg Word Count | {value} |
| Blog Articles | {count} |

### Strengths
1. {strength}
2. {strength}

### Weaknesses
1. {weakness}
2. {weakness}

### Keyword Targeting

| Keyword | In Title | In H1 | In Content |
|---------|----------|-------|------------|
| {kw1} | Y/N | Y/N | Y/N |
| {kw2} | Y/N | Y/N | Y/N |

### Content Gaps (compared to industry standard)
1. {gap}
2. {gap}
```

### 3. Aggregate & Compare

After all agents complete, generate comparison:

```markdown
# SEO Competitive Analysis: {your_domain}
Date: {date}

## Competitors Analyzed
1. {competitor_1}
2. {competitor_2}

---

## Technical Comparison

| Metric | {your_domain} | {comp_1} | {comp_2} | Best |
|--------|---------------|----------|----------|------|
| LCP | {value}s | {value}s | {value}s | {winner} |
| INP | {value}ms | {value}ms | {value}ms | {winner} |
| CLS | {value} | {value} | {value} | {winner} |
| HTTPS | ✓/✗ | ✓/✗ | ✓/✗ | - |
| Mobile | ✓/✗ | ✓/✗ | ✓/✗ | - |

**Technical Winner:** {domain}

---

## On-Page Comparison

| Metric | {your_domain} | {comp_1} | {comp_2} |
|--------|---------------|----------|----------|
| Avg Title Length | {value} | {value} | {value} |
| Avg Desc Length | {value} | {value} | {value} |
| Avg Word Count | {value} | {value} | {value} |
| Blog Articles | {count} | {count} | {count} |

**Content Winner:** {domain}

---

## Keyword Targeting Matrix

| Keyword | {your_domain} | {comp_1} | {comp_2} |
|---------|---------------|----------|----------|
| {kw1} | ✓/✗ | ✓/✗ | ✓/✗ |
| {kw2} | ✓/✗ | ✓/✗ | ✓/✗ |
| {kw3} | ✓/✗ | ✓/✗ | ✓/✗ |

---

## Competitive Gaps

### Where You're Behind

1. **{area}**
   - Your site: {current_state}
   - {competitor}: {their_state}
   - Gap: {description}
   - Action: {specific_fix}

2. **{area}**
   - {same format}

### Where You're Ahead

1. **{area}**
   - Your advantage: {description}
   - Maintain: {action}

---

## Content Opportunities

### Content They Have, You Don't

1. **{content_type}**
   - Competitor: {url}
   - Traffic estimate: {value}
   - Recommendation: Create similar/better content

### Content Gaps in Market

1. **{topic}**
   - No competitor covers this well
   - Search demand: {evidence}
   - Recommendation: {action}

---

## Priority Actions

### Immediate (This Week)
1. {action}
2. {action}

### Short-term (This Month)
1. {action}
2. {action}

### Long-term (This Quarter)
1. {action}

---

## Competitive Monitoring

Track monthly:
- [ ] {competitor_1} new content
- [ ] {competitor_2} new content
- [ ] Ranking changes for primary keywords
- [ ] New competitors entering space
```

## Quality Gates

- [ ] All 3 sites audited with same criteria
- [ ] Comparison table complete
- [ ] Gaps identified with specific actions
- [ ] Content opportunities documented
- [ ] Priority actions assigned

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/competitor-analysis.md`
