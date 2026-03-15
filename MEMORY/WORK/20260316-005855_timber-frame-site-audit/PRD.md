---
task: Audit all 10 pages timber-frame-spb.ru JS errors and broken resources
slug: 20260316-005855_timber-frame-site-audit
effort: Extended
phase: complete
progress: 20/20
mode: ALGORITHM
started: 2026-03-16T00:58:55
updated: 2026-03-16T00:58:55
---

## Context

Audit of timber-frame-spb.ru across all 10 pages to identify:
- JavaScript console errors and warnings
- Broken/failed network resources (4xx/5xx)
- Overall site health assessment

Pages: /, /terrasy, /navesy, /tekhnologiya, /portfolio, /blog, /kalkulyator, /kontakty, /o-nas, /politika-konfidencialnosti

Method: browser automation via playwright MCP — navigate each page, collect console messages (error+warning level) and network requests (failed/4xx/5xx).

### Risks
- Dynamic content may trigger errors only after interaction (scroll, click)
- Some errors may be third-party (analytics, ads) — not actionable
- Network timeouts may falsely appear as failures
- Console buffer may contain cross-page contamination if not cleared

## Criteria

- [x] ISC-1: Console messages collected for page /
- [x] ISC-2: Network requests collected for page /
- [x] ISC-3: Console messages collected for page /terrasy
- [x] ISC-4: Network requests collected for page /terrasy
- [x] ISC-5: Console messages collected for page /navesy
- [x] ISC-6: Network requests collected for page /navesy
- [x] ISC-7: Console messages collected for page /tekhnologiya
- [x] ISC-8: Network requests collected for page /tekhnologiya
- [x] ISC-9: Console messages collected for page /portfolio
- [x] ISC-10: Network requests collected for page /portfolio
- [x] ISC-11: Console messages collected for page /blog
- [x] ISC-12: Network requests collected for page /blog
- [x] ISC-13: Console messages collected for page /kalkulyator
- [x] ISC-14: Network requests collected for page /kalkulyator
- [x] ISC-15: Console messages collected for page /kontakty
- [x] ISC-16: Network requests collected for page /kontakty
- [x] ISC-17: Console messages collected for page /o-nas
- [x] ISC-18: Network requests collected for page /o-nas
- [x] ISC-19: Console messages collected for page /politika-konfidencialnosti
- [x] ISC-20: Network requests collected for page /politika-konfidencialnosti

## Decisions

## Verification

All 20 criteria passed. Data collected for all 10 pages.

### Key finding: homepage JS redirect bug
- / redirects to /kalkulyator after ~4 seconds (reproducible x2)
- All other 9 pages: stable, no redirect
- Zero JS console errors or warnings across all 10 pages
- Zero 4xx/5xx network responses across all 10 pages
- Only external traffic: Yandex.Metrika (mc.yandex.com) — all 200s
