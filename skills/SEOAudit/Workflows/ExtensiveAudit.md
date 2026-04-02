# ExtensiveAudit Workflow

Deep comprehensive SEO audit with 12 parallel agents. Full site analysis.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю глубокий SEO аудит, двенадцать агентов параллельно", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **ExtensiveAudit** в скилле **SEOAudit**...

## Agent Matrix (12 Agents, 4 Categories)

| Category | Agents | Focus |
|----------|--------|-------|
| **Technical** | 3 | Crawl, Index, Speed |
| **On-Page** | 3 | Meta, Content, Images |
| **Quality** | 3 | E-E-A-T, UX, Conversion |
| **Competitive** | 3 | Your Site, Comp 1, Comp 2 |

## Execution Steps

### 1. Gather Inputs

```
URL: [domain]
Expected page count: [number]
Key pages: [list, up to 20]
Primary keywords: [list]
Top competitors: [list, 2-3]
Business goals: [description]
Target audience: [description]
```

### 2. Spawn Technical Agents (3)

**Agent T1: Crawlability**
```
Audit {domain} crawlability:
- Robots.txt analysis
- Sitemap validation
- Site architecture (click depth)
- Internal linking structure
- Orphan page detection
- Crawl budget issues (if large site)

Output: 5-10 findings with P0-P4 priorities
```

**Agent T2: Indexation**
```
Audit {domain} indexation:
- site: operator check
- Index bloat detection
- Noindex/nofollow audit
- Canonical verification
- Redirect mapping
- Parameter URL handling

Output: 5-10 findings with P0-P4 priorities
```

**Agent T3: Performance**
```
Audit {domain} performance:
- Core Web Vitals (LCP, INP, CLS)
- TTFB analysis
- Image optimization
- JavaScript/CSS blocking
- Server response time
- CDN usage
- Font loading

Output: 5-10 findings with P0-P4 priorities
```

### 3. Spawn On-Page Agents (3)

**Agent O1: Meta & Structure**
```
Audit {domain} meta tags:
- Title tags (all key pages)
- Meta descriptions (all key pages)
- Heading structure (H1-H6)
- URL structure
- Canonical tags
- OG tags for social

Output: 10-15 findings with P0-P4 priorities
```

**Agent O2: Content Optimization**
```
Audit {domain} content:
- Keyword targeting per page
- Content depth vs competitors
- Keyword cannibalization check
- Duplicate content detection
- Thin content identification
- Content freshness

Output: 10-15 findings with P0-P4 priorities
```

**Agent O3: Media & Assets**
```
Audit {domain} media:
- Image alt text
- Image file sizes
- Modern formats (WebP)
- Lazy loading
- Video optimization
- Schema for media

Output: 5-10 findings with P0-P4 priorities
```

### 4. Spawn Quality Agents (3)

**Agent Q1: E-E-A-T**
```
Audit {domain} E-E-A-T:
- Author information
- Credentials display
- Original content/data
- External citations
- Trust signals
- Contact information

Output: 5-10 findings with P0-P4 priorities
```

**Agent Q2: User Experience**
```
Audit {domain} UX:
- Mobile usability
- Navigation clarity
- Page layout
- Readability
- Accessibility basics
- Error handling

Output: 5-10 findings with P0-P4 priorities
```

**Agent Q3: Conversion Paths**
```
Audit {domain} conversion:
- CTA visibility
- Form optimization
- Trust elements on conversion pages
- Page speed on money pages
- Cross-sell/up-sell opportunities

Output: 5-10 findings with P0-P4 priorities
```

### 5. Spawn Competitive Agents (3)

**Agent C1: Your Site Baseline**
```
Create baseline for {domain}:
- Technical metrics summary
- Content inventory
- Keyword coverage
- Backlink profile overview
- Traffic estimates

Output: Baseline report for comparison
```

**Agent C2: Competitor 1 Analysis**
```
Analyze {competitor_1}:
- Same metrics as baseline
- Content gaps they fill
- Keywords they rank for
- Technical advantages
- Weaknesses to exploit

Output: Competitive comparison
```

**Agent C3: Competitor 2 Analysis**
```
Analyze {competitor_2}:
- Same metrics as baseline
- Content gaps they fill
- Keywords they rank for
- Technical advantages
- Weaknesses to exploit

Output: Competitive comparison
```

### 6. Aggregate Results

```markdown
# Extensive SEO Audit: {domain}
Date: {date}
Agents: 12 (4 categories × 3 agents)
Scope: {page_count} pages, {keyword_count} keywords

---

## Executive Summary

### Overall Health Score: {score}/100

| Category | Score | Critical Issues |
|----------|-------|-----------------|
| Technical | {score}/100 | {count} |
| On-Page | {score}/100 | {count} |
| Quality | {score}/100 | {count} |
| Competitive Position | {score}/100 | {count} |

### Top 10 Priority Issues

1. **[P0] {issue}** — {impact}
2. **[P1] {issue}** — {impact}
3. **[P1] {issue}** — {impact}
4. **[P2] {issue}** — {impact}
5. **[P2] {issue}** — {impact}
6. **[P2] {issue}** — {impact}
7. **[P3] {issue}** — {impact}
8. **[P3] {issue}** — {impact}
9. **[P3] {issue}** — {impact}
10. **[P4] {issue}** — {impact}

### Quick Wins (Can fix this week)
1. {quick_win_1}
2. {quick_win_2}
3. {quick_win_3}

---

## Technical SEO (Agents T1-T3)

### Crawlability

{Agent T1 findings}

### Indexation

{Agent T2 findings}

### Performance

{Agent T3 findings}

---

## On-Page SEO (Agents O1-O3)

### Meta & Structure

{Agent O1 findings}

### Content

{Agent O2 findings}

### Media

{Agent O3 findings}

---

## Quality Signals (Agents Q1-Q3)

### E-E-A-T

{Agent Q1 findings}

### User Experience

{Agent Q2 findings}

### Conversion

{Agent Q3 findings}

---

## Competitive Analysis (Agents C1-C3)

### Position vs Competitors

| Metric | {your_domain} | {comp_1} | {comp_2} |
|--------|---------------|----------|----------|
| Technical Score | {score} | {score} | {score} |
| Content Score | {score} | {score} | {score} |
| Keyword Coverage | {count} | {count} | {count} |
| Estimated Traffic | {value} | {value} | {value} |

### Competitive Gaps

{What competitors have that you don't}

### Competitive Advantages

{What you have that competitors don't}

---

## Prioritized Action Plan

### Week 1: Critical Fixes (P0-P1)
| Action | Effort | Impact | Owner |
|--------|--------|--------|-------|
| {action} | {quick/med} | High | {who} |
| {action} | {quick/med} | High | {who} |

### Month 1: High Priority (P2)
| Action | Effort | Impact | Owner |
|--------|--------|--------|-------|
| {action} | {med/large} | Med | {who} |

### Quarter 1: Medium Priority (P3-P4)
| Action | Effort | Impact | Owner |
|--------|--------|--------|-------|
| {action} | {large} | Low-Med | {who} |

---

## New Content Recommendations

1. **{Content Piece}**
   - Type: {blog/product/guide}
   - Target Keyword: {keyword}
   - Est. Traffic: {value}
   - Priority: {P1-P4}

---

## Monitoring & Verification

### Post-Fix Verification

- [ ] Re-run Core Web Vitals
- [ ] Submit sitemap to Search Console
- [ ] Request indexing for updated pages
- [ ] Monitor rankings for target keywords
- [ ] Track organic traffic in Analytics

### Ongoing Monitoring

- Weekly: Search Console errors
- Monthly: Ranking positions
- Quarterly: Full audit refresh

---

## Appendix

### Full Finding List (All 12 Agents)

{Detailed findings from each agent}

### Raw Agent Outputs

- T1-Crawlability.md
- T2-Indexation.md
- T3-Performance.md
- O1-MetaStructure.md
- O2-Content.md
- O3-Media.md
- Q1-EEAT.md
- Q2-UX.md
- Q3-Conversion.md
- C1-Baseline.md
- C2-Competitor1.md
- C3-Competitor2.md
```

## Quality Gates

- [ ] All 12 agents completed
- [ ] At least 50 total findings
- [ ] Every finding has evidence
- [ ] Every finding has specific fix
- [ ] Competitive comparison complete
- [ ] Action plan prioritized
- [ ] Effort estimates included

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/`
- `extensive-report.md` — Main report
- `agents/` — Individual agent outputs
- `competitive/` — Competitive analysis
- `action-plan.md` — Prioritized actions
