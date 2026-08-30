# Roboxing — Decisions

Why this file exists: the reasoning behind these choices is more valuable than the
choices themselves, and it does not survive in a diff. Anything here was decided
deliberately. If you want to change one, change it — but read the "why" first,
because most of these were picked over a specific alternative for a specific reason.

Last updated: 2026-08-30 (project start).

---

## What Roboxing is

A destination for humanoid robot combat. The fights already exist — EngineAI's URKL
league in Shenzhen, Unitree's boxing events — but the coverage is scattered across
YouTube uploads, Weibo clips, and news embeds. Nothing treats it like a sport.

Roboxing licenses broadcast rights from the organizer and streams events on its own
branded player, wrapped in real sports infrastructure: competitions, teams, robots,
fixtures, results, and standings.

**The rights deal is the gate, and it is not a technical one.** Everything in this
repo is built and tested against OBS colour bars and obviously-fictional placeholder
data. Licensed content swaps in when paperwork lands.

---

## Architecture

| Decision | Choice | Why |
|---|---|---|
| Streaming | Own React/hls.js player, Cloudflare Stream Live behind it | The player, controls, overlays, and branding are 100% Roboxing on a Roboxing domain. What Cloudflare handles is ingest, transcode ladder, and global HLS delivery — weeks of ops work that costs more to hand-build than to buy. If we later want to own the pipe end to end, only the URL handed to the player changes. |
| Accounts | Admin-only in V1 | The public site is read-only. No fan signup, no comments, no team-manager logins. Everything is entered by one or two admins. |
| Competition data | Supplied by the rights holder | Roboxing does not run tournaments, so there is no bracket engine, no seeding, no auto-advancing winners. Admin form now, CSV/JSON import for bulk. |
| Standings | **Computed, never stored** | Every table on the site is a query over `bout_results` weighted by the competition's `points_rules`. Enter a result once and the team page, the robot's record, and the league table all move together. A stored table drifts; a computed one cannot. |
| Points rules | Per-competition row | A new league with different scoring drops in without a code change. |
| Stack | Next.js 16 App Router, TS, Tailwind v4, shadcn, Neon + Drizzle, Vercel | Deliberately the same core as the FN Scheduler build — the setup, migration workflow, and deploy story are already familiar. |
| External services | Three: Neon, Cloudflare (Stream + R2), Vercel | Every additional service is another account, another bill, another outage surface. |
| Market | United States, English only | No i18n layer, no locale routing, no translation tables. Neon in US East. |
| Times | Viewer's US timezone **with venue local time alongside** (`8:00 AM ET · 8:00 PM Shenzhen`) | A US audience watching an Asian league is usually watching at an odd hour and needs both numbers to make sense of the schedule. |

---

## Product

| Decision | Choice | Why |
|---|---|---|
| Accent colour | Acid lime `#C8FF00` | High energy on near-black, reads "machine" rather than "blood sport", and it is not what every other fight brand uses. Critically, it leaves red entirely free. |
| Live colour | `#FF2D2D`, **live state only** | Never decorative, never a button, never an error. If it is red, something is broadcasting right now. That rule is worth more than the colour. |
| Aesthetic | F1-clean with loud moments | Precision grid, generous space, restrained chrome; aggression concentrated in huge condensed type for names and scores, and in the live state. The product is video-first — a shouting UI competes with the thing people came to watch, and dates fast. |
| Home page when nothing is live | Next event + countdown, then latest results, then standings snapshot | Answers "why should I come back" in one screen and trains the return visit. |
| Event reminder | `.ics` download + Google Calendar link | Gives the countdown hero a real call to action with no fan accounts, no subscribers table, no email provider, and no unsubscribe/privacy surface. Fits the admin-only constraint exactly. |
| Competitors called | **Robots** (`/robots/[slug]`) | Literal and unambiguous, and the robot angle is the differentiator — leaning into it is the point. Rejected "fighters" (buries what makes this novel) and "bots" (reads gaming/chatbot). |
| Organisations called | **Teams** (`/teams/[slug]`) | Needs zero explanation to a first-time US visitor and matches every sports-site convention. Rejected "labs" (awkward once a sponsor-backed team enters) and "stables" (memorable but needs explaining). |
| Weight class | Stored on `robots`, shown on profiles and fight cards; **one** standings table per competition | Combat sports essentially always classify by mass, so the column has to exist. But we do not yet know whether URKL runs separate divisions, and an 8-team season split by class produces thin, meaningless tables. Splitting later is a filter on the standings query, not a migration. |
| Seed data | Obviously invented placeholders + a persistent DEMO DATA banner | The repo and the deploy are public and there is no signed rights deal. A public page showing fabricated results attributed to a real league is exactly the thing that sours a rights conversation. Fictional names cannot be mistaken for a record. |
| Logo | Generated type-only SVG wordmark, lime X | No illustration, so it stays cheap to replace with a real brand pass and reads correctly at 24px on a phone. |

### The name

Originally **Robox**. Changed to **Roboxing** on 2026-08-30 because no usable domain
existed — `robox.tv`, `.live`, `.gg`, `.io`, `.co`, and `.app` were all registered,
as was `roboxing.com`. Every short one-word alternative checked (`clank`, `rivet`,
`anvil`, `servo`, `kayo`, `ironside`, `robrawl.com`, `botbrawl.com`) was squatted too.

`roboxing.tv` was available and is the better name anyway: it keeps the lime-X
wordmark and everything already built, and it earns meaning the original lacked —
robot + boxing states what the product is instead of just sounding like it might.
`.tv` also happens to be the correct TLD for a broadcast product.

Rejected alternatives that were available: `klank.tv` (strongest pure brand, but a
full rebuild of the mark), `robrawl.tv` ("brawl" undercuts the league-table framing),
`mechbrawl.com` (cheaper .com, but "mech" means *piloted* machines — these are
autonomous humanoids, so it misdescribes the sport).

Note `.tv` renews at roughly $35–40/yr rather than a .com's ~$11.

### What a bout result holds

Core fields are strict typed columns; anything the league records that we have not
seen yet goes in `stats_json`:

```
winner_robot_id   FK, NULL for draw / no-contest
method            ko | tko | decision | draw | dq | no_contest
end_round         int
end_time_seconds  int
knockdowns_a/b    int
stats_json        jsonb, nullable
```

Why the escape hatch: we have not seen a real URKL result sheet. Modelling full
judges' scorecards now would mean **inventing** a scoring structure the league may
not use. `stats_json` holds whatever turns up on day one without a migration, and
fields get promoted to real columns once we know they are real.

Why `bout_results` is a separate table from `bouts`: an unresolved bout is simply a
missing row rather than a spread of nullable columns that every query has to reason
about. `bout_id` is UNIQUE, so entering the same result twice cannot double-count.

---

## Deviations from the original build plan

These were raised before building and accepted.

### 1. Admin login needs a password, not just an allowlist

The plan said `/admin/login` checks the submitted email against `ADMIN_EMAILS` and
sets a signed cookie. That is **identification, not authentication** — anyone who
types a listed address gets a valid admin session, and on a public repo with a
public deploy the addresses are guessable. That is full database write access plus
live stream control for anyone who tries.

Added: `ADMIN_PASSWORD_HASH` (scrypt), `timingSafeEqual` comparison, rate limiting
on the login route, and a `HttpOnly` / `Secure` / `SameSite=Lax` session cookie with
a 12-hour expiry. Still POC-grade, still a clean swap to Clerk later.

### 2. The 10s live poll is CDN-cached

`GET /api/events/[id]/state` polled every 10 seconds by 5,000 viewers is ~30,000
requests per minute against Postgres. It sends `Cache-Control: s-maxage=5,
stale-while-revalidate=10` so Vercel's CDN absorbs the fan-out and Neon sees roughly
12 queries a minute regardless of audience size. Costs up to 5s of extra latency on
a result appearing, which is invisible next to stream latency.

### 3. Signed playback URLs expire mid-stream

Stream signed URLs are short-lived and a 2-hour broadcast outlives one. The player
fetches a fresh signed manifest on an hls.js fatal network error, otherwise long
viewing sessions die silently about an hour in. Built in, not discovered on event day.

### 4. Cloudflare billing alert before any launch push

Delivery is $1 per 1,000 minutes summed across all viewers. 5,000 viewers for two
hours is roughly $600 with no revenue attached in V1. A configured alert is the
difference between a surprise and a decision.

---

## Reversed on 2026-08-30: Roboxing is a paid platform

The original plan assumed a free, ad-free, account-free V1 and deferred fan
accounts, Clerk, and payments to "post-POC". That was wrong about the business,
and the correction arrived before it got expensive.

**Roboxing sells access.** Watching is not free. That single fact changes three
things that would each have been painful to retrofit:

1. **Accounts are not optional.** You cannot sell access without identity.
   Every viewer signs in — not just admins.
2. **Signed playback URLs are no longer enough.** `/api/events/[slug]/playback`
   minted a token for anyone who asked, which was correct while watching was
   free. Under a paywall that endpoint must check entitlement first, or the
   paywall is decoration and the stream is one open URL away from free.
3. **The rights deal changes.** Distribution rights that permit *free* viewing
   do not automatically permit *selling* access. This has to be on the table
   with the organizer from the first conversation — it is a different licence
   and usually a different price.

### Model: subscription

One recurring subscription grants access to everything, rather than
per-event purchases.

Accepted risk, recorded so it is not a surprise later: with an irregular
calendar — and URKL has no fixed schedule yet — subscribers tend to cancel
after each event and resubscribe for the next. A per-event option is the usual
answer to that. The `entitlements` table stores a date range rather than a
subscription id alone, so adding pay-per-view later is a new row shape, not a
migration of existing data.

### Timing: build the gate now, switch it on later

`events.access` is `free | subscription`. Everything is `free` today, so
nothing changes for a visitor, and the entitlement check runs on every playback
request from day one — exercised, tested, and boring by the time real money
touches it. The alternative was writing the one piece of code that must never
be wrong in the fortnight before the first paid event.

### Auth: Clerk

Native Vercel Marketplace integration, so environment variables are
provisioned automatically and billing is unified. Social sign-in (Google,
GitHub) plus email codes.

Admins are ordinary Clerk users whose email appears in `ADMIN_EMAILS`. This
replaces the shared admin password from deviation 1 below — which was the right
call while admin-only was the whole story, but a shared credential cannot tell
you *who* changed a result, and revoking one person's access meant changing the
password for everyone.

---

## Explicitly deferred

Fan accounts, comments, follows, predictions. Tournament/bracket generation.
Payments of any kind — PPV, subscriptions, ads. Native mobile and TV apps.
Multi-language. WebSocket/SSE push (V1 polls; simple and robust). DRM.
Automated highlight clipping. A public API. An organizer-facing portal.

And: any content we do not hold rights to.

---

## Open questions for the rights holder

- **Territories.** Rights deals are almost always territory-limited, which makes
  geo-blocking a contractual requirement rather than a feature. `events.allowed_countries`
  carries the list through to Cloudflare Stream — but we need the actual list in writing.
- **Commentary language.** If the source feed is Mandarin, a US audience needs either
  an English feed from the organizer or a Roboxing commentary track. Worth raising early;
  it may be a selling point rather than a problem.
- **What the league actually records per bout.** Drives what gets promoted out of
  `stats_json` into real columns.
