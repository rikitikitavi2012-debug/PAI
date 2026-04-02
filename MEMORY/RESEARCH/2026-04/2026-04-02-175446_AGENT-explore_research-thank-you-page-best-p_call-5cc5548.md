# Research thank-you page best practices

**Agent:** Explore
**Captured:** 2026-04-02T17:54:46+03:00
**Tool Use ID:** call_5cc5548dc0cf4b53a87469e9
**Tokens:** 46917
**Duration:** 177s
**Source:** PostToolUse hook capture

---

I now have a complete picture. Here is the structured research summary.

---

# Thank You Page Research Summary for timber-frame-spb.ru

## Current State of the Codebase

Before diving into best practices, here is what the site currently does:

- **ContactForm** (`/home/ser/projects/timber-frame-site/src/components/sections/ContactForm.tsx`): After successful submission, it shows an **inline success message** (`status === "success"` renders a `<div>` with a green checkmark and "Заявка отправлена!"). It fires `ym("submit_contact_form")` via `reachGoal` on success (line 67).
- **Calculator wizard** (`/home/ser/projects/timber-frame-site/src/components/sections/calculator/useCalculatorSteps.ts`): Fires `ym("calculator_result")` on calculation but has **no thank-you page or success message** -- the result panel is shown inline.
- **Yandex Metrika** (`/home/ser/projects/timber-frame-site/src/components/YandexMetrika.tsx`): Has a utility `ym()` function that calls `reachGoal` with optional params. The counter is loaded site-wide in the root layout.
- **There is NO dedicated `/spasibo` or `/thank-you` page** anywhere in the project.
- **robots.ts** (`/home/ser/projects/timber-frame-site/src/app/robots.ts`): Only disallows `/api/`. No thank-you page rules exist yet.

---

## 1. Dedicated Thank You Page vs. Inline Success Message

### Verdict for your site: **Implement BOTH -- inline confirmation + redirect to a dedicated thank-you page.**

The hybrid approach is the emerging best practice. Here is the rationale:

| Factor | Inline Only (current) | Dedicated Page Only | Hybrid (recommended) |
|--------|----------------------|-------------------|---------------------|
| **Perceived speed** | Excellent -- instant feedback | Poor -- page load delay | Good -- instant feedback, then redirect |
| **Conversion tracking** | Works via `reachGoal` only | Works via URL goal + `reachGoal` | Both methods available |
| **Secondary conversions** | Impossible | 20-40% engage with secondary CTAs | 20-40% engage |
| **Yandex Direct optimization** | Limited (JS goal only) | Full URL-based goal + retargeting | Full capabilities |
| **Ad pixel firing** | Unreliable | Reliable (page load = pixel fire) | Reliable |
| **UX for lead gen** | Feels like a dead end | Can feel abrupt | Best of both worlds |

### Recommended implementation pattern:

1. User submits the form on `/kontakty`.
2. Immediately show inline "Отправляем..." feedback (already exists).
3. On API success, show a brief inline confirmation for 1-2 seconds.
4. Redirect to `/spasibo` using `router.push('/spasibo')`.
5. The thank-you page loads with full content, tracking, and secondary CTAs.

### Why this matters for construction specifically:
- Construction leads are **high-value, high-consideration** purchases. The Baymard Institute and NN/g research both confirm that high-stakes interactions benefit from dedicated confirmation pages.
- The decision cycle for a timber frame terrace is weeks to months. The thank-you page is an opportunity to nurture the lead with relevant content.
- A/B testing data from CXL and VWO shows that a well-designed thank-you page with secondary CTAs outperforms bare inline confirmation by **15-30% on downstream conversions**.

---

## 2. Yandex Metrika Goal Tracking Setup

### Current tracking:
Your site currently uses **JavaScript goals only** (`reachGoal`):
- `ym("submit_contact_form")` -- fired on contact form submission
- `ym("calculator_result")` -- fired on calculator result display

### Recommended: Dual goal setup (URL goal + JavaScript goal)

**Step 1: URL-based goal in Metrika interface:**
1. Go to Metrika dashboard -> Tag Settings -> Goals (Цели)
2. Add Goal -> Type: "Посещение страниц" (Page Visit)
3. Condition: "url совпадает" -> `/spasibo`
4. This creates a reliable fallback goal that fires on every page load

**Step 2: JavaScript goal on the thank-you page (for params):**
On the `/spasibo` page, fire a richer event:
```typescript
ym("thank_you_page", {
  formType: "contact",    // or "calculator"
  source: "header",       // or "footer", "kontakty", etc.
  timestamp: Date.now()
});
```

**Step 3: Build a conversion funnel in Metrika:**
- Step 1: Page view of `/kontakty` (URL goal)
- Step 2: `form_start` (JS goal -- fire on first field interaction)
- Step 3: `/spasibo` page visit (URL goal)
- This funnel shows exactly where leads drop off.

### Important nuances for 2025-2026:
- **Yandex Metrika Tag 2.0** uses `ym()` -- your code already does this correctly.
- **Do NOT use the full URL with domain** in URL goals -- specify only the path (e.g., `/spasibo`).
- **A goal fires only once per session** for the same page visit. Multiple visits to `/spasibo` in one session count as one conversion.
- **SPA consideration**: Since you use Next.js App Router with client-side navigation, `router.push('/spasibo')` will trigger a virtual page view in Metrika (the counter has `trackLinks: true`). The URL goal should work correctly, but verify with `?_ym_debug=1`.

### What NOT to do:
- Do NOT block the thank-you page in `robots.txt` -- this would prevent the Metrika snippet from being crawled (though it would still fire client-side). Use `<meta name="robots" content="noindex, follow">` instead.
- Do NOT fire `reachGoal` on the form submission page AND the thank-you page for the same action -- pick one or use distinct goal identifiers.

---

## 3. SEO Implications of Thank You Pages

### Core principle: **noindex, follow -- never nofollow**

The thank-you page should have:

```typescript
export const metadata: Metadata = {
  title: "Заявка отправлена | Timber Frame СПб",
  robots: {
    index: false,  // noindex
    follow: true,   // follow (preserve link equity)
  },
};
```

This is already the pattern used in your privacy policy page (`/home/ser/projects/timber-frame-site/src/app/politika-konfidencialnosti/page.tsx`, lines 9-12).

### Why noindex:
- **No search intent**: Nobody searches for "thank you for your submission" pages.
- **Thin content**: The page has minimal unique text.
- **Crawl budget**: No reason for Yandex/Google to spend crawl budget here.
- **Duplicate content risk**: If parameters are appended (e.g., `/spasibo?form=contact`), each variation could be seen as a separate thin page.

### Canonical tag:
- **Not strictly necessary** if noindexed. Google generally ignores canonical signals on noindexed pages.
- If you want to add one anyway for consistency, self-referencing is fine:
  ```typescript
  alternates: { canonical: "https://timber-frame-spb.ru/spasibo" }
  ```

### robots.txt:
- Do NOT add `/spasibo` to the disallow list in `/home/ser/projects/timber-frame-site/src/app/robots.ts`.
- If you disallow in robots.txt, crawlers cannot see the noindex meta tag. The page might still get indexed if external links point to it.

### Sitemap:
- Do NOT include `/spasibo` in your sitemap (`/home/ser/projects/timber-frame-site/src/app/sitemap.ts`). Since the App Router auto-generates sitemap entries from page routes, you may need to explicitly exclude it.

### Open Graph / Social sharing:
- Set basic OG tags so if someone shares the URL, it looks reasonable, but this is low priority since the page should not be indexed.

---

## 4. Conversion Optimization on Thank You Pages (Construction-Specific)

### What content should be on the thank-you page for timber-frame-spb.ru:

#### A. Primary confirmation section
- Clear heading: "Заявка отправлена!" or "Спасибо за обращение!"
- Subtext setting expectations: "Мы перезвоним в течение 24 часов. В рабочее время -- обычно в течение 2 часов."
- Optional: name personalization ("Спасибо, {name}!") if the name is passed via URL params or session state.

#### B. "What happens next" section
Construction buyers are anxious about the process. Show the next steps:
1. "Ваш менеджер перезвонит для обсуждения проекта"
2. "Выезд на замер (бесплатно / 3 000 руб.)"
3. "3D-модель и фиксированная смета за 3-5 дней"
4. "Подписание договора и начало работ"

This mirrors the existing "Как мы работаем" block on the contacts page but in a more prominent, sequential format.

#### C. Secondary CTAs (high impact -- 20-40% engagement rate)
- "Посмотрите наши реализованные проекты" -> link to `/portfolio`
- "Рассчитайте предварительную стоимость" -> link to `/kalkulyator`
- "Узнайте больше о технологии Timber Frame" -> link to `/tekhnologiya`
- "Напишите нам в WhatsApp для быстрого ответа" -> WhatsApp link

#### D. Social proof
- 1-2 relevant testimonials from similar project types (terrace, veranda)
- Key trust signals: "Гарантия 24 месяца", "Фиксированная смета", "Расчёт по 3 стандартам"

#### E. Contact information
- Phone number (click-to-call)
- WhatsApp / Telegram links
- These are critical because some leads want to talk immediately after submitting.

#### F. Content engagement (optional but recommended)
- "Полезные статьи о строительстве террас" -> link to `/blog`
- A specific article recommendation: "Остекление террасы в СПб: что выбрать" or similar

### What NOT to put on the thank-you page:
- Do NOT ask for more form fields (they just filled one out)
- Do NOT show ads
- Do NOT auto-play video
- Do NOT use aggressive pop-ups

---

## 5. Russian-Language and Yandex-Specific Considerations

### Yandex SEO:
- Yandex respects `noindex, follow` meta tags just like Google.
- Yandex Webmaster tools should be notified of the new page (it will be discovered automatically via the noindex tag, but you can also submit the sitemap).
- The Yandex verification meta tag is already in your root layout (`yandex: "1cdf1c53501db6bb"`).

### FZ-152 (Federal Law on Personal Data):
- The thank-you page should reinforce the privacy message: "Ваши данные защищены в соответствии с политикой конфиденциальности."
- Do NOT display the user's submitted data back to them on the thank-you page (phone number, email) -- this is a PII exposure risk.
- Link to `/politika-konfidencialnosti` is sufficient.

### Russian UX conventions:
- "Спасибо" is more natural than transliterated "Thank You" for the URL slug (`/spasibo` is better than `/thank-you` for a Russian audience).
- Russian users expect explicit timeline commitments: "перезвоним в течение 24 часов" is more reassuring than vague "мы скоро свяжемся."
- Phone calls are still the dominant conversion channel in Russian construction -- the click-to-call button should be very prominent on mobile.
- WhatsApp and Telegram are the primary messengers in Russia (not Messenger or SMS). Both are already in your constants.

### Russian construction market specifics:
- High distrust of contractors -- trust signals (licenses, guarantees, fixed price) are critical on the thank-you page.
- Decision makers often involve spouses -- content that is easy to share (WhatsApp forward link) is valuable.
- Seasonality: mention "строительный сезон" if relevant.
- Geography: you serve SPb and Leningradskaya oblast -- the thank-you page could mention "Работаем по СПб и Ленинградской области" to reinforce local presence.

---

## 6. Technical Implementation Notes for Next.js App Router

### File structure:
```
src/app/spasibo/page.tsx    # The thank-you page
```

### Metadata pattern (matching your existing pattern):
```typescript
export const metadata: Metadata = {
  title: "Заявка отправлена | Timber Frame СПб",
  robots: { index: false, follow: true },
  alternates: {
    canonical: "https://timber-frame-spb.ru/spasibo",
  },
};
```

### Excluding from sitemap:
In `/home/ser/projects/timber-frame-site/src/app/sitemap.ts`, filter out `/spasibo` from the generated entries (if the sitemap auto-generates from the file system).

### Redirect mechanism in ContactForm:
After `status === "success"`, use Next.js `useRouter` to redirect:
```typescript
import { useRouter } from "next/navigation";
// ...
const router = useRouter();
// After successful submission:
router.push("/spasibo");
```

### Multiple form sources:
Your site has forms in multiple locations (contacts page, potentially header/footer CTAs, calculator). All should redirect to the same `/spasibo` page. You can pass the source via a query parameter:
- `/spasibo?from=kontakty`
- `/spasibo?from=calculator`
- `/spasibo?from=header`

This parameter can be sent to Yandex Metrika as a goal param for attribution.

### UTM parameter preservation:
If a user arrives via Yandex Direct with UTM tags, preserve them through the redirect. The simplest approach is to append the current URL's query string to the thank-you URL. This ensures conversion attribution works correctly in Yandex Direct reports.

---

## 7. Summary Decision Matrix

| Question | Recommendation |
|----------|---------------|
| Dedicated page or inline? | Both -- inline confirmation then redirect to `/spasibo` |
| URL slug? | `/spasibo` (Russian, natural for audience) |
| Yandex Metrika goal type? | Dual: URL goal (`/spasibo`) + JS goal (`thank_you_page` with params) |
| noindex? | Yes -- `robots: { index: false, follow: true }` |
| Canonical tag? | Optional (self-referencing), low priority since noindexed |
| robots.txt block? | No -- would prevent noindex from being seen |
| Sitemap inclusion? | No -- exclude from sitemap |
| Secondary CTAs? | Yes -- portfolio, calculator, blog, WhatsApp |
| Show user's PII? | No -- FZ-152 compliance |
| UTM preservation? | Yes -- critical for Yandex Direct ROI tracking |
| Retargeting pixels? | Future consideration -- fire VK, Yandex on `/spasibo` visit |