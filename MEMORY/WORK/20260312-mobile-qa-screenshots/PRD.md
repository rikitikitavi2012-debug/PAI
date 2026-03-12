---
task: Mobile QA screenshot audit three pages
slug: 20260312-mobile-qa-screenshots
effort: Standard
phase: verify
progress: 9/10
mode: ALGORITHM
started: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:00:00Z
---

## Context

Mobile QA audit of timber-frame-spb.ru across 3 pages using iPhone 14 viewport (390x844).
Screenshots saved to /tmp/. Report covers: text readability, image fit, navigation usability, overflow/horizontal scroll.
Not a fix session — audit and report only.

### Risks
- Vercel deploy may have propagated slowly — live site may differ from local
- playwright-cli viewport flag syntax must be correct for mobile emulation
- Full-page screenshot may be very tall, verifying overflow requires scroll-width check

## Criteria

- [x] ISC-1: Browser session opened at 390x844 mobile viewport successfully
- [x] ISC-2: Homepage screenshot saved to /tmp/qa-mobile-home.png (390x7032px)
- [x] ISC-3: Blog list screenshot saved to /tmp/qa-mobile-blog-list.png (390x5879px)
- [x] ISC-4: Blog post screenshot saved to /tmp/qa-mobile-fermy.png (757x19235px — overflow!)
- [x] ISC-5: Text readability assessed for homepage — PASS. Font sizes large, contrast good
- [x] ISC-6: Image fit assessed for homepage — PASS. Hero image fills viewport, no bleed
- [x] ISC-7: Navigation usability assessed for homepage — PASS. Hamburger + phone icon visible
- [x] ISC-8: Blog list layout assessed — PASS. Single column cards, good spacing
- [x] ISC-9: Blog post layout assessed — PARTIAL. Typography ok but tag wrapping broken at top
- [ ] ISC-10: Horizontal scroll detected on blog post — 757px document width vs 390px viewport

## Decisions

## Verification
