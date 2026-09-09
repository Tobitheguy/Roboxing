# Where Roboxing stands

> **LAUNCHED 2026-09-08, the evening before CyberHero x Riyadh.**
> Production is https://roboxing.vercel.app — verified live: home 200, all
> seven posts serving, robots.txt open to crawlers, the Matador result on
> /results, and the signals cron registered (05:30 UTC daily) with
> CRON_SECRET set and the unauthenticated route confirmed 401. Commits
> `87f5ff7` (the rebuild, 117 files) and `bb22d68` (the Unitree
> autonomous-combat story — the watcher's first catch, published same-day).
>
> **2026-09-08, later: roboxing.tv is bought, attached and LIVE** (Vercel
> registrar + DNS, no Cloudflare; propagated in under a minute). APP_URL now
> points at it — the 8-day-old value still said vercel.app and would have
> kept sitemap/OG/ics on the old host. robots.txt announces the new domain.
> .com belongs to Devanthro (redirect-only; acquisition mail is a cheap
> option). Optional one-click in the dashboard: redirect roboxing.vercel.app
> and www to the apex as primary.
>
> ANTHROPIC_API_KEY is set in the Vercel production environment (2026-09-08),
> so the morning cron classifies for real.
>
> Still open, in order:
>
> 1. **Confirm RESEND_API_KEY is in the Vercel production env**, not only in
>    `.env.local`. A missing key there fails at send time, not at deploy time,
>    and the failure is silent to the person signing up. Prove it by
>    subscribing on the live site and watching for the mail.
> 2. Create the social accounts — still the only thing that puts a human on the
>    site, and the reason there are zero subscribers.
> 3. Triage the 240 scored signals; none has been kept or dismissed yet.
> 4. Delete the orphaned Cloudflare input ff17908f by hand.
>
> (roboxing.tv verified in Resend on 2026-09-08.)
>
> (Vercel Pro: verified Active on 2026-09-08.)
>
> The Vercel CLI is **not installed**, which is why those two variables are a
> manual dashboard job rather than one command. `npm i -g vercel` then
> `vercel link` makes env changes scriptable and is worth the two minutes.

> **2026-09-07: the product changed shape.** Roboxing is no longer being built
> as a rights holder's subscription streaming product. It is being built as the
> English-language system of record for humanoid robot fighting — schedule,
> results, teams, robots, and editorial — with the stream as a later phase.
>
> The reasoning, and what it means for the code:
>
> - **The audience arrives from social, not from search for "Roboxing".** So
>   the login wall came down. Everything except `/admin` and `/account` is now
>   public, the site has a sitemap, and `robots.txt` no longer disallows the
>   whole site. Video is still gated per event by `checkEventAccess()` — that
>   was always the real paywall; the wall around the pages was hiding the free
>   half too.
> - **Most events are not ours.** Events now carry `broadcastUrl` /
>   `broadcastName`, and the event page sends viewers to YouTube or Bilibili
>   rather than showing an empty player. `sourceUrl` records where a date came
>   from, because a calendar that cannot attribute its claims is not a record.
> - **Organizers announce dates without times.** `startTimeTbd` suppresses the
>   clock, the countdown, and turns the .ics into an all-day entry rather than
>   inventing an hour.
> - **The event URL is `/events/[slug]`, not `/watch/[slug]`.** The old URL
>   308s to the new one. `/watch/` promised a player that usually is not there.
> - **`subscribers` is the demand instrument.** No account needed, no sending
>   provider wired up yet; the double-opt-in and unsubscribe columns exist so
>   the list gathered today is usable when one is.
>
> - **Predictions are built and free to play.** Pick a winner per bout, one
>   pick per person, changeable until the deadline. Picks close at the EVENT's
>   start time for the whole card at once — not per bout as an admin marks them
>   live, because the stream runs ~30s behind and that would leave a window in
>   which a viewer can see a knockdown and still pick the winner. The crowd
>   split ("68% take TITAN-07") is the odds layer. Draws and no contests are
>   VOID, not losses. Records are derived, never stored, like the standings.
>   Personal record at `/account/picks`.
>
>   Note for anyone touching `savePrediction()`: Postgres CANNOT enforce that
>   the picked robot is in the bout — a CHECK cannot reference another table —
>   and this was verified against the live database, which accepts the bad row
>   happily. The check in the action is the only thing standing there. Same for
>   the deadline: the disabled button is not a control.
>
> - **There is a publication now.** `posts` (clip or article), `/news`,
>   `/news/[slug]`, admin CRUD at `/admin/posts`, and coverage surfaced on the
>   event it is about. Three rules worth not undoing:
>
>   - **We never re-host video.** `resolveEmbed()` allowlists by HOST and turns
>     a YouTube / Bilibili / Vimeo link into an iframe src; everything else
>     degrades to a link card. An arbitrary URL must never reach an iframe —
>     `javascript:` in that position executes in our origin. 17 tests cover it,
>     including the subdomain and path tricks.
>   - **The body is plain text**, split on blank lines and rendered as React
>     text children. There is no HTML path into a post. Adding markdown means
>     adding a sanitiser and tests for it, not just a renderer.
>   - **Visible means `status = 'published'` AND `published_at <= now()`,**
>     both halves, every time. Verified against the live database: checking
>     only `status` exposes drafts saved as published and posts scheduled for
>     next week.
>
> - **Crawlers are blocked while the demo data is still in the database.**
>   `robots.txt` disallows everything for as long as the seeded demo season
>   exists, and opens by itself within an hour of real data replacing it — no
>   deploy, nothing to remember. The reasoning: `DemoBanner` warns on the page,
>   and a search-result snippet does not carry the banner, so an indexed fake
>   fight looks exactly as authoritative as a real one in the one place we
>   cannot annotate. Both `robots.txt` and `sitemap.xml` revalidate hourly.
>
>   **This is the interlock that has to be cleared before launch:** replacing
>   the demo season with real competitions, teams and robots is what opens the
>   site to search. Nothing else gates it.
>
> - **The real leagues are researched and ready to seed, but NOT seeded yet.**
>   `npm run db:seed-leagues` prints a plan and writes nothing; add `--commit`
>   to apply. It is destructive — it deletes the demo season, its three events
>   (including `us2`, the OBS test rig and its Cloudflare stream row) and all
>   12 invented bouts — which is exactly what lifts the crawl block.
>
>   What it adds, all sourced, with `source_url` on every event:
>
>   | League | Organizer | Where | State |
>   |---|---|---|---|
>   | Ultimate Robot Knock-out Legend (URKL) | EngineAI | Shenzhen, CN | Active, 2026 season |
>   | CyberHero | Hero Esports | Riyadh debut, global | Active, debuts 9 Sep 2026 |
>   | World Humanoid Robot Games | China Media Group + Beijing city + others | Beijing, CN | 2026 edition completed |
>   | REK | REK (Cix Liv) | San Francisco, US | Active, full league announced |
>   | Iron Fist King: Awakening | Unitree | Hangzhou, CN | One-off, May 2025 |
>
>   Plus EngineAI and Unitree as organisations, the T800 and G1 platforms with
>   real specs, three URKL university teams, and four dated events.
>
>   **Deliberately not seeded, each for a reason:** no bouts and no results
>   (English reporting gives two isolated outcomes and no full cards — two
>   fights out of a season produces standings that are arithmetically correct
>   and completely misleading); no URKL grand final (planned for Dubai "late
>   December 2026 or January 2027", which is not a date); no REK event (the
>   San Francisco matches happened, the dates were not consistently reported
>   and attendance figures conflict between sources).
>
>   **The Riyadh event has no stream and that is correct.** CyberHero's own FAQ
>   says it will not be live-streamed — recorded, highlights afterwards. So
>   `broadcast_url` is null rather than pointing at a stream that will not
>   exist.
>
> - **The front end was rebuilt against UFC.com, Formula1.com, HLTV and ESPN**,
>   each opened and read rather than recalled. The finding that decided the
>   layout: **UFC and F1 are single-competition sites.** Their home pages lead
>   with one standings table because there is only one championship. Roboxing
>   covers five leagues that never meet, so `getPrimaryCompetition()` picking
>   one and presenting its table as the sport was arbitrary and undetectable to
>   a reader. That is gone.
>
>   | Taken | From | Where |
>   |---|---|---|
>   | Persistent next-event strip, dual clock | F1's race bar | `event-strip.tsx`, site-wide |
>   | Just happened / Up next, two panels | UFC | `just-happened-up-next.tsx` |
>   | Weight class as a centred eyebrow, country flags per corner | UFC fight card | `bout-row.tsx` |
>   | League mark on every cross-league row | ESPN | `showLeague` on `BoutRow` |
>   | Coarse "in 5 weeks", "Last result 7 Sep" | HLTV | `formatDaysUntil`, competition page |
>   | The leagues band | nobody — none of them needs it | `leagues-band.tsx` |
>
>   **Rejected: ESPN's portal layout.** Three columns, dense rails and a scores
>   strip are a compression algorithm for 500 stories a day across 30 sports.
>   On four events and no posts it renders as empty modules, which reads as an
>   abandoned site rather than a young one. It is also shaped by ad inventory
>   this site does not sell.
>
>   **No cross-league standings anywhere, ever.** Tables live on the league
>   page that owns them. A Stanford team in URKL and a VR pilot at REK never
>   fight, so any combined table would be the precise failure this site exists
>   to avoid.
>
> - **`/` no longer serves a marketing landing page.** Everyone gets the
>   content home. The old split existed because the content was gated; with the
>   site open, answering a visitor who arrived from a clip with a $9.99
>   subscription pitch is both a bad offer and a false description of the
>   product. `components/marketing/landing.tsx` is left unrouted — it is the
>   right raw material for an /about page.
>
> - **The site is light now, and there is no paywall.** Both follow from the
>   model change rather than from taste.
>
>   The palette was rewritten in `globals.css` alone — no component was
>   touched, which is what the token layer existed for. Warm off-white canvas,
>   white cards, near-black ink, **electric blue #1A3AD4** as the accent, and
>   near-black button fills. The accent is blue specifically because THE ONE
>   RULE survived: red means live, nothing else, so spending red on links would
>   burn the site's only unambiguous signal. Oswald stays — on a light page the
>   condensed uppercase display type is what carries the aggression the colour
>   used to. Every text pair is recorded with its measured contrast ratio.
>
>   The paywall is behind `PAYWALL_ENABLED`, default off, checked in
>   `checkEventAccess()` BEFORE the event's own `access` value — so a row left
>   as `subscription` cannot resurrect a wall. `/subscribe` and `/plans`
>   redirect at the proxy. Billing disappears from the account menu. **None of
>   the Stripe machinery was deleted**: it is built and tested and it is exactly
>   what is needed the day there are rights to sell. Flip the flag.
>
>   Sign-in is reframed throughout: an account exists to make picks and keep a
>   record, not to unlock reading.
>
>   One thing verified in the browser rather than assumed: flag emoji **do not
>   work on Windows** — there is no flag font, so 🇺🇸 rendered as a tiny "US"
>   while showing a real flag on macOS. Replaced with a two-letter
>   `CountryTag` chip that looks identical everywhere.
>
> - **2026-09-07/08: the real data is live and the first post is published.**
>   The league seed ran with --commit: five leagues, four sourced events, the
>   demo season deleted, robots.txt open, sitemap advertised. League
>   descriptions were expanded from a second research pass (URKL's four-stage
>   season and the unresolved White Eagle/Bullfighter-a.k.a.-Matador opener;
>   CyberHero's Street Fighter pro pilots; WHRG's Free Combat weight classes
>   and AGIBOT's 46-medal debut; Iron Fist King's named entrants). The Riyadh
>   preview post is PUBLISHED at /news/cyberhero-riyadh-preview.
>
>   **Still deliberately absent:** REK fixtures (the only tour report is dated
>   tomorrow yet written in past tense — contradictory sourcing, so no dates);
>   URKL/IFK bout results (no full cards published anywhere in English —
>   what is known narratively lives in the league descriptions instead);
>   WHRG Free Combat results (only in Chinese-language result PDFs so far).
>
> - **Leagues now have visual identities** (`league-identity.ts`): a colour and
>   a generated monogram per league, worn as card edges, badges and monograms.
>   Deliberately NOT their real logos — EngineAI/Hero/Unitree own their marks,
>   and a site seeking rights conversations with exactly these companies does
>   not open by using their trademarks. Same principle as never re-hosting
>   video. The up-next panel on the home page is the one dark element on the
>   light site, carrying the league wash and a big countdown.
>
> - **The standings integration test now builds its own fixture** (namespaced
>   `itest-standings-*`, torn down after) instead of asserting against seeded
>   demo data. It went red when the demo season was deleted — a test coupled to
>   fixture data somebody else owns breaks for reasons unrelated to the code it
>   covers.
>
> - **2026-09-08: the site is filled with launch content.** Six published
>   pieces (`scripts/seed-content.ts`, idempotent — edit a body there and
>   re-run): the five-leagues cornerstone, URKL explained, Iron Fist King
>   retrospective, REK feature, WHRG recap, CyberHero preview. Three carry
>   YouTube embeds, and every video id was verified against YouTube's oEmbed
>   endpoint (200 + title) before being written down — never guess an embed id.
>   New facts folded in from a second research pass: REK's pilots included UFC
>   featherweight Hyder Amil and MMA veteran Jessica-Rose Clark, and REK opened
>   a San Francisco storefront with six-foot machines.
>
> - **Organizer logos are in use, as nominative marks.** Tobias asked twice, so
>   the earlier abstention is overridden: logos identify the league being
>   reported on, the ESPN-prints-the-NFL-shield convention. Files fetched from
>   the organizers' own sites into `/public/leagues` (EngineAI, CyberHero,
>   Unitree — checked programmatically for brightness so none vanishes on its
>   tile). URKL/WHRG/REK marks were not cleanly extractable; they keep
>   monograms. If an organizer ever objects, deleting the file reverts that
>   league to its monogram with no code change.
>
> - **The home page is now main-column + sticky right rail** (UFC/ESPN shape):
>   numbered Top Stories and a Watch strip (`side-rail.tsx`), lead story plus
>   grid in the column. The rail was rejected in the first reference pass and
>   readopted deliberately — beside zero posts it reads as abandonment, beside
>   a real feed it is density; the inventory decides, not the template. Post
>   cards carry YouTube poster frames via `i.ytimg.com` (no API, nothing
>   re-hosted; `youtubeThumbnailUrl()` reuses the embed allowlist so a card
>   never advertises a video the post page would refuse to play). Top-stories
>   ranking is newest-first on purpose — a "trending" rank needs traffic data
>   that does not exist yet.
>
> - **2026-09-08, the brand is decided: black and white, nothing else.**
>   Tobias's call, after rejecting both AI palettes. `--color-volt` now
>   resolves to ink — the token survives for its call sites but names no hue.
>   League identity colours are monochrome (map shape kept for a cheap
>   reversal). The logo is the **split R** — his brief: the black R cut in two
>   — drawn from rectangles so favicon, header lockup (`RoboxingMark`) and OG
>   card share identical geometry. Two functional exceptions stay: live-red
>   and destructive-red are signals, not brand. Name stays Roboxing.
>
> - **2026-09-08, the full-site audit was built out.** Nav is four items
>   (News · Schedule · Results · Leagues — Teams/Watch/Machines moved to the
>   footer directory, `FOOTER_ITEMS`); /watch is now "Where to watch"
>   (broadcaster per event + our footage below); /teams splits Manufacturers
>   from Competing teams; /robots is the new "Machines" hardware index; empty
>   states explain WHY (no full cards published) instead of just saying
>   "nothing here"; zero-stat tile rows are hidden until there is something to
>   count; post share images fall back to the video's poster frame; /schedule
>   groups by month (a month-GRID calendar was rejected: ~1 event/month means
>   30 empty cells per hit).
>
>   **Two real bugs found by the audit, both fixed:** (1) five call sites
>   dropped `startTimeTbd`, printing invented times like "URKL · 9:00 PM PDT";
>   (2) a day-one drizzle bug — in a single-table SELECT, `${teams.id}` inside
>   a correlated subquery rendered UNQUALIFIED and bound to the inner table,
>   so `getTeams()` counted `robots.team_id = robots.id` and every team showed
>   "0 robots" since the first commit. Joined queries qualify and were safe.
>   Fix: `${teams}.id`. If another correlated count reads 0 against visible
>   data, check this first.
>
> - **2026-09-08: the first verified fight result is on the site** — and it
>   came from exactly where the thesis said it would: Chinese sources. English
>   media disagreed for months on who won URKL's opener; Huacheng (gz-cmc.com)
>   and People's Daily both record 斗牛士 **Matador def. White Eagle, 3–2 over
>   five rounds**, fighting on after a flying kick removed its head module.
>   Seeded by `scripts/seed-urkl-opener.ts` (teams White Eagle/Matador + their
>   T800s + bout + result; also HKU and UC Berkeley into the URKL field). The
>   bar for entering any result: **two independent sources naming winner,
>   score and method.** The urkl-explained post and league description were
>   corrected accordingly.
>
>   A THIRD instance of the drizzle single-table qualification bug surfaced
>   here (`getEventsForCompetition` boutCount, "0 bouts" beside a standings
>   table counting 1) — same fix, `${events}.id`. Line 435's twin is safe
>   (joined query). BackLink component added to all five detail page types.
>
> - **2026-09-08: the signals watcher is live (stage 1).** `signals` table,
>   `lib/signals.ts` (keyless RSS: Google News EN + **ZH** — the Chinese sweep
>   is the edge), cron route `/api/cron/signals` guarded by CRON_SECRET,
>   `vercel.json` cron at 05:30 UTC daily, triage inbox at `/admin/signals`
>   (keep/dismiss; dismissed URLs never resurface — the unique url IS the
>   dedupe). First live run: 100 EN + 100 ZH items, including a same-day
>   story English media didn't have yet (Unitree claiming the first fully
>   AUTONOMOUS world-model-driven robot fight).
>   Note: never add `server-only` to a lib whose pure functions tests import;
>   it fails the whole test file.
>
> - **2026-09-08: stage 2 is live — the feed is scored.** `lib/classify.ts`
>   ranks every swept row 0–100, assigns a category, and writes a one-sentence
>   summary that is **always English, including for Chinese sources**. That last
>   column is the whole point: the ZH sweep is the edge and it was unreadable to
>   the person doing the triage. Migration `0009_signal_classification.sql` adds
>   `score` / `category` / `summary` / `classified_at`.
>
>   Four decisions worth not undoing:
>
>   - **`classified_at IS NULL` IS the work queue.** A row never seen and a row
>     whose chunk died look identical, so the next sweep retries both. No
>     separate failure column to keep in sync — and the first live run proved
>     it: 2 of 10 chunks died on bare `Connection error.`, 190 of 240 rows
>     scored, the other 50 simply waited. The client now runs `maxRetries: 5`,
>     because a request that never got a response generated no tokens and so
>     costs nothing to retry.
>   - **Haiku 4.5 by default** (`SIGNALS_MODEL` overrides). Do **not** add
>     `output_config.effort` to that call — Haiku 4.5 rejects it. Omitting both
>     `effort` and `thinking` is valid on every current model, which is exactly
>     what makes the override safe.
>   - **Every run reports what it cost.** `usage` and `estimatedCostUsd` come
>     back on `ClassifyResult`, so the cron's JSON response and the manual
>     script both say it out loud. **Measured, not estimated:** 10 items billed
>     1290 in / 385 out = $0.0032, so 200 items a day is roughly $0.06 — call
>     it **$2/month**, and that is an upper bound because a full 25-item chunk
>     amortises the system prompt better than that 10-item one did. The price
>     table in `classify.ts` is a local copy of list prices and WILL go stale;
>     an unknown model returns null rather than a confident wrong number, and
>     the invoice remains the source of truth.
>   - **`SIGNALS_CLASSIFY_LIMIT`** (default 300) is a hard row cap per run. A
>     feed that suddenly returns 5,000 items must not become a 5,000-row bill.
>     A cost control that lives only in the prompt is not a cost control.
>   - **Structured outputs cannot express `minimum`/`maximum`,** so the 0–100
>     range is clamped in `coerceClassification()` AND enforced by a CHECK on
>     the column. The same function drops any id that was not in the chunk — a
>     hallucinated id would otherwise write a score onto an unrelated row.
>
>   The inbox now leads with a cross-language **Priority** section (score ≥ 70)
>   above the EN/ZH split, and says so when rows are unscored — a classifier
>   that quietly stopped would otherwise just look like a calm news day. Run it
>   by hand with `npm run signals:classify` (spends money, same cap).
>
>   Stage 3 (the auto morning brief) is next and lands **in the admin only** —
>   Tobias's call: an LLM-written draft sitting one click from Publish is a
>   worse failure mode than one he has to go and read.
>
> - **2026-09-08: the newsletter is built end to end — and cannot send yet.**
>   Digest builder, double opt-in, unsubscribe, weekly cron and an admin
>   console at `/admin/newsletter` (list counts, live HTML preview in an
>   iframe, test-send to any address). Migration `0010_newsletter_sending.sql`
>   adds `subscribers.confirm_token` and the `newsletter_sends` table.
>
>   **roboxing.tv is verified in Resend** (checked via `domains.list()`:
>   `status=verified`, us-east-1). It was empty an hour earlier, which is worth
>   remembering as the failure mode: a send from an unverified domain 403s with
>   a message that never says "domain". `NEWSLETTER_FROM=onboarding@resend.dev`
>   is the escape hatch that works with no domain at all, but only to the
>   address owning the Resend account.
>
>   **The remaining way this silently does nothing: RESEND_API_KEY missing from
>   the Vercel production environment.** It is in `.env.local`. If it is not in
>   production, the footer form still answers "Check your inbox — click the
>   link to confirm" and no mail is ever sent, leaving the address stranded
>   unconfirmed — `getRecipients()` requires `confirmed_at`, so an unconfirmed
>   row is never mailed, ever. The definitive check is not the dashboard: sign
>   up on the live site with a real address and see whether the mail lands.
>
>   Decisions worth not undoing:
>
>   - **The digest is assembled from the database, never generated.** No model
>     in this path, deliberately. A hallucinated score on a web page can be
>     corrected; one in an inbox cannot. Stage 2 of the watcher uses a model
>     because a human reads its output before anyone else does — this is the
>     opposite situation.
>   - **Upcoming events never justify a send.** `hasNews()` looks only at
>     results and posts. A weekly "these four events are still scheduled" is
>     what teaches a list to ignore you; the schedule rides along as context.
>   - **Every mailing claims a UNIQUE key before it sends** (`weekly:2026-W37`).
>     Insert first, mail only if the insert won. A cron firing twice therefore
>     mails once. `isoWeekKey()` handles the ISO year boundary — 1 Jan 2027 is
>     `2026-W53`, and a naive version emits `2027-W01`, colliding with the real
>     one four days later and silently suppressing that week.
>   - **Confirm and unsubscribe use separate tokens.** One token for both would
>     make the unsubscribe link at the foot of every mail a working confirm
>     link.
>   - **`METHOD_LABELS` moved from `components/badge.tsx` to `lib/format.ts`**
>     now that an email renders the same strings. Two copies would drift into
>     "KO" on the site and "Ko" in the mail.
>
> - **Resend (newsletter) is provisioned** via the marketplace with
>   `domain=roboxing.tv` — final browser step may still be pending, and DNS
>   verification waits on the domain purchase. Duplicate inline newsletter
>   forms were removed: email capture lives ONCE, in the footer. Digest
>   builder + weekly/pre-event cron + unsubscribe endpoint are the next build
>   once RESEND_API_KEY appears in env.
>
> **Real-money betting was considered and rejected**, not on preference. A Malta or
> Curaçao licence does not move US exposure: the Wire Act, UIGEA and 18 U.S.C.
> §1955 attach to where the operator and the customers are, which is why every
> offshore-licensed operator that took US action got prosecuted anyway. The
> operator here is a German national resident in Washington — the state with
> the harshest online-gambling law in the country — so the downside is an
> immigration consequence, not a fine. Free-to-play predictions are the planned
> substitute; they produce better demand data and build the odds layer a real
> book would need. Not legal advice; a gaming attorney is the next step if this
> is ever revisited.
>
> Not yet built, in order: posts/clips with embeds (the site still has no CMS),
> the signals watcher (YouTube API + RSS + Bilibili + Reddit into a triage
> inbox), OG result cards, free-to-play predictions.
>
> **Note on the database:** `drizzle-kit push` is unsafe against this project.
> The live database has drifted from the migrations — it is missing
> `bouts_event_order_unique`, so push proposes to add it and offers to TRUNCATE
> `bouts` to do so. Migration 0005 was applied with
> `npx tsx scripts/apply-migration.ts drizzle/0005_fair_luckman.sql`, which
> runs one file's statements and nothing else. The drift is unfixed and is a
> separate job: without that constraint two bouts on one event can share an
> `order_index`.

> **Steps 4, 5 and 6 were closed on 2026-09-06 by decision, not by passing
> their gates.** The build is finished; the proof is not. No OBS signal has
> ever reached the player, the run-of-show has never been walked, and no
> rehearsal took place. That is recorded here rather than in a green tick,
> because the first real broadcast will otherwise be the first time anyone
> finds out whether the chain holds — and event day is the worst moment to
> learn it.
>
> The session that would settle it is about 30 minutes and needs nothing that
> does not already exist: OBS colour bars are sufficient content. No rights
> deal, no real event. The checklist is at the bottom of this file.
>
> ~~Also noted 2026-09-06: the Vercel Pro subscription lapsed.~~ **Wrong, or
> healed itself: verified in the dashboard on 2026-09-08 — the Roboxing team
> is on Pro, Active, current period 6 Sep – 6 Oct 2026** ($0.59 of the $20
> included credit used). Commercial use is covered. The lapse note either
> described a payment blip or was mistaken; either way, distrust it.

Written to resume cleanly after a break. `DECISIONS.md` explains *why* things
are the way they are; this file says *what is done, what is not, and what is
waiting on whom*.

Last updated: 2026-08-31. Deployed at https://roboxing.vercel.app
222 tests green, build and lint clean, working tree clean.

---

## Do this first

**The leaked live-input stream key is now ORPHANED, and the in-app fix no
longer reaches it.**

A stream key was pasted into a chat and was never replaced. The admin path for
that — the test event → Live console → "Key leaked? Replace it" — worked by
looking the input up through the `streams` row. Seeding the real leagues on
2026-09-07 deleted the test event, which cascaded that row away. Verified:
`select count(*) from streams` is now 0.

The input itself still exists **at Cloudflare**, with the leaked key still
valid. Nothing in this application can see it any more, so it has to be
deleted by hand:

> Cloudflare dashboard → Stream → Live Inputs → input `ff17908f…` → Delete.

Still low urgency — nothing broadcasts, there is no audience, the URL was
never public — but it is now a manual job rather than two clicks, and it will
not fix itself.

---

## Steps 0–3: done

Scaffold, design tokens, database, and the public content pages. All deployed
and verified.

## Step 4 — Cloudflare Stream + player: built, closed unverified

Built and deployed: the hls.js player with a deliberate native-HLS branch for
Safari, token refresh on fatal network error, live-edge drift detection,
`/watch/[slug]`, the CDN-cached 10s poll endpoint, signed playback URLs, geo
restriction, and the paywall.

Proven for real: `createLiveInput()` works against the live Cloudflare API —
**the $0 Stream plan does allow live inputs**, which was an open question for
weeks. Input `ff17908f…` exists for event 7.

Never done, and all of it needs a person at a keyboard:

- No OBS signal has ever reached the player. The whole chain — ingest,
  transcode, HLS, signed token, our player — has only ever been exercised
  against a public Apple test stream.
- Never opened on a second device on a different network.
- Never opened on iOS Safari, which is the one branch of the player that takes
  a different code path.
- Glass-to-glass latency never measured. The plan promises under 30 seconds
  and that number is currently a hope.

## Step 5 — Admin panel: built, security gate proven, run-of-show unwalked

Built: CRUD for competitions, teams, robots, events and bouts; CSV import with
a dry-run preview; the live console; Zod validation; audit logging;
revalidation; R2 image upload with presigned PUT.

Proven on production:

- Every `/admin/*` returns 307 to sign-in without a session.
- Every `/api/admin/*` returns 401 **as JSON**, never 200 with HTML.
- The upload endpoint authenticates *before* it reveals whether R2 is
  configured.
- An event was created by a real admin and the audit row recorded it.

Not done:

- The run-of-show has never been walked end to end.
- No image has ever been uploaded. R2 credentials are set, but a cross-origin
  PUT will likely need a CORS rule on the bucket first — see below.

## Step 6 — Event-day rehearsal: not performed

Needs a real broadcast, so it follows step 4.

Also never done, and it was deviation 4 in the original plan: **the Cloudflare
spend alert**. Delivery is $1 per 1,000 viewer-minutes; 5,000 viewers for two
hours is roughly $600 with no revenue attached. Cloudflare → Manage Account →
Billing → Notifications.

---

## Blocked on a decision or a purchase

| Thing | State | What it costs |
|---|---|---|
| Two-factor authentication | Built, deployed, switched **off** via `REQUIRE_TWO_FACTOR` | Clerk Pro, $25/mo. Turning it on without that locks out every account, including the one that would fix it. |
| "Development mode" badge on the sign-in form | Visible to every visitor | Free — needs a Clerk **production** instance. |
| Clerk application name (`clerk-cyan-drum`) | Patched in the visible strings only | Free — rename in the Clerk dashboard, then delete `src/components/auth/localization.ts`. |
| Password minimum length | 15, with no strength meter | Free — 10 is the recommendation. |
| Google sign-in on our own domain | Currently via `*.clerk.accounts.dev` | Free — production instance + DNS + our own Google OAuth credentials. |
| `roboxing.tv` | Not bought | ~$35–40/yr |
| Stripe | Test mode | Live mode needs the business registered. |
| Broadcast rights | None | **The actual gate on launch.** Everything on the site is invented placeholder data and says so. |

The right Clerk instance is `ins_3Ief0BSpRBVjZXMj8cBy0GzpC98`, reachable via
**vercel.com → roboxing → Integrations → Clerk → Manage**. The instance visible
in a normal Clerk dashboard login is a different, unused app called "Infinita" —
changes made there do nothing.

---

## Test data lying around

- Stripe sandbox: a customer "Roboxing webhook test" with a trialing
  subscription, and entitlement row #1 in the database. Both created to prove
  the webhook chain; safe to delete.
- Event `us2` ("Test event", Madison Square Garden) is now **ready for a
  live test**: status `scheduled`, access `free`, with two bouts seeded —
  TITAN-07 vs RONIN-2 and TITAN-11 vs RONIN-8. The robots are from different
  teams on purpose, so the standings visibly move when a result is entered.
- Its stored instant is `2026-09-06T22:15Z`. The timezone was corrected from
  UTC to `America/New_York`, which moved the *label* but not the instant — it
  now reads 6:15 PM EDT. If 22:15 was meant as New York local time, the stored
  instant should be `2026-09-07T02:15Z`.

## Likely first failure: R2 CORS

Uploads go browser → R2 directly. That is cross-origin, and R2 allows it only
with a CORS rule on the bucket. Cloudflare → R2 → `roboxing-media` → Settings →
CORS Policy:

```json
[
  {
    "AllowedOrigins": ["https://roboxing.vercel.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

The upload's error message names this as the likely cause, because a blocked
cross-origin PUT throws a bare `TypeError` that is otherwise indistinguishable
from being offline.

---

## The session that finishes steps 4, 5 and 6

They overlap almost entirely — it is one sitting with OBS, roughly 30 minutes.

1. Replace the leaked key.
2. Set the test event to `scheduled` and `free`, and add two bouts. Free for
   the first run so a player problem cannot be mistaken for a paywall problem.
3. OBS → Custom server `rtmps://live.cloudflare.com:443/live/`, new key,
   colour bars. Start streaming, then **Go Live** in the console.
4. `/watch/us2` in a second window: picture, red LIVE badge, fullscreen.
5. Phone with wi-fi **off** — second device, other network. iOS Safari at the
   same time if it is an iPhone.
6. Hold a running stopwatch to the camera and compare. That is the latency
   number, measured.
7. Mark a bout live → the viewer's sidebar must change **without a reload**
   (up to 10s, the poll interval).
8. Enter a result → sidebar, robot record and league table all move. That is
   the proof that standings are computed and never stored.
9. Upload a team logo.
10. Stop OBS, set the event to `completed` → **the same URL** must now play the
    recording.
11. Flip access to `subscription` and open `/watch/us2` signed out — no video.
12. Configure the Cloudflare spend alert.
