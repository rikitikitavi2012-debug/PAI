# SEO Audit Framework

Core methodology for all SEO audits. **MANDATORY reading before any workflow.**

## Priority Order (ALWAYS follow this sequence)

1. **Crawlability & Indexation** — Can Google find and index it? (BLOCKING)
2. **Technical Foundations** — Is the site fast and functional? (HIGH IMPACT)
3. **On-Page Optimization** — Is content optimized for search? (HIGH IMPACT)
4. **Content Quality** — Does it deserve to rank? (MEDIUM TERM)
5. **Authority & Links** — Does it have credibility? (LONG TERM)

**Never audit content quality if the site isn't crawlable.** Fix blockers first.

## Quality Gates (MANDATORY)

### Gate 1: Evidence Required
- [ ] Every finding has screenshot/data evidence
- [ ] URLs, line numbers, or specific elements referenced
- [ ] No "the site seems slow" — provide LCP/FID/CLS numbers

### Gate 2: Actionability
- [ ] Each issue has specific fix (not "improve meta tags")
- [ ] Priority assigned (P0-Blocking, P1-Critical, P2-High, P3-Medium, P4-Low)
- [ ] Effort estimate (Quick fix / Medium / Large project)

### Gate 3: Impact Assessment
- [ ] Business impact stated (traffic, conversions, revenue)
- [ ] Technical debt consideration
- [ ] Dependencies identified

### Gate 4: Verification Method
- [ ] How to verify the fix worked
- [ ] Tools to use for verification
- [ ] Expected timeline for impact

## Schema Markup Detection (CRITICAL LIMITATION)

**`web_fetch` and `curl` CANNOT reliably detect JSON-LD schema markup.**

Many CMS plugins (AIOSEO, Yoast, RankMath) inject JSON-LD via client-side JavaScript — it won't appear in static HTML.

### Detection Methods (in order of reliability)

| Method | Tools | When to Use |
|--------|-------|-------------|
| **Browser rendering** | Browser skill, Playwright | Always for schema audit |
| **Google Rich Results Test** | https://search.google.com/test/rich-results | Manual verification |
| **Screaming Frog** | SF with JS rendering | Bulk site audits |

### Browser Schema Extraction

```javascript
// Run in browser console
document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
  try { console.log(JSON.parse(s.textContent)); } catch(e) {}
});
```

**NEVER report "no schema found" based solely on `web_fetch` output.**

## Issue Classification

### P0 - Blocking (Fix Immediately)
- Site not crawlable (robots.txt blocking)
- Noindex on important pages
- HTTP/HTTPS mixed content
- 5xx errors on key pages
- Manual action penalty

### P1 - Critical (Fix This Week)
- Duplicate content without canonicals
- Redirect chains/loops
- Missing meta descriptions on money pages
- Core Web Vitals failing
- Mobile usability errors

### P2 - High (Fix This Month)
- Thin content on key pages
- Missing H1 or multiple H1s
- Orphan pages (no internal links)
- Slow page speed (>3s LCP)
- Missing alt text on important images

### P3 - Medium (Plan for Next Quarter)
- Suboptimal title tags
- Missing internal linking opportunities
- Content depth issues
- Schema markup gaps
- URL structure improvements

### P4 - Low (Backlog)
- Minor meta description improvements
- Image optimization (if not affecting CWV)
- Non-critical schema additions
- Nice-to-have content enhancements

## Technical SEO Checklist

### Crawlability
- [ ] Robots.txt exists and allows important paths
- [ ] XML sitemap exists, submitted to Search Console
- [ ] Sitemap contains only canonical, indexable URLs
- [ ] Important pages within 3 clicks of homepage
- [ ] No orphan pages
- [ ] Parameter handling configured (for large sites)

### Indexation
- [ ] site:domain.com matches expected page count
- [ ] No unintended noindex tags
- [ ] Canonicals point to correct URLs
- [ ] HTTP → HTTPS redirects work
- [ ] www/non-www consistent
- [ ] Trailing slash consistent
- [ ] No redirect chains (>1 hop)
- [ ] No soft 404s

### Site Speed & Core Web Vitals
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] INP < 200ms (Interaction to Next Paint)
- [ ] CLS < 0.1 (Cumulative Layout Shift)
- [ ] TTFB < 600ms (Time to First Byte)
- [ ] Images optimized (WebP, lazy loading)
- [ ] JavaScript not blocking render
- [ ] CSS not blocking render
- [ ] Fonts optimized (font-display: swap)

### Mobile
- [ ] Responsive design (not m. subdomain)
- [ ] Tap targets >= 48x48px
- [ ] No horizontal scroll
- [ ] Viewport meta tag present
- [ ] Same content as desktop

### Security
- [ ] HTTPS everywhere
- [ ] Valid SSL certificate
- [ ] No mixed content warnings
- [ ] HTTP → HTTPS redirects

## On-Page SEO Checklist

### Title Tags
- [ ] Unique per page
- [ ] 50-60 characters
- [ ] Primary keyword near beginning
- [ ] Compelling, click-worthy
- [ ] NO brand name at end (SERPs add it automatically)

### Meta Descriptions
- [ ] Unique per page
- [ ] 150-160 characters
- [ ] Includes primary keyword
- [ ] Clear value proposition
- [ ] Call to action

### Heading Structure
- [ ] Exactly one H1 per page
- [ ] H1 contains primary keyword
- [ ] Logical hierarchy (H1 → H2 → H3)
- [ ] Headings describe content, not just styling

### Content
- [ ] Keyword in first 100 words
- [ ] Related keywords naturally integrated
- [ ] Sufficient depth for topic
- [ ] Answers search intent
- [ ] Better than top-ranking competitors

### Images
- [ ] Descriptive file names
- [ ] Alt text on all images
- [ ] Compressed file sizes
- [ ] Modern formats (WebP)
- [ ] Lazy loading for below-fold

### Internal Linking
- [ ] Important pages well-linked
- [ ] Descriptive anchor text
- [ ] No broken internal links
- [ ] Reasonable links per page (<100)

## E-E-A-T Assessment

### Experience
- First-hand experience demonstrated
- Original insights/data
- Real examples and case studies
- Author has done the thing

### Expertise
- Author credentials visible
- Accurate, detailed information
- Properly sourced claims
- Technical depth appropriate

### Authoritativeness
- Recognized in the space
- Cited by others
- Industry credentials
- Awards/certifications

### Trustworthiness
- Contact information available
- Privacy policy present
- Secure site (HTTPS)
- Transparent about business
- Accurate information

## Output Format

### Executive Summary
- Overall health score (1-100)
- Top 5 priority issues
- Quick wins available
- Estimated traffic impact

### Detailed Findings

For each issue:
```
## [P0-P4] Issue Title

**Impact:** High/Medium/Low
**Evidence:** [screenshot/data]
**Affected URLs:** /path1, /path2

**Problem:**
[Specific description of what's wrong]

**Fix:**
[Exact steps to resolve]

**Verification:**
[How to confirm fix worked]

**Timeline:**
[Expected impact timeline]
```

### Prioritized Action Plan
1. P0 items (this week)
2. P1 items (this month)
3. Quick wins (immediate)
4. Long-term improvements

## Tools Reference

### Free (Always Available)
- Google Search Console — Indexation, Core Web Vitals, manual actions
- PageSpeed Insights — Speed + CWV
- Rich Results Test — Schema validation (renders JS)
- Mobile-Friendly Test — Mobile usability
- site: operator — Index check

### In PAI
- **Browser skill** — JS rendering, screenshots
- **Research skill** — Competitor analysis
- **Media skill** — Evidence screenshots

### Paid (If Available)
- Screaming Frog — Technical crawler
- Ahrefs/Semrush — Backlinks, keywords, competitive
- Sitebulb — Visual SEO audits

## Russian SEO Specifics

### Yandex Considerations
- Yandex Webmaster verification
- Yandex.Metrika integration
- Regional targeting (гео-привязка)
- Yandex Catalog (if applicable)
- .ru vs .com considerations

### Russian Content Quality
- Native Russian (not machine-translated)
- Proper typography (mdash, quotes)
- Cultural relevance
- Local examples/case studies

## Common Issues by Site Type

### SaaS/Product
- Product pages lack depth
- Missing comparison pages
- No glossary/educational content
- Blog not integrated with product

### E-commerce
- Thin category pages
- Duplicate product descriptions
- Missing product schema
- Faceted navigation duplicates

### Local Business
- Inconsistent NAP (Name, Address, Phone)
- Missing local schema
- No Google Business Profile optimization
- Missing location pages

### Content/Blog
- Keyword cannibalization
- No topical clusters
- Poor internal linking
- Outdated content
