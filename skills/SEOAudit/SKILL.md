---
name: SEOAudit
description: SEO аудит и диагностика — технический SEO, on-page, Core Web Vitals, E-E-A-T, индексация, структура контента. USE WHEN SEO audit, technical SEO, why am I not ranking, SEO issues, on-page SEO, meta tags review, SEO health check, my traffic dropped, lost rankings, not showing up in Google, site isn't ranking, Google update hit me, page speed, core web vitals, crawl errors, indexing issues, SEO аудит, технический SEO, почему нет позиций, проблемы с SEO, проверь SEO, аудит сайта, оптимизация сайта, мета теги, индексация, скорости, CWV.
context: fork
---

# SEOAudit

Профессиональный SEO аудит с мультиагентным подходом и интеграцией браузера для JS-рендеринга.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/SEOAudit/`

If this directory exists, load and apply any PREFERENCES.md or resources found there.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле SEOAudit", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Запускаю **WorkflowName** в скилле **SEOAudit**...
   ```

## Workflow Routing

| Trigger | Workflow | Agents |
|---------|----------|--------|
| "quick SEO audit", "быстрый SEO чек", "проверь SEO быстро" | `Workflows/QuickAudit.md` | 1 |
| "SEO audit", "full SEO audit", "аудит сайта", "полный SEO аудит" (default) | `Workflows/StandardAudit.md` | 3 |
| "extensive SEO audit", "deep SEO", "глубокий аудит", "полное исследование" | `Workflows/ExtensiveAudit.md` | 12 |
| "technical SEO", "технический SEO", "скорость", "Core Web Vitals" | `Workflows/TechnicalAudit.md` | 2 |
| "on-page SEO", "контент аудит", "мета теги", "заголовки" | `Workflows/OnPageAudit.md` | 2 |
| "content audit", "E-E-A-T", "качество контента" | `Workflows/ContentAudit.md` | 2 |
| "schema markup", "structured data", "JSON-LD", "микроразметка" | `Workflows/SchemaAudit.md` | 1+Browser |
| "competitor SEO", "конкуренты", "сравни с конкурентами" | `Workflows/CompetitorAudit.md` | 3 |

**Default:** "SEO audit" → StandardAudit (3 agents)

## Quick Reference

| Mode | Speed | Coverage | Best For |
|------|-------|----------|----------|
| Quick | ~2min | Crawlability + Critical On-Page | Health check |
| Standard | ~5min | Technical + On-Page + Content sample | Regular audits |
| Extensive | ~15min | Full site deep-dive | Pre-launch, migrations |
| Technical | ~3min | Speed, CWV, Indexation | Performance focus |
| Schema | ~5min | JSON-LD + Rich Results | Structured data |

## MANDATORY: Load Framework

**Before ANY audit, read:** `AuditFramework.md`

This contains the core SEO methodology, priority order, and quality gates.

## Integration

### Feeds Into
- **TFContent** — Content improvements from audit findings
- **schema-markup** — Missing structured data implementation
- **page-cro** — Conversion blockers identified

### Uses
- **Browser** — JS rendering for schema detection (critical: `web_fetch` strips JSON-LD)
- **Research** — Competitor analysis
- **Media** — Screenshots for audit evidence

## Examples

**Example 1: Quick health check**
```
User: "проверь SEO сайта example.com"
→ QuickAudit workflow
→ 1 agent: robots.txt, meta tags, indexation
→ Report: 5-10 issues with priorities
```

**Example 2: Full audit with competitors**
```
User: "сделай полный SEO аудит timber-frame-spb.ru и сравни с конкурентами"
→ StandardAudit + CompetitorAudit
→ 6 agents parallel (3 site + 3 competitors)
→ Comprehensive report with competitive gaps
```

**Example 3: Schema validation**
```
User: "проверь микроразметку на странице"
→ SchemaAudit workflow
→ Browser agent renders page, extracts JSON-LD
→ Validates via Rich Results Test
→ Missing fields + implementation guide
```

## File Organization

**Audit outputs:** `~/.claude/MEMORY/WORK/{current_work}/seo-audit-{domain}-{date}/`
- `report.md` — Main findings
- `evidence/` — Screenshots, data exports
- `competitors/` — Competitive analysis (if applicable)
