# Where Roboxing stands

Written to resume cleanly after a break. `DECISIONS.md` explains *why* things
are the way they are; this file says *what is done, what is not, and what is
waiting on whom*.

Last updated: 2026-08-31. Deployed at https://roboxing.vercel.app
222 tests green, build and lint clean, working tree clean.

---

## Do this first

**A live-input stream key was pasted into a chat and is still valid.** It has
not been replaced — there is no `stream.rotate` in `admin_audit`.

Admin → the test event → Live console → **"Key leaked? Replace it"** →
**"Replace key"**. That deletes the input at Cloudflare and issues a new one
in the same request. A Cloudflare stream key cannot be rotated in place, which
is why the button replaces the whole input.

Low urgency in practice — nothing is broadcasting, no audience, the URL is not
public. Two clicks all the same.

---

## Steps 0–3: done

Scaffold, design tokens, database, and the public content pages. All deployed
and verified.

## Step 4 — Cloudflare Stream + player: NOT done

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

## Step 5 — Admin panel: mostly done

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

## Step 6 — Event-day rehearsal: not started

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
- Event `us2` ("Test event", Madison Square Garden) has **no bouts**, status
  `completed`, access `subscription`. The run-of-show needs at least two bouts
  and status `scheduled`.
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
