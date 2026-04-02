# SchemaAudit Workflow

Structured data audit with Browser rendering. **CRITICAL: Requires browser for accurate detection.**

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Запускаю аудит микроразметки Schema", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

Запускаю **SchemaAudit** в скилле **SEOAudit**...

## Why Browser is Required

**`web_fetch` and `curl` CANNOT detect most JSON-LD schema markup.**

CMS plugins inject schema via JavaScript — only visible after page render:
- Yoast SEO
- RankMath
- AIOSEO
- WooCommerce
- Most custom implementations

**This workflow MUST use the Browser skill for accurate results.**

## Execution Steps

### 1. Gather Inputs

```
URL to audit: [page_url]
Schema types expected: [Product, Article, LocalBusiness, FAQ, etc.]
```

### 2. Browser Rendering

**Use Browser skill to:**

```javascript
// Navigate to page
await page.goto(url, { waitUntil: 'networkidle' });

// Extract all JSON-LD
const schemas = await page.evaluate(() => {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  return Array.from(scripts).map(s => {
    try {
      return JSON.parse(s.textContent);
    } catch(e) {
      return { error: e.message, raw: s.textContent };
    }
  });
});

console.log(JSON.stringify(schemas, null, 2));
```

### 3. Schema Validation

For each schema found:

**3.1 Identify Type**
```javascript
const schemaType = schema['@type'];
// Common types: Product, Article, LocalBusiness, FAQPage, HowTo, BreadcrumbList, Organization, WebSite
```

**3.2 Check Required Properties**

| Schema Type | Required Properties |
|-------------|---------------------|
| **Product** | name, offers (price, priceCurrency), availability |
| **Article** | headline, author, datePublished, image |
| **LocalBusiness** | name, address, telephone, openingHours |
| **FAQPage** | mainEntity (array of Question) |
| **HowTo** | name, step (array) |
| **BreadcrumbList** | itemListElement (array of ListItem) |
| **Organization** | name, url |
| **WebSite** | name, url |

**3.3 Check Recommended Properties**

| Schema Type | Recommended Properties |
|-------------|------------------------|
| **Product** | description, image, brand, sku, review, aggregateRating |
| **Article** | description, publisher, dateModified, mainEntityOfPage |
| **LocalBusiness** | image, priceRange, geo, sameAs (social links) |
| **FAQPage** | Each Question needs acceptedAnswer |
| **HowTo** | description, image, totalTime, estimatedCost |
| **Organization** | logo, sameAs, contactPoint |
| **WebSite** | potentialAction (SearchAction) |

### 4. Google Rich Results Test

For critical schemas, validate via:
```
https://search.google.com/test/rich-results?url={encoded_url}
```

Note: This requires manual check or Browser automation.

### 5. Generate Report

```markdown
# Schema Audit: {url}
Date: {date}

## Summary

| Schema Type | Present | Valid | Missing Required | Missing Recommended |
|-------------|---------|-------|------------------|---------------------|
| Product | ✓/✗ | ✓/✗ | {fields} | {fields} |
| LocalBusiness | ✓/✗ | ✓/✗ | {fields} | {fields} |
| FAQPage | ✓/✗ | ✓/✗ | {fields} | {fields} |

## Detailed Findings

### {SchemaType}

**Status:** {Valid / Invalid / Missing}

**Current JSON-LD:**
```json
{schema_content}
```

**Issues:**
- [P2] Missing required field: `{field}` — Add {guidance}
- [P3] Missing recommended field: `{field}` — {benefit}

**Recommended Addition:**
```json
{
  "suggested_field": "value"
}
```

## Implementation Guide

### Priority 1: Fix Invalid Schemas

{step_by_step_for_each_invalid}

### Priority 2: Add Missing Required Fields

{step_by_step_for_each_missing_required}

### Priority 3: Add Recommended Fields

{step_by_step_for_each_missing_recommended}

## Rich Results Preview

After fixes, test at:
- https://search.google.com/test/rich-results?url={url}
- https://validator.schema.org/

## Expected Impact

- {schema_type} rich results in SERP
- Enhanced snippet appearance
- Potential CTR increase: {estimate}%
```

## Common Schema Issues

### Product Schema
```
Missing: offers.priceCurrency
Fix: Add "priceCurrency": "RUB"

Missing: availability
Fix: Add "availability": "https://schema.org/InStock"

Missing: aggregateRating
Impact: No star rating in search results
```

### LocalBusiness Schema
```
Missing: openingHours
Fix: Add "openingHours": "Mo-Fr 09:00-18:00"

Missing: geo (coordinates)
Impact: No map pin in local search

Missing: sameAs (social links)
Impact: No social profiles in knowledge panel
```

### FAQPage Schema
```
Error: acceptedAnswer not properly formatted
Fix: Ensure each Question has acceptedAnswer with text property

Missing: mainEntity array
Fix: Wrap questions in mainEntity: [{ "@type": "Question", ... }]
```

## Quality Gates

- [ ] Browser rendering used (not web_fetch)
- [ ] All schema types identified
- [ ] Required properties checked
- [ ] Recommended properties checked
- [ ] Implementation guide provided
- [ ] Rich Results Test URL provided

## Output Location

`~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/schema-audit.md`
