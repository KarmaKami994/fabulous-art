# FabulousArt — Refactoring Changelog

All changes map to findings in `FabulousArt-Engineering-Review.md`. Decisions applied: **A3** (creative price fix — see ⚠️ below), **B1** (marked + sanitize-html), **C1** (OG from hero), **D2** (fonts deferred), **E2** (multi-upload deferred).

---

## ⚠️ Needs Fabienne's confirmation

`src/data/pricing.json` — the two creative price typos are fixed with **pattern-derived values** (they mirror the Family table exactly, which the surrounding numbers already follow):

| Combination | Was | Now |
|---|---|---|
| Creative A2, 4 people | CHF 1'680 | **CHF 2'540** |
| Creative A1, 4 people | CHF 1'890 | **CHF 4'680** |

If her real prices differ, it's a 10-second edit in the CMS (`/admin/` → Pricing). Creative A0 with 3–4 people remains `0` = intentionally **not offered** — the wizard now disables those buttons and the API rejects them (previously: silently priced at **CHF 0**).

## Correctness & money (Review #1, #5)

- **`src/lib/pricing.ts` (new)** — single pricing source reading `pricing.json`. Used by the wizard (bundled), the order API, and tests. `getQuote()` returns `null` for unavailable combos, never 0. The former 4 divergent price copies (2× inline wizard JS, dead `content/pricing.ts`, unimported `pricing.json`) are gone; **the CMS pricing collection now actually controls the site**.
- **Server-side price recompute** — the browser no longer sends prices at all; `order.ts` computes the emailed quote from `pricing.json`. Price tampering via DevTools is dead.
- **Wizard availability UI** — person counts without a price are disabled (struck through) once a size is picked; stale selections are cleared; submit re-validates.
- **`tests/pricing.test.ts`** — exhaustive combo tests incl. a monotonicity check ("a larger group is never cheaper") that would have caught both original typos, and explicit CHF-0 regression tests.

## Order pipeline reliability & security (Review #2, #3, #4)

`functions/api/order.ts` rewritten (+ templates extracted to `functions/api/_emails.ts`):

- **Turnstile fails closed** — missing `TURNSTILE_SECRET` now rejects orders loudly instead of silently disabling bot protection.
- **Orders persist to R2 before email**: `orders/{orderId}/order.json` (+ image alongside). Mailjet gets one retry; if it still fails the customer sees success (order is durable) and the log screams `ORDER … PERSISTED BUT EMAIL FAILED`. A Mailjet outage no longer destroys orders.
- **`message` field delivered** — was collected and silently discarded; now in both emails and the R2 record.
- **Escape-at-sink** — raw values stored/validated, HTML-escaped only inside templates. No more `O&#x27;Brien` in subjects, no double-escaping, no XSS in the wizard summary (all `innerHTML` writes escaped, errors moved from `alert()` to inline).
- **Aligned validation** — client & server both: 10 MB, PNG/JPG/WebP, visible rejection message (was: silent ignore at 20 MB/2 types client vs 10 MB/3 types server). Length caps on every field (shared `FIELD_LIMITS`), enum allowlists, `country` required consistently, 12 MB request-size cap, rate-limit map eviction.
- **Per-wizard Turnstile token** + automatic reset-and-retry once on 403 (slow form-fillers no longer dead-end on an expired token).
- Order IDs: `YYYY-MM-DD-xxxxxxxx` in email subjects and R2 keys.

## Duplication (Review "maintainability 4/10")

Locale pages are now 4–13-line shells over shared components — DE/EN can no longer drift:

- `HomePage.astro`, `CommissionWizards.astro` (step markup config-generated — was 6 copies of each wizard), `NewsIndex.astro`, `NewsArticle.astro`
- `src/lib/format.ts` (dates/CHF), `src/lib/sanitize.ts`, `src/lib/markdown.ts`
- 9 duplicated pages: **~2,450 lines → 79 lines**; root `index.astro` is now a real redirect stub matching `_redirects` (duplicate-content SEO issue gone).
- Dead code removed: `content/pricing.ts`; `works.ts` moved to `src/lib/portfolio.ts`.

## Performance & SEO (Review #7, #8)

- About portrait: **16.4 MB PNG → 40/113 KB WebP** (astro:assets, 1x/2x). Hero: 1.5 MB → 39–121 KB responsive WebP, `fetchpriority=high`.
- OG image fixed (was 404): generated 1200×630 from the hero (`scripts/generate-assets.mjs`, committed). All four favicons generated from the logo (were 404s).
- `/de/datenschutz ↔ /en/privacy` language switcher + hreflang fixed via slug map in `i18n/utils.ts` (was a 404).
- News markdown: `marked` + `sanitize-html` (correct rendering, raw-HTML passthrough closed). `mailto:` subjects URL-encoded.

## Config, DX, CI (Review #9, #10 + "zero tests")

- Sveltia CMS self-hosted at `/admin/sveltia-cms.js`, pinned at 0.169.1 (was: floating latest loaded from unpkg with repo write access — no third-party runtime scripts remain).
- CSP: `unpkg.com` removed from the main site's `script-src` (admin keeps it); obsolete `X-XSS-Protection` / `interest-cohort` dropped. Fonts kept (D2).
- Typed `t()` — translation-key typos now fail `npm run check` (0 errors).
- `.env.example` rewritten to the real contract (removed unused `R2_*` keys, fixed `MAILJET_SENDER_EMAIL` → `MAILJET_FROM_EMAIL`, added required `TURNSTILE_SECRET`). README rewritten with ops runbook.
- **CI**: `.github/workflows/ci.yml` — `astro check` + 23 unit tests + build on every push/PR. All green; build produces the same 51 pages.

## Cloudflare dashboard tasks (not code — see README "Operations")

1. WAF rate-limit rule on `POST /api/order` (the in-function limiter is per-isolate best-effort).
2. R2 lifecycle rule for `orders/` (GDPR data minimization).
3. Ensure `TURNSTILE_SECRET` is set **before** deploying — orders fail closed without it.

Deferred by decision: self-hosted fonts (D1), multi-image upload (E1). Not in approved scope: wiring `about.json` (still unimported — the About page text is code-edited only).

## SEO round (post-launch)

- **Homepage titles** rewritten from "Home — FabulousArt" to keyword-rich, locale-specific titles (the single most valuable title tag on the site was empty of search terms).
- **Structured data** (`src/lib/seo.ts`, shared by both locales): `VisualArtwork` + `BreadcrumbList` on every portfolio piece (medium, year, size, price as Offer, artwork as og:image); `NewsArticle` with `datePublished` + `article:published_time` on news posts; `Service` + `OfferCatalog` on the commission page with starting prices computed from `src/lib/pricing.ts` — schema prices can never drift from what the wizard charges.
- `og:image:alt` / `twitter:image:alt`; root redirect stub `noindex`; tsconfig excludes `public/` (the self-hosted 1.9 MB CMS bundle OOM-crashed `astro check` — would have broken CI).
