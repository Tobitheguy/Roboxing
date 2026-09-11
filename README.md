# Roboxing

**The English-language system of record for humanoid robot fighting** — schedule,
results, teams, machines, and editorial for a sport that is currently reported in
scattered YouTube uploads, Weibo clips, and Chinese-language press releases.

🔗 **Live: [roboxing.tv](https://roboxing.tv)**

Five leagues tracked (URKL · CyberHero · World Humanoid Robot Games · REK · Iron
Fist King), every event carrying the source it was dated from, results entered only
when two independent sources agree on winner, score and method.

Built solo, in about two weeks, with [Claude Code](https://claude.com/claude-code)
as the implementation partner — see [How this was built](#how-this-was-built).

---

## What it does

| | |
|---|---|
| **Schedule & results** | Events, fight cards, bout results, computed standings |
| **Machines & teams** | Hardware index (Unitree G1, EngineAI T800) and the teams fielding them |
| **Editorial** | A small publication — articles and clips, with embeds that are never re-hosted |
| **Predictions** | Free-to-play pick'em; the crowd split is the odds layer |
| **Newsletter** | Double opt-in digest, assembled from the database, never generated |
| **Signals watcher** | A bilingual news sweep that an LLM scores and summarises into a triage inbox |

---

## The AI piece: a bilingual signals watcher

This is the part of the build that is doing real work rather than demonstrating a
framework, and it is the reason the site broke a story English media did not have.

**The problem.** This sport happens mostly in China. English coverage is late,
incomplete, and sometimes wrong — three outlets disagreed for months about who won
URKL's opening fight. The edge is reading the Chinese sources on the day they
publish. The obstacle is that the person doing the triage does not read Chinese.

**The pipeline** (`src/lib/signals.ts`, `src/lib/classify.ts`):

1. A daily cron (`/api/cron/signals`, 05:30 UTC, guarded by `CRON_SECRET`) sweeps
   Google News RSS in **English and Chinese**. No API keys, no quota.
2. Every new row is scored 0–100, categorised, and given a one-sentence summary by
   Claude Haiku 4.5 — and **the summary is always in English, including for the
   Chinese sources.** That column is the entire point; without it the ZH sweep is
   an edge nobody can read.
3. `/admin/signals` is the triage inbox: a cross-language Priority section above the
   EN/ZH split, keep or dismiss, dismissed URLs never resurface.

**Four design decisions that matter more than the model choice:**

- **`classified_at IS NULL` *is* the work queue.** A row never seen and a row whose
  batch died look identical, so the next sweep retries both. No separate failure
  column to keep in sync. The first live run proved it: 2 of 10 chunks died on a
  bare connection error, 190 of 240 rows scored, the other 50 simply waited and were
  picked up next time.
- **Every run reports what it cost.** `usage` and `estimatedCostUsd` come back on
  the result, so the cron's JSON response says it out loud. Measured, not estimated:
  1,290 in / 385 out = $0.0032 for 10 items → roughly **$2/month** at 200 items a
  day. The local price table returns `null` for an unknown model rather than a
  confident wrong number; the invoice stays the source of truth.
- **`SIGNALS_CLASSIFY_LIMIT` is a hard row cap per run.** A feed that suddenly
  returns 5,000 items must not become a 5,000-row bill. A cost control that lives
  only in the prompt is not a cost control.
- **Structured outputs cannot express `minimum`/`maximum`,** so the 0–100 range is
  clamped in code *and* enforced by a `CHECK` on the column. The same function drops
  any id that was not in the chunk — a hallucinated id would otherwise write a score
  onto an unrelated row.

**And where the model is deliberately absent.** The newsletter digest is assembled
from database rows with no model in the path at all. A hallucinated score on a web
page can be corrected; one already sitting in somebody's inbox cannot. The watcher
gets to use a model precisely because a human reads its output before anyone else
does. Same reasoning keeps the auto-drafted morning brief inside `/admin` rather
than one click from Publish.

---

## Engineering decisions worth the click

- **Standings are computed, never stored** (`src/lib/standings.ts`). Enter a result
  once and the team page, the robot's record and the league table all move together.
  A stored table drifts; a derived one cannot.
- **No cross-league standings, anywhere, ever.** A Stanford team in URKL and a VR
  pilot at REK never fight. A combined table would be arithmetically correct and
  completely misleading — the precise failure this site exists to avoid.
- **Video is never re-hosted** (`src/lib/embeds.ts`). `resolveEmbed()` allowlists by
  *host* and turns a YouTube/Bilibili/Vimeo link into an iframe src; everything else
  degrades to a link card. An arbitrary URL must never reach an iframe —
  `javascript:` in that position executes in our origin. 17 tests cover it, including
  the subdomain and path tricks.
- **Post bodies are plain text**, split on blank lines and rendered as React text
  children. There is no HTML path into a post. Adding markdown means adding a
  sanitiser and tests for it, not just a renderer.
- **Published means `status = 'published'` AND `published_at <= now()`** — both
  halves, every time. Verified against the live database: checking only `status`
  exposes drafts and posts scheduled for next week.
- **The admin gate is checked in two independent places** — the proxy
  (`src/proxy.ts`) and `requireAdmin()` in every route and page. One missed check on
  one route is the whole breach, so the layers fail differently: a matcher typo is
  caught by the handler, a forgotten guard is caught by the proxy. Every
  `/api/admin/*` returns 401 **as JSON**, verified with `curl` against production.
- **Each mailing claims a unique key before it sends** (`weekly:2026-W37`). Insert
  first, mail only if the insert won, so a cron firing twice mails once.
  `isoWeekKey()` handles the ISO year boundary — 1 Jan 2027 is `2026-W53`, and the
  naive version emits `2027-W01`, colliding with the real one four days later and
  silently suppressing that week.
- **Logos are used, trademarks are not.** Organizer logos appear as nominative marks
  (the convention by which ESPN prints the NFL shield). League *identities* are
  generated monograms rather than borrowed marks — a site seeking rights
  conversations with exactly these companies does not open by using their trademarks.
  Deleting a logo file reverts that league to its monogram with no code change.

Three bugs found the hard way and written down so they stay found:

1. **A `"use server"` file may export async functions and nothing else.** One
   exported state *object* sat there legally-invalid for weeks, because the rule only
   fires once the module lands in a bundle that enforces it. Adding one unrelated
   import tripped it and broke the live signup form. `next build`, `tsc`, ESLint and
   353 tests were all green. Confirmed by matching error digests between production
   and a local build.
2. **A Drizzle single-table qualification bug, present since the first commit.** In a
   single-table `SELECT`, `${teams.id}` inside a correlated subquery renders
   *unqualified* and binds to the inner table — so the query counted
   `robots.team_id = robots.id` and every team showed "0 robots" for the life of the
   project. Fix: `${teams}.id`. It surfaced three separate times in three queries.
3. **`images: undefined` in `generateMetadata` is not the same as omitting it.**
   Setting the key counts as explicit metadata, which beats both the
   `opengraph-image` file convention and the inherited site-wide card. Four of seven
   posts and every event page had no share image at all. Absent means "fall back";
   present-and-undefined means "nothing".

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind v4 + shadcn/ui, tokens in `globals.css` |
| Database | Neon Postgres + Drizzle ORM, SQL migrations applied one file at a time |
| AI | Anthropic API (Claude Haiku 4.5) with structured outputs |
| Mail | Resend (app mail on a subdomain) + Google Workspace (human mail on the apex) |
| Video | Cloudflare Stream Live behind a custom hls.js player |
| Payments | Stripe — built, tested, and switched **off** behind `PAYWALL_ENABLED` |
| Hosting | Vercel (Pro), domain + DNS at Vercel, cron in `vercel.json` |

**365 tests, 22 files**, covering the parts where being wrong is expensive:
standings arithmetic, entitlement windows, the embed allowlist, ICS generation,
CSV import planning, ISO week keys, and the classifier's coercion layer.

```bash
npm install
cp .env.example .env.local     # every variable is documented in place
npm run dev
```

Only `DATABASE_URL` is needed to run the site. `npm run test` needs nothing.

| Command | Does |
|---|---|
| `npm run dev` / `build` / `lint` | The usual |
| `npm run test` | 365 unit tests (vitest) |
| `npm run db:push` / `db:studio` | Drizzle schema + studio |
| `npm run db:migrate-file <f.sql>` | Apply exactly one migration file, nothing else |
| `npm run db:seed-leagues` | Seed the real leagues — prints a plan, writes nothing without `--commit` |
| `npm run signals:classify` | Run the classifier by hand (spends money, same cap) |

---

## Project layout

```
src/
  app/
    (app)/            news, schedule, results, leagues, teams, machines, events
      admin/          gated CRUD, CSV import, live console, signals triage, newsletter
    api/
      cron/signals    the daily bilingual sweep + classification
      stripe/webhook  the only thing that grants paid access
  components/         shared primitives, admin forms, the player
  db/                 Drizzle schema, client, seeds
  lib/                standings, entitlements, embeds, classify, signals, digest, ...
  proxy.ts            Next 16's renamed middleware — the admin gate
scripts/              one-shot seeds and migrations, each idempotent
drizzle/              SQL migrations, applied one file at a time on purpose
```

`/styleguide` renders every design token and primitive on one page.

---

## How this was built

Solo, with Claude Code doing the typing. Three files in this repo are the working
method, and they are probably more interesting than any single component:

- **[`STATUS.md`](./STATUS.md)** — what is done, what is *not*, and what is waiting
  on whom. It says out loud that the streaming chain has never carried a real OBS
  signal and that no rehearsal happened, because the alternative is a green tick
  that lies. It records corrections to its own earlier entries rather than editing
  them away.
- **[`DECISIONS.md`](./DECISIONS.md)** — why each choice was made, and what it was
  chosen *over*. The reasoning is the valuable part and it does not survive in a diff.
- **[`AGENTS.md`](./AGENTS.md)** — the standing instructions the agent reads first.

The habit those three encode: **verify, then write it down.** Several things in this
project return success and change nothing — a Vercel env var that needs a redeploy
before it exists, a Resend send from an unverified domain that 403s with a message
that never says "domain", a signup form that cheerfully answers "check your inbox"
while no mail was ever sent. So DNS records are read back from Google's public
resolver rather than from the API that wrote them, YouTube embed ids are checked
against the oEmbed endpoint before being committed, schema claims are checked
against the live database, and OG cards are *looked at* as rendered PNGs — two
layout faults in them were invisible to `tsc`, ESLint and the build.

---

## Honest status

Live and serving real, sourced data. Not finished:

- **No OBS signal has ever reached the player.** The stream chain is built and
  deployed; it has only ever been exercised against a public test stream. Latency is
  a hope, not a measurement.
- **No subscribers**, because the social accounts that would put a human on the site
  do not exist yet.
- **No results for four of the five leagues** — deliberately. No full fight cards have
  been published in English, and two results out of a season produce standings that
  are arithmetically correct and completely misleading.
- **Payments are off.** The Stripe machinery is built and tested and nothing was
  deleted; it is one flag away from the day there are rights to sell.

---

© 2026 — all rights reserved. Organizer logos in `public/leagues/` belong to their
owners and are used nominatively to identify the leagues being reported on.
