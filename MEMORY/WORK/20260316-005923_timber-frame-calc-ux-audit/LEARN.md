## Reflections
- Playwright's `getByRole('button', {name: '...'})` with partial text can match nav links instead of buttons when names overlap — use direct ref clicks or JS `.click()` for safety in multi-element pages
- The cookie "Принять" button on this site navigates away (likely a link styled as button) — never click cookie banners with `getByRole` without verifying the ref first
- Always use JS `button.click()` via `browser_evaluate` for "Далее" navigation to avoid Playwright selector ambiguity on pages with nav that shares button text

## Patterns
- On SPA-style calculators with step wizards: navigate via JS eval on the actual button element, not by role/name selectors — nav bar interference is a real risk
- When a site uses `type="button"` with no nested links but still redirects, suspect the Playwright selector matched a different element — inspect via snapshot refs before clicking

## Actions
- No Wisdom Frames updated (site-specific finding, not cross-domain)
