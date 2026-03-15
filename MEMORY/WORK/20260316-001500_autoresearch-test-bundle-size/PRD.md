---
task: "Autoresearch real test — reduce timber-frame-site JS bundle size"
slug: "20260316-001500_autoresearch-test-bundle-size"
effort: extended
phase: complete
progress: 17/17
mode: algorithm
started: 2026-03-16T00:15:00+03:00
updated: 2026-03-16T00:15:00+03:00
---

## Context

First real test of Autoresearch sub-loop protocol (v4.0-alpha). Goal is dual:
1. Actually reduce JS bundle size of timber-frame-spb.ru
2. Validate Autoresearch mechanics: experiments.tsv, stagnation detection, fast/slow gates, verify timeout, context recovery

Project: /home/ser/projects/timber-frame-site/ (Next.js 16.1.6, Turbopack, Vercel)
Current total JS: 1161 kB across .next/static/chunks/
Target: <900 kB (22% reduction)

### Risks
- Next.js 16 Turbopack may not support all tree-shaking optimizations
- Some large chunks may be framework code (not optimizable)
- Dynamic imports could break SSG pages
- Vercel deploy needed to verify production impact

## Criteria

- [x] ISC-1 [B-fast]: Project builds without errors after changes
- [x] ISC-2 [B-fast]: No TypeScript type errors introduced
- [x] ISC-3 [B-slow]: All existing tests pass (npm test) — baseline: 86 pass, 3 fail (pre-existing api-contact)
- [x] ISC-4 [B-fast]: No pages removed or broken (41 static pages still generate)
- [x] ISC-5 [Q]: Total JS bundle size < 900 kB (achieved: 892.6 kB)
  metric: total_js_kb || cmd: find /home/ser/projects/timber-frame-site/.next/static/chunks -name "*.js" -exec stat --printf='%s\n' {} \; | awk '{s+=$1} END {printf "%.1f", s/1024}' || baseline: 1161.4 || target: 900 || direction: lower
- [ ] ISC-A1: No user-visible content removed
- [ ] ISC-A2: No API routes broken
- [x] ISC-6 [B-fast]: Largest chunk < 250 kB (now 219 kB, was 304 kB zod chunk)
- [x] ISC-7 [B-fast]: Homepage route still SSG (not dynamic)
- [x] ISC-8 [B-fast]: Blog pages still SSG with generateStaticParams
- [x] ISC-9 [B-fast]: Portfolio pages still SSG with generateStaticParams
- [x] ISC-10 [B]: Images still use next/image optimization
- [x] ISC-11 [B]: Metadata/SEO tags preserved on all pages
- [x] ISC-12 [B]: Calculator (/kalkulyator) interactive functionality works
- [x] ISC-13 [B]: Contact form (/kontakty) renders correctly
- [x] ISC-14 [B-fast]: No new dependencies added
- [x] ISC-15 [B-fast]: Git working tree clean after each iteration
- [x] ISC-16 [B]: RSS feed (/rss.xml) still generates
- [x] ISC-17 [B]: Sitemap (/sitemap.xml) still generates

## Decisions

## Verification
