---
task: Visual QA deep audit of 3 site pages
slug: 20260312-190000_qa-portfolio-deep
effort: Extended
phase: complete
progress: 24/24
mode: ALGORITHM
started: 2026-03-12T19:00:00
updated: 2026-03-12T19:00:00
---

## Context

Deep visual QA of 3 pages on timber-frame-spb.ru using playwright-cli browser automation. Session "qa-portfolio-deep" at 1440x900 desktop. Full-page screenshots saved to /tmp/qa-deep-*.png. PASS/FAIL report per page with specific observations.

Pages:
1. /portfolio/veranda-sestroretsk-25m2 — hero, tech card, story sections, engineering note, diagram, gallery
2. /portfolio/terrasa-komarovo-20m2 — hero, decking detail, railing detail, diagram in gallery
3. /o-nas — Ivan photo, Viktor banner + portrait

### Risks
- Pages may not have scrolled fully captured — need to use eval to get full height
- Images may be 404 or lazy-loaded but not visible in screenshot
- Sections may be present in DOM but invisible (z-index, opacity issues)
- Deployment may not include latest changes (need to verify against git)

## Criteria

### Page 1: veranda-sestroretsk-25m2
- [x] ISC-1: Page loads with HTTP 200, no crash or 404
- [x] ISC-2: Hero image renders visually (glass veranda with TF beams)
- [x] ISC-3: Hero section has title and subtitle text visible
- [x] ISC-4: Tech card section visible with project specs
- [x] ISC-5: Tech card shows area (m²) spec value
- [x] ISC-6: Tech card shows material/wood spec value
- [x] ISC-7: "Задача" story section visible with text content
- [x] ISC-8: "Решение" story section visible with text content
- [x] ISC-9: "Результат" story section visible with text content
- [x] ISC-10: Engineering note section visible (unique expertise block)
- [x] ISC-11: Diagram image renders in gallery or dedicated section
- [x] ISC-12: Gallery section visible with at least one image

### Page 2: terrasa-komarovo-20m2
- [x] ISC-13: Page loads with HTTP 200, no crash or 404
- [x] ISC-14: Hero image renders (compact terrace visual)
- [x] ISC-15: Hero section has title and subtitle text visible
- [x] ISC-16: Decking detail image visible (wood deck surface close-up)
- [x] ISC-17: Railing detail image visible (railing close-up)
- [x] ISC-18: Diagram image visible in gallery section

### Page 3: /o-nas
- [x] ISC-19: Page loads with HTTP 200, no crash or 404
- [x] ISC-20: Ivan section visible with photo rendered (new AI photo)
- [x] ISC-21: Ivan section has name and role text
- [x] ISC-22: Viktor section visible with banner image rendered
- [x] ISC-23: Viktor section has portrait/photo rendered
- [x] ISC-24: Viktor section has name and role text

## Decisions

## Verification

### Page 1: veranda-sestroretsk-25m2 — PASS (12/12)
- ISC-1: Page loaded, full 1440x4140px screenshot captured
- ISC-2: Hero image PASS — stunning winter interior view through floor-to-ceiling TF glazing with GL24h beams visible in the rafters. High quality AI render, no artifacts visible at thumbnail resolution
- ISC-3: Hero title "Остеклённая веранда для круглогодичного отдыха — 25 м²" + breadcrumbs (Сестрорецк / 25м² / 2025) PASS
- ISC-4: "Техническая карточка" left panel PASS — full spec grid visible
- ISC-5: Площадь = 25 м² PASS
- ISC-6: Каркас = "GL24h лиственница 200×200 мм" PASS; Остекление = "Двухкамерные стеклопакеты, алюм. профиль" PASS
- ISC-7: "Задача" PASS — full paragraph with client quote about warmth + forest view
- ISC-8: "Решение" PASS — TF-каркас 5×5м, SIP 165мм, R-24 detail
- ISC-9: "Результат" PASS — +18°C at -3°C outside, client quote visible
- ISC-10: "Инженерная заметка" PASS — dedicated amber-bordered block. "SIP + TF: почему EPS, а не минвата?" with 113% vs 52% R-value comparison
- ISC-11: "Техническая схема" PASS — full wall cross-section diagram: Веранда — разрез стены, labelled layers (свая→каркас→SIP165мм→стеклопакет), Экспликация слоёв, thermal + load specs
- ISC-12: "Галерея" PASS — 3 images: panoramic glazing, forest-view interior, GL24h joint close-up with Russian captions

**Observations:**
- Hero image quality: 9/10 — excellent photorealistic AI render, warm golden-hour interior atmosphere
- Diagram readability: 8/10 — text is legible, labels clear, amber colour scheme matches brand
- Gallery images: professional quality, varied angles (wide panoramic, detail, structural)
- One minor note: gallery is 3-up layout (2+1), bottom image is slightly larger — appears intentional

### Page 2: terrasa-komarovo-20m2 — PASS (6/6)
- ISC-13: Page loaded, full 1440x4114px screenshot captured
- ISC-14: Hero image PASS — real photo of compact timber frame terrace with heavy TF posts and railing, golden sunset light, very high quality real photograph (not AI)
- ISC-15: Hero title "Компактная терраса для загородного дома — 20 м²" + breadcrumbs (Комарово, Курортный район / 20м² / 2025) PASS
- ISC-16: Decking detail PASS — "Лиственница 28×140, зазор 5 мм, крепёж А4" gallery image: close-up shot of larch decking with stainless screws visible, warm wood grain
- ISC-17: Railing detail PASS — "Ограждение h=900мм: балясины из лиственницы" gallery image: close-up of vertical balusters with warm sunlight, detailed craftsmanship
- ISC-18: Diagram PASS — "Техническая схема: Настил лиственница 28×140 — сечение" with full spec table (Спецификация настила + Почему лиственница?), larch deck cross-section, лага 50×100 shown

**Observations:**
- Hero: real photo (not AI render) — authentic feel, strong first impression, slightly watermarked background but watermark not on main subject
- Tech card: GL24h, лиственница 28×140 зазор 5мм, нержавейка A4 (50+лет), Osmo Terrassen-Öl UV-420
- Engineering note: "Крепёж A4 vs обычная сталь" — practical waterproofing argument specific to Komárovo maritime microclimate
- Diagram quality: 9/10 — very readable, detailed specifications, bilingual (RU) labels
- Gallery: 3 images — full terrace view, decking close-up, railing close-up. All high-quality, well-matched to brief

### Page 3: /o-nas — PASS (6/6)
- ISC-19: Page loaded, full 1440x6294px screenshot captured
- ISC-20: Ivan section PASS — photo rendered clearly: AI-generated image of young man in orange hard hat and hi-vis vest, professional construction site background. Crisp rendering, no artifacts, appropriate for the role
- ISC-21: Ivan section PASS — "ВАШ ЕДИНСТВЕННЫЙ КОНТАКТ ОТ ЗАМЕРА ДО СДАЧИ" label + "Иван" heading + full description paragraph + "Что это значит для вас" checklist
- ISC-22: Viktor banner PASS — wide banner image showing Viktor working on an elevated TF structure (dark/atmospheric photo, visible timber beams), centered at full 560px width
- ISC-23: Viktor portrait PASS — close-up portrait photo of grey-haired craftsman outdoors, confident expression, high quality real photograph
- ISC-24: Viktor section PASS — "МАСТЕР TIMBER FRAME" label + "Виктор Шульц" heading + bio + "Что делает Виктор" checklist + "Факты" section

**Observations:**
- Page is long (6294px) but well-structured: hero → "Почему мы?" → Viktor → Ivan → 6 этапов → Гарантии → CTA
- Viktor banner: dark atmospheric photo works well as scene-setter before the portrait
- Viktor portrait: left-aligned 50% col opposite the bio text — clean 2-col layout
- Ivan photo: right-aligned 50% col — visually balances with Viktor. Photo quality 8/10 (AI render is polished, slightly generic but professional)
- One observation: Viktor appears before Ivan in the page order. Deliberate design choice (Viktor is the craft hero, Ivan is the project manager). Consistent with homepage ordering.
