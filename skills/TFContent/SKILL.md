---
name: TFContent
description: Expert Timber Frame content creation — SEO articles, blog posts, product descriptions, and competitor analysis for timber-frame-spb.ru. USE WHEN write article, blog post, timber frame content, SEO content, product page, terrace description, TF expertise, brand voice check, competitor content analysis, напиши статью, создай контент, SEO оптимизация, описание террасы, проверь голос бренда, контент для сайта, timber frame контент.
context: fork
---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле TFContent", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Запускаю **WorkflowName** в скилле **TFContent**...
   ```

# TFContent

Expert content creation skill for Timber Frame террасы/веранды/навесы (СПб и ЛО).

Combines construction domain expertise, brand voice, buyer personas, and SEO targeting into publication-ready content.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/TFContent/`

If this directory exists, load and apply any PREFERENCES.md or resources found there.

## 🚨 MANDATORY: Load Knowledge Base

**Before ANY content creation, read these files in order:**

1. `~/.claude/skills/TFContent/TFExpertise.md` — Core domain knowledge (materials, norms, pricing, climate, masters, joinery, typology)
2. `~/.claude/skills/TFContent/TFBrandVoice.md` — Tone of Voice rules, persona targeting, anti-patterns
3. Target article brief (from `docs/A0_TASK_BRIEF.md` or user instructions)

**Deep expertise (load on-demand for specific topics):**
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/01-masters-world.md` — 15 мировых мастеров (Benson/Tektoniks, Ben Law/roundwood)
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/02-masters-russia.md` — российские мастера (Притуп + школы)
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/03-books-and-standards.md` — 16 книг + все стандарты
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/04-joinery-and-typology.md` — 12 соединений + 10 типологий
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/05-history.md` — хронология 7000 лет
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/06-organizations-and-media.md` — организации + YouTube

**YouTube & Blog insights (load for practitioner-level content):**
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/08-youtube-insights.md` — 10 videos, 500+ insights от мастеров (Square Rule, bladed scarf, production rates)
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/12-blog-insights.md` — doloto.info, timberframehq, bensonwood, ben-law

**Academic & Engineering (load for technical articles):**
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/09-glulam-connections.md` — EN 14080, delamination, fire (shear=3.5 all GL grades)
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/11-structural-analysis-joinery.md` — 13 papers: M-theta, dovetail gap=-50%, scarf=28-31%
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/13-engineering-deep-dive.md` — Snow, SIP R-24, roundwood +40%, foundations, costs
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/14-mortise-tenon-structural-testing.md` — Miller/Schmidt: design equation, 22 specimens, peg data

**Historical texts (load for authority-building content):**
- `~/.claude/MEMORY/RESEARCH/2026-03/tf-knowledge-base/10-historical-texts.md` — Moxon 1703, Tredgold 1820 (L/480), Nicholson, Audel's, русское зодчество

**Инженерные данные (load on-demand для технических статей):**
- `~/.claude/PAI/USER/DOMAINS/construction/timber_frame/TF_Engineering.md` — Расчёты M&T, bent frame, мост TFEC↔СП 64
- `~/.claude/PAI/USER/DOMAINS/construction/timber_frame/TF_Joinery_Specs.md` — Размеры, допуски, нагели
- `~/.claude/PAI/USER/DOMAINS/construction/timber_frame/TF_Materials.md` — GL24h, лиственница, покрытия, поставщики
- `~/.claude/PAI/USER/DOMAINS/construction/timber_frame/TF_Climate_SPB.md` — Адаптация к климату, TCO, аргументы для клиентов
- `~/.claude/PAI/USER/DOMAINS/construction/timber_frame/TF_vs_SP64_Bridge.md` — Алгоритм проектирования по двум стандартам
- `~/.claude/PAI/USER/DOMAINS/construction/normatives/SP64_Wooden_Structures.md` — Базовые расчёты по СП 64

**Принцип экспертного контента:** демонстрировать понимание "ПОЧЕМУ", а не "ЧТО". Каждое решение объяснять через причинно-следственные связи. Ссылаться на мастеров и книги как доказательство глубины знаний. Подкреплять инженерными расчётами из DOMAINS.

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
