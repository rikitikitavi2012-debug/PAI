---
name: TFContent
description: Expert Timber Frame content creation — SEO articles, blog posts, product descriptions, and competitor analysis for timber-frame-spb.ru. USE WHEN write article, blog post, timber frame content, SEO content, product page, terrace description, TF expertise, brand voice check, competitor content analysis.
context: fork
---

# TFContent

Expert content creation skill for Timber Frame террасы/веранды/навесы (СПб и ЛО).

Combines construction domain expertise, brand voice, buyer personas, and SEO targeting into publication-ready content.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/TFContent/`

If this directory exists, load and apply any PREFERENCES.md or resources found there.

## 🚨 MANDATORY: Load Knowledge Base

**Before ANY content creation, read these files in order:**

1. `~/.claude/skills/TFContent/TFExpertise.md` — Construction domain knowledge (materials, norms, pricing, climate)
2. `~/.claude/skills/TFContent/TFBrandVoice.md` — Tone of Voice rules, persona targeting, anti-patterns
3. Target article brief (from `docs/A0_TASK_BRIEF.md` or user instructions)

**Do NOT write content without reading TFExpertise.md first. This is the core differentiator — expert-level construction knowledge, not generic copywriting.**

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Wordstat research, keyword frequencies, collect search data | `Workflows/WordstatResearch.md` |
| Write blog article, create post, MOFU content | `Workflows/WriteArticle.md` (auto-calls WordstatResearch first) |
| Article with images, illustrated post, visual content | `Workflows/IllustratedArticle.md` (brigade: A0 text + Navi images) |
| SEO audit, keyword check, meta descriptions | `Workflows/SEOContent.md` |
| Product page, service description, landing copy | `Workflows/ProductPage.md` |
| Brand voice review, tone check, content edit | `Workflows/BrandVoiceReview.md` |

## Quality Gates (MANDATORY)

Every piece of content must pass ALL gates before delivery:

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

## Examples

### Example 1: Blog Article
```
User: Напиши статью "Что такое Timber Frame?" для блога
→ Route: WriteArticle workflow
→ Load: TFExpertise.md + TFBrandVoice.md + A0_TASK_BRIEF.md
→ Target: Елена (не знает TF), 1500 слов, MOFU
→ Output: Markdown article + meta description + internal links
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
