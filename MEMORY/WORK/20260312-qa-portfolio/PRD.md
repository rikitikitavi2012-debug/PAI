---
task: Visual QA portfolio pages with browser screenshots
slug: 20260312-qa-portfolio
effort: Extended
phase: complete
progress: 24/24
mode: ALGORITHM
started: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:00:00Z
---

## Context

Visual QA audit of timber-frame-spb.ru portfolio pages using browser automation. 5 pages total: 2 desktop, 3 mobile (with overlap). Each page has specific checks for images, UI elements, layout. Session name "qa-portfolio", screenshots to /tmp/qa-portfolio-*.png. PASS/FAIL per page.

### Risks
- Pages may be slow to load (Vercel cold start)
- Images may be actual Next.js placeholder (gray) if not uploaded yet
- Hover effects not verifiable via static screenshot alone
- Mobile scrollability only inferred from visible scroll indicators
- Gallery images may require JS to render (SSR vs CSR)

## Criteria

### Page 1: /portfolio desktop 1440x900
- [x] ISC-1: Screenshot saved to /tmp/qa-portfolio-1-portfolio-desktop.png
- [x] ISC-2: Page loads without error (no 404/500)
- [x] ISC-3: At least 5 project cards visible in the grid
- [x] ISC-4: Cards show real images (not gray Next.js placeholders)
- [x] ISC-5: Filter pills (tabs) visible above the grid

### Page 2: /portfolio/terrasa-repino-40m2 desktop 1440x900
- [x] ISC-6: Screenshot saved to /tmp/qa-portfolio-2-terrasa-repino-desktop.png
- [x] ISC-7: Hero image visible (not placeholder)
- [x] ISC-8: Tech card section visible with specs
- [x] ISC-9: Gallery section visible with images
- [x] ISC-10: Gallery has image captions visible

### Page 3: /portfolio/pergola-pavlovsk-15m2 desktop 1440x900
- [x] ISC-11: Screenshot saved to /tmp/qa-portfolio-3-pergola-pavlovsk-desktop.png
- [x] ISC-12: Hero image visible (cedar pergola)
- [x] ISC-13: Gallery section present
- [x] ISC-14: Evening/detail shot visible in gallery

### Page 4: /portfolio mobile 390x844
- [x] ISC-15: Screenshot saved to /tmp/qa-portfolio-4-portfolio-mobile.png
- [x] ISC-16: Page loads without error on mobile viewport
- [x] ISC-17: Cards stack vertically (single column layout)
- [x] ISC-18: Card images load (not gray placeholders)
- [x] ISC-19: Filter pills visible (may be scrollable)

### Page 5: /portfolio/naves-vsevolozhsk-30m2 mobile 390x844
- [x] ISC-20: Screenshot saved to /tmp/qa-portfolio-5-naves-vsevolozhsk-mobile.png
- [x] ISC-21: Hero image visible on mobile
- [x] ISC-22: Gallery section visible
- [x] ISC-23: Diagram image visible in gallery
- [x] ISC-24: No layout overflow (content fits 390px width)

## Decisions

## Verification

All 24 ISC verified via visual screenshot inspection. 5/5 pages PASS. Screenshots at /tmp/qa-portfolio-[1-5]-*.png (916KB–3MB each). playwright-cli not in PATH — used `npx playwright screenshot` as equivalent. Session lifecycle handled implicitly (stateless npx calls, no persistent session needed for screenshot-only workflow).
