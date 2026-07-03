# FABulousART — fabulous-art.ch

Portfolio & commission website for artist Fabienne Meyer. Static Astro site
(DE/EN) on Cloudflare Pages with one serverless function for commission orders.

## Tech Stack

- **Astro 5** — static site generation (SSG), all pages prerendered
- **Cloudflare Pages** — hosting + `functions/api/order.ts` (Pages Function)
- **Cloudflare R2** — order records + uploaded reference images
- **Cloudflare Turnstile** — bot protection on the order wizard
- **Mailjet** — order notification + customer confirmation emails
- **Sveltia CMS** (`/admin/`) — content editing via GitHub, no rebuild tooling needed locally

## Setup

```bash
npm install
npm run dev        # Astro dev server (no order API)
npm run check      # astro check (type-checks pages, incl. translation keys)
npm test           # vitest (pricing, sanitization, i18n slug map)
npm run build      # production build to dist/
```

To run the **order API locally**, use Wrangler against the built site:

```bash
cp .env.example .dev.vars   # fill in real values
npm run build
npx wrangler pages dev dist
```

## Project Structure

```
├── functions/api/        # POST /api/order (+ _emails.ts templates)
├── public/
│   ├── admin/            # Sveltia CMS (pinned version)
│   ├── _headers          # security headers / CSP
│   └── _redirects        # / → /de/
├── scripts/
│   └── generate-assets.mjs  # regenerates OG image + favicons (committed outputs)
├── src/
│   ├── assets/           # images optimized at build time (hero, portrait)
│   ├── components/       # shared: HomePage, CommissionWizards, NewsIndex, NewsArticle, …
│   ├── data/             # CMS-managed JSON (pricing.json, news.json, portfolio.json, …)
│   ├── i18n/             # translations + typed t() + locale slug map
│   ├── lib/              # pricing, sanitize, markdown, format — shared client/server/tests
│   └── pages/            # thin locale shells (de/, en/) rendering shared components
└── tests/                # vitest unit tests
```

**Locale pattern:** pages under `src/pages/de/` and `src/pages/en/` are thin
shells that render a shared component with a `locale` prop. To change a page,
edit the component in `src/components/` — never copy content between locales.

## Content editing (CMS)

`https://www.fabulous-art.ch/admin/` — log in with the GitHub account that has
access to this repository. Editable collections include news posts, portfolio
works and **pricing** (`src/data/pricing.json`).

Pricing rules: a price of `0` (or a missing entry) means *this combination is
not offered* — the wizard disables it and the API rejects it. It is never sold
for CHF 0.

## Orders

- Every submitted order is written to R2 **before** any email is sent:
  `orders/{orderId}/order.json` (+ the uploaded image next to it).
  R2 is the system of record; the emails are the notification layer.
- If Mailjet is down, the customer still gets a success page and the order is
  in R2 — check the Pages Function logs for `PERSISTED BUT EMAIL FAILED`.
- Prices are computed **server-side** from `src/data/pricing.json`. Values
  submitted by the browser are ignored.

## Deployment

Cloudflare Pages, auto-deploys from `main`. Build command `npm run build`,
output `dist/`. CI (GitHub Actions) runs `astro check`, unit tests and a build
on every push/PR.

### Required environment variables (Pages → Settings)

See `.env.example`. **`TURNSTILE_SECRET` is required** — the order API fails
closed (rejects all orders) if it is missing, so a misconfigured deploy is
noticed immediately instead of silently disabling bot protection.

### Required bindings

- R2 bucket binding **`ORDER_IMAGES`** (Pages → Settings → Functions).

### Operations checklist (Cloudflare dashboard)

1. **WAF rate-limiting rule** for `POST /api/order` (e.g. 5 requests/hour/IP).
   The in-function rate limiter is per-isolate and best-effort only.
2. **R2 lifecycle rule** on the orders bucket if uploads should expire
   (e.g. delete `orders/` objects after 12 months) — GDPR data-minimization.
3. Turnstile widget + secret configured for `fabulous-art.ch`.
