## Reflections
- browser_wait_for does not prevent the page from navigating away mid-wait; always check current URL after waiting when redirect bugs are suspected
- Parallel console+network collection (two simultaneous tool calls) is valid and saves time — do this by default
- Homepage JS redirect (~4s delay to /kalkulyator) is a real bug — reproducible, likely a useEffect with setTimeout in Next.js

## Patterns
- For multi-page audits: collect console+network in one parallel pair per page, not sequentially
- Next.js RSC prefetch requests (?_rsc=...) are normal noise — all return 200, not worth flagging
- Yandex.Metrika (mc.yandex.com) requests are third-party analytics — not actionable even if they failed

## Actions
- No WISDOM files written (single-session task-specific findings, not cross-domain)
