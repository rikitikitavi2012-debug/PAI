---
task: QA deploy check timber-frame-spb.ru 7 pages screenshots
slug: 20260314-022430_qa-deploy-check-timber-frame-spb
effort: Standard
phase: complete
progress: 19/24
mode: ALGORITHM
started: 2026-03-14T02:24:30
updated: 2026-03-14T02:24:30
---

## Context

User wants to verify a new deployment on timber-frame-spb.ru is live and correct.
7 pages to check with screenshots saved to docs/qa-screenshots/.
Dark theme expected (#1C1917 background, amber accent).
Pass = page opens with dark theme. FAIL = 404 or white screen.

### What was requested
- Check 7 specific URLs
- Verify specific content per page (nav items, article count, page existence)
- Take screenshots for each
- Save screenshots to docs/qa-screenshots/deploy-check-*.png
- Report OK/FAIL per page

### What was NOT requested
- Fix any issues found
- Deep content audit
- Mobile/responsive checks
- Performance metrics

## Criteria

- [x] ISC-1: / opens with dark background (not white/404)
- [x] ISC-2: Header nav contains "Террасы" link
- [ ] ISC-3: Header nav contains "Навесы" link — MISSING (not in nav)
- [x] ISC-4: Header nav contains "Технология" link
- [ ] ISC-5: Header nav contains "Портфолио" link — MISSING (not in nav)
- [x] ISC-6: Header nav contains "Блог" link
- [x] ISC-7: Header nav contains "Калькулятор" link
- [x] ISC-8: Header nav contains "Контакты" link
- [x] ISC-9: Screenshot of header saved to docs/qa-screenshots/
- [x] ISC-10: /blog opens (not 404, dark theme)
- [ ] ISC-11: /blog shows 12 articles (not 10) — FAIL: only 10 slugs found
- [ ] ISC-12: /blog shows "Мягкие окна для террасы" article — NOT visible on page
- [ ] ISC-13: /blog shows "Навес для машины" article — NOT visible on page
- [x] ISC-14: Screenshot of /blog saved
- [x] ISC-15: /terrasy opens (not 404, dark theme)
- [x] ISC-16: Screenshot of /terrasy saved
- [x] ISC-17: /pergoly opens (not 404, dark theme)
- [x] ISC-18: Screenshot of /pergoly saved
- [x] ISC-19: /verandy opens (not 404, dark theme)
- [x] ISC-20: Screenshot of /verandy saved
- [x] ISC-21: /navesy-dlya-mashiny opens (not 404, dark theme)
- [x] ISC-22: Screenshot of /navesy-dlya-mashiny saved
- [x] ISC-23: /karta-saita opens (not 404, dark theme)
- [x] ISC-24: Screenshot of /karta-saita saved

## Decisions

## Verification

### Results 2026-03-14

**PASS (19/24):**
- ISC-1: Homepage opens dark (#1C1917 bg confirmed in screenshot)
- ISC-2,4,6,7,8: Nav has Террасы, Технология, Блог, Калькулятор, Контакты
- ISC-9: Screenshot saved — deploy-check-homepage.png
- ISC-10: /blog opens dark, no 404
- ISC-14: Screenshot saved — deploy-check-blog.png + deploy-check-blog-full.png
- ISC-15,16: /terrasy opens dark — deploy-check-terrasy.png
- ISC-17,18: /pergoly opens dark — deploy-check-pergoly.png
- ISC-19,20: /verandy opens dark — deploy-check-verandy.png
- ISC-21,22: /navesy-dlya-mashiny opens dark — deploy-check-navesy-dlya-mashiny.png
- ISC-23,24: /karta-saita opens dark — deploy-check-karta-saita.png

**FAIL (5/24):**
- ISC-3: "Навесы" NOT in nav header (nav has: Террасы, Технология, О нас, Блог, Калькулятор, Контакты)
- ISC-5: "Портфолио" NOT in nav header (same nav as above)
- ISC-11: Blog shows only 10 articles, not 12. Slugs: 5-tipov-ferm, osteklenie, terrasa-cena, tri-standarta, zazor-1-5mm, westminster-hall, chto-takoe-tf, derevo-v-klimate, oshibki-stroitelstva, terrasa-vs-obychnaya
- ISC-12: "Мягкие окна для террасы" — not in rendered blog list
- ISC-13: "Навес для машины" — not in rendered blog list
