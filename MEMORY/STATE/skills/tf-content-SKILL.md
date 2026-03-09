---
name: tf-content
title: "TFContent - Timber Frame Content Creation"
description: "Expert Timber Frame content creation — SEO articles, blog posts, product descriptions, and competitor analysis for timber-frame-spb.ru. Use when writing articles, blog posts, timber frame content, SEO content, product pages, terrace descriptions, TF expertise, brand voice check, competitor content analysis."
version: "1.1.0"
author: "Ivan (PAI)"
tags: [content, seo, timber-frame, copywriting, russian, marketing, wordstat]
trigger_patterns: ["напиши статью", "контент", "террас", "timber frame", "SEO", "блог", "описание", "товар", "brand voice", "частотност", "ключевы"]
allowed_tools: [code_execution_tool, memory_save, memory_load, response, document_query, call_subordinate]
---

# TFContent

Expert content creation skill for Timber Frame террасы/веранды/навесы (СПб и ЛО).

Combines construction domain expertise, brand voice, buyer personas, and SEO targeting into publication-ready content.

## 🚨 MANDATORY: Load Knowledge Base

**Before ANY content creation, read these files in order:**

1. `/a0/usr/skills/tf-content/TFExpertise.md` — Construction domain knowledge (materials, norms, pricing, climate)
2. `/a0/usr/skills/tf-content/TFBrandVoice.md` — Tone of Voice rules, persona targeting, anti-patterns
3. Target article brief (from user instructions or provided context)

**Do NOT write content without reading TFExpertise.md first. This is the core differentiator — expert-level construction knowledge, not generic copywriting.**

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Wordstat research, keyword frequencies, collect search data | `Workflows/WordstatResearch.md` |
| Write blog article, create post, MOFU content | `Workflows/WriteArticle.md` |
| SEO audit, keyword check, meta descriptions | `Workflows/SEOContent.md` |
| Product page, service description, landing copy | `Workflows/ProductPage.md` |
| Brand voice review, tone check, content edit | `Workflows/BrandVoiceReview.md` |

## Quality Gates (MANDATORY)

Every piece of content must pass ALL gates before delivery:

### Gate 0: Data-Driven Keywords (NEW)
- [ ] Keyword Brief with real Wordstat frequencies exists
- [ ] Primary/Secondary/Supporting keywords identified from data
- [ ] No keyword guessing — all based on search demand

### Gate 1: Brand Voice Compliance
- [ ] No forbidden phrases (see TFBrandVoice.md → Anti-Patterns)
- [ ] Concrete numbers present (цена, сроки, размеры, материалы)
- [ ] Tone: Expert + Informal + Concrete (70% friendly, 80% technical, 90% factual)
- [ ] No corporate speak ("широкий спектр услуг", "команда профессионалов")

### Gate 2: Technical Accuracy
- [ ] Material specs verified against TFExpertise.md
- [ ] Pricing ranges match current data (TF premium от 50 000 ₽/м²)
- [ ] Normative references correct (СП 64.13330, СП 20.13330)
- [ ] Climate claims backed by data (влажность СПб 78%, морозы до -30°C)

### Gate 3: SEO Integration
- [ ] Target keywords naturally integrated (not stuffed)
- [ ] H1/H2 contain primary keyword
- [ ] Meta description 150-160 chars with keyword + CTA
- [ ] Internal links to relevant pages (калькулятор, технология, террасы)

### Gate 4: Persona Alignment
- [ ] Target persona explicitly identified
- [ ] Addresses persona's specific fears/objections
- [ ] CTA matches persona's stage in customer journey
- [ ] Language complexity appropriate for persona

## Wordstat Integration

**API Endpoint:** `https://api.direct.yandex.com/v4/json/`
**Secret:** `YANDEX_WORDSTAT_TOKEN`
**Default GeoID:** 2 (Санкт-Петербург)

Every article MUST start with WordstatResearch workflow to collect real keyword data.

## Examples

### Example 1: Blog Article
```
User: Напиши статью "Что такое Timber Frame?" для блога
→ Step 0: Route to WordstatResearch (collect keyword frequencies)
→ Step 1-5: Route to WriteArticle workflow
→ Load: TFExpertise.md + TFBrandVoice.md + Keyword Brief
→ Target: Елена (не знает TF), 1500 слов, MOFU
→ Output: Markdown article + meta description + internal links + wordstat_data in frontmatter
```

### Example 2: SEO Content Audit
```
User: Проверь SEO-оптимизацию страницы "Террасы"
→ Route: SEOContent workflow
→ Load: SEO_SEMANTIC_CORE.md + current page content
→ Output: Keyword gaps + suggested improvements + meta tags
```

### Example 3: Brand Voice Review
```
User: Проверь текст на соответствие голосу бренда
→ Route: BrandVoiceReview workflow
→ Load: TFBrandVoice.md + input text
→ Output: Violations list + corrected version
```

### Example 4: Keyword Research
```
User: Собери частотности для темы "терраса из лиственницы"
→ Route: WordstatResearch workflow
→ Output: Keyword Brief with frequencies for 3-7 phrase variations
```
