---
name: Cloudflare RKN Research for timber-frame-spb.ru
description: Research on using Cloudflare proxy to protect Vercel-hosted timber-frame-spb.ru from RKN blocking. Includes setup, risks, and alternatives.
type: project
---

## Research Date: 2026-04-01

### Context
- timber-frame-spb.ru is hosted on Vercel, domain registered via Reg.ru
- DNS currently points directly to Vercel (DNS propagation completed 2026-03-09)
- Concern: Vercel IP ranges could be blocked by RKN, making site inaccessible in Russia
- Solution space: Cloudflare proxy (orange cloud) as reverse proxy to hide Vercel origin IP

### Key Findings
1. Cloudflare Free plan is sufficient for this use case
2. Orange cloud proxy DOES hide origin IP from RKN
3. Risk: Cloudflare itself could be partially blocked, but collateral damage makes full blocking unlikely
4. Best alternative: Cloudflare Pages (migrate off Vercel entirely)
5. Setup time: ~30 minutes if domain already registered

### Status
Research complete, awaiting implementation decision
