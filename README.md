# Roboxing

Live humanoid robot fighting — streaming, standings, and fight history in one place.

Roboxing licenses broadcast rights from combat league organizers and streams events on
its own player, wrapped in real sports infrastructure: competitions, teams, robots,
fixtures, results, and computed standings.

> **Status: pre-launch POC.** No rights deal is signed. All data in this repo is
> obviously fictional placeholder content and the site shows a DEMO DATA banner while
> seeded. Do not add real league data until there is a signed agreement.

See [`DECISIONS.md`](./DECISIONS.md) for what was chosen and why.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind v4 + shadcn/ui |
| Database | Neon Postgres + Drizzle ORM |
| Video | Cloudflare Stream Live (ingest, transcode, HLS) behind a custom hls.js player |
| Media | Cloudflare R2 (logos, robot photos, posters) |
| Hosting | Vercel |

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill it in — see "Services" below
npm run dev
```

Open http://localhost:3000.

Steps 1–3 of the build (design system, database, public pages) need only
`DATABASE_URL`. Cloudflare credentials are not required until the streaming work.

---

## Services you need to create

### 1. Neon (database)

1. Sign up at [neon.tech](https://neon.tech) and create a project named `roboxing`.
2. Pick a **US East** region — the audience is the United States.
3. Copy the **pooled** connection string (the host contains `-pooler`). The direct
   endpoint will exhaust its connection limit under serverless functions.
4. Paste it into `.env.local` as `DATABASE_URL`.

Then:

```bash
npm run db:push      # apply schema
npm run db:seed      # load placeholder data
```

### 2. Cloudflare (video + media)

1. Create an account, then **subscribe to Stream**. Storage is prepaid in $5 blocks
   of 1,000 minutes.
2. **R2** → create a bucket named `roboxing-media` and enable public access (or attach a
   custom domain). Put the resulting base URL in `R2_PUBLIC_URL`.
3. **My Profile → API Tokens → Create Token → Custom token**, with:
   - `Account | Stream | Edit`
   - `Account | Workers R2 Storage | Edit`

   Scope it to this account only. Paste into `CLOUDFLARE_API_TOKEN`.
4. Account ID is in the dashboard's right sidebar → `CLOUDFLARE_ACCOUNT_ID`.
5. The Stream customer code is the `customer-XXXX` segment of any playback URL →
   `CLOUDFLARE_STREAM_CUSTOMER_CODE`.
6. **Set a billing alert.** Delivery is $1 per 1,000 minutes summed across all
   viewers — 5,000 viewers for two hours is roughly $600.

### 3. Clerk (accounts)

```bash
vercel integration add clerk
```

Accept the marketplace terms in the browser when prompted, then rerun. `CLERK_SECRET_KEY`
and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are provisioned automatically.

Set `ADMIN_EMAILS` to a comma-separated list of the addresses allowed into `/admin`.
Everyone else can sign in as an ordinary viewer.

> The Clerk instance created this way is a **development** instance. Before real
> users, create a production instance in Clerk bound to your own domain — dev
> instances have shorter sessions and browser requirements that will confuse people.

### 4. Stripe (subscriptions)

Test keys work fully before the account is verified, so the whole flow can be built
and exercised while business verification is pending.

1. Stripe → Developers → API keys → copy the **test** secret key into
   `STRIPE_SECRET_KEY`.
2. `npm run stripe:setup` — creates the product and the $9.99/month price from
   `src/lib/plan.ts`, and prints the `STRIPE_PRICE_ID` to add.
3. Stripe → Developers → Webhooks → add `https://<your-domain>/api/stripe/webhook`
   for `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` and
   `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

> **Do not activate the live account** until there is a signed rights agreement and
> a registered company. A Stripe account is bound to a legal entity, and moving from
> a private individual to a company later means a NEW account — subscriptions and
> saved payment methods do not transfer.

### 5. Vercel

Import the repo, add every variable from `.env.example` under Project Settings →
Environment Variables, and set `APP_URL` to the deploy URL.

---

## Security notes

This repository is **public**. Before every push:

- `.env*` is gitignored (`.env.example` is the only exception, and it contains no
  real values).
- No secret has ever been committed:
  ```bash
  git log -p | grep -iE "(api[_-]?key|secret|token|password)"
  ```
- Every `/api/admin/*` route returns 401 without a valid session cookie. This is
  verified with `curl` against the deployed URL, not assumed.

Admin access is Clerk sign-in **plus** an email allowlist, checked in two independent
places: the proxy (`src/proxy.ts`) and `requireAdmin()` in every route and page. One
missed check on one route is the whole breach, so the layers fail differently — a
matcher typo is caught by the handler, a forgotten guard is caught by the proxy.

The paywall is enforced at `/api/events/[slug]/playback`, not in the UI. That endpoint
returns a working manifest URL, so a check that lived only on the page would protect
nothing from anyone who opens the network tab.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (`next lint` was removed in Next 16) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:push` | Apply schema to the database |
| `npm run db:seed` | Load placeholder data |
| `npm run db:studio` | Drizzle Studio |
| `npm run test` | Unit tests (standings correctness lives here) |
| `npm run stripe:setup` | Create the Stripe product and price from `src/lib/plan.ts` |
| `npm run set-test-stream` | Point an event at a plain HLS URL, for testing the player |

---

## Project layout

```
src/
  app/
    (public)          home, competitions, teams, robots, schedule, results
    watch/[slug]      the player page — live and replay at the same URL
    subscribe         plan, checkout, billing portal
    admin             gated CRUD, CSV import, run-of-show console
    api/
  components/         shared primitives — Card, Badge, DataTable, the player, ...
  db/                 Drizzle schema, client, seed
  lib/
    standings.ts      the league table — computed, never stored
    entitlements.ts   the paywall decision, pure and exhaustively tested
    access.ts         one entitlement check, shared by page and endpoint
    stream.ts         Cloudflare Stream client
    subscriptions.ts  Stripe <-> entitlement reconciliation
  proxy.ts            Next 16's renamed middleware — the admin gate
```

### The four things most worth reading first

- `src/lib/standings.ts` — why the table is derived rather than stored
- `src/lib/entitlements.ts` — why access is a time window, not a flag
- `src/app/api/stripe/webhook/route.ts` — why the webhook, not the redirect,
  grants access
- `DECISIONS.md` — what was chosen, what was reversed, and why

`/styleguide` renders every design token and primitive on one page. It is the fastest
way to see the design system and doubles as a regression check.
