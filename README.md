# Robox

Live humanoid robot fighting — streaming, standings, and fight history in one place.

Robox licenses broadcast rights from combat league organizers and streams events on
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

1. Sign up at [neon.tech](https://neon.tech) and create a project named `robox`.
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
2. **R2** → create a bucket named `robox-media` and enable public access (or attach a
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

### 3. Admin credentials

```bash
npm run hash-password        # prompts, prints a scrypt hash
```

Put the hash in `ADMIN_PASSWORD_HASH` and your email in `ADMIN_EMAILS`. The plaintext
password goes in a password manager and nowhere else — never in a file, never in an
env var, never in this repo.

Then generate a cookie signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

into `SESSION_SECRET`.

### 4. Vercel

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

Admin auth is email **plus** a shared password. An email allowlist alone would be
identification rather than authentication — see deviation 1 in `DECISIONS.md`.

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
| `npm run hash-password` | Generate an `ADMIN_PASSWORD_HASH` |

---

## Project layout

```
src/
  app/
    (public)/          home, competitions, teams, robots, schedule, results
    watch/[slug]/      the player page
    admin/             gated CRUD + run-of-show console
    api/
  components/          shared primitives — Card, Badge, StatTile, DataTable, ...
  db/                  Drizzle schema, client, seed
  lib/                 standings, stream client, auth, formatting
```

`/styleguide` renders every design token and primitive on one page. It is the fastest
way to see the design system and doubles as a regression check.
