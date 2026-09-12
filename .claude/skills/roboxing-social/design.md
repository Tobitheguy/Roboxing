# Roboxing — design.md

Machine-readable design spec. Everything below is the source of truth; values
are literal and copy-pasteable. `readme.md` is the human reference and explains
*why*; this file is what to type.

- **Product:** Roboxing — the English-language record of humanoid robot
  fighting.
- **Domain:** roboxing.tv
- **Scope:** web, social cards, share images, newsletter.
- **Validated against:** `src/app/globals.css` and the live site, 12 Sep 2026.
- **Precedence:** where this file and `globals.css` disagree, **globals.css
  wins** — it is compiled, this is transcribed. Fix this file and say so.

---

## 0 · Retired values

Named explicitly so an old value found in code reads as an error rather than
an intention.

| Retired | Replaced by | When |
|---|---|---|
| `#FF2D2D` (live red) | `#e5231f` | measured 3.4:1 on white, failed as text |
| A coloured accent ("volt" as a hue) | `--color-volt` → `#14161a` | the brand is monochrome; the token name survives so 130+ call sites need no edit |
| A second typeface for body | Oswald everywhere | decision 2026-09-08 |
| Non-humanoid coverage (piloted mech, wheeled) | removed entirely | 12 Sep 2026 |

---

## 1 · Brand character

Warm-neutral surfaces, near-black ink, **no accent colour**, one condensed
face. The system reads **editorial and exact** — a record, not a broadcaster.
Low chrome, no gradients, no glow, no rounded softness.

Two registers:

| Register | Field | Feel |
|---|---|---|
| Site | `#f6f6f3` canvas, white cards | Restrained, dense, factual |
| Card / social | `#14161a` ink field, canvas text | High contrast, one fact per card |

A card is dark because it competes inside somebody else's feed. The site is
light because it is read for minutes, not scrolled past in two seconds. Never
apply the site's light field to a social card.

---

## 2 · Canonical strings

Use verbatim.

| Slot | String |
|---|---|
| Name | `Roboxing` — one word, capital R, never "RoboXing" or "Robo Boxing" |
| Positioning | `The English-language record of humanoid robot fighting.` |
| Long form | `Every league, every event, full cards, results and standings.` |
| Confidence labels | `Confirmed` · `Reported` · `Unconfirmed` — exact, capitalised, never "verified" or "rumoured" |
| Unpriced machine | `Not published` — never "—", never "N/A" |
| Undated fixture | `Date to be announced` or the row's own `date_label` |
| Automated post | `Automated brief` |

**Never** write "official", "exclusive", "breaking", or "the world's first"
unless a database row carries it with a source.

---

## 3 · Colour

```css
--color-canvas:       #f6f6f3   /* page background */
--color-surface:      #ffffff   /* cards, table rows, header */
--color-surface-2:    #eeeeea   /* hover, popovers, inputs */
--color-line:         #e2e2dc   /* default hairline */
--color-line-strong:  #c8c8c0   /* emphasised divider */

--color-ink:          #14161a   /* primary text — 16.4:1 on canvas */
--color-ink-muted:    #52565e   /* secondary — 7.4:1 */
--color-ink-dim:      #6d717a   /* metadata — 4.64:1 canvas, 4.98:1 surface */

--color-volt:         #14161a   /* the "accent". It is ink. */
--color-volt-dim:     #3a3d44   /* hover/pressed on ink fills */
--color-volt-ink:     #ffffff   /* text on an ink fill */

--color-live:         #e5231f   /* LIVE ONLY — 4.7:1 */
--color-drift:        #a35c00   /* behind the live edge — 4.8:1 */
--color-win:          #14161a
--color-loss:         #8a8e96
```

**On a dark card field**, the site tokens do not apply directly. Use:

```
field       #14161A
text        #F6F6F3
dim text    #9BA0A8
hairline    #2A2E35
panel       #1D2127
```

### Rules

1. **`--color-live` is red and means broadcasting.** Not "important", not
   "new", not decoration. One use, site-wide.
2. **There is no brand colour.** Emphasis is weight, size, and inversion. A
   card that must shout becomes an ink field with canvas text.
3. **The loser is dimmed, not tinted.** There is no second colour to spend.
4. Every text colour above clears WCAG AA on its intended field. Do not
   introduce a lighter grey for "subtle" text.

---

## 4 · Typography

**One face: Oswald.** `--font-display` and `--font-sans` both resolve to it.
Mono (`--font-geist-mono`) is for timecodes, stream keys and IDs only.

```css
--font-display: var(--font-oswald), "Arial Narrow", sans-serif;
--font-sans:    var(--font-oswald), "Arial Narrow", sans-serif;
--font-mono:    var(--font-geist-mono), ui-monospace, monospace;
```

| Token | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| `--text-display` | `clamp(2.75rem, 8vw, 5.5rem)` | `0.88` | `-0.02em` | 700 |
| `--text-hero` | `clamp(2rem, 5vw, 3.25rem)` | `0.95` | `-0.015em` | 700 |
| `--text-title` | `clamp(1.375rem, 2.5vw, 1.875rem)` | `1.1` | `-0.01em` | 600 |
| `--text-eyebrow` | `0.6875rem` | `1` | `0.14em` | 600 |

Headings are uppercase. Eyebrows are uppercase. Body is sentence case.
Numbers use the `tabular` class so scores and times align in a column.

**Image routes must read the font off disk**, never fetch it:

```ts
const oswald = await readFile(
  join(process.cwd(), "src/app/_fonts/oswald-700.ttf"),
);
```

### Card type scale (fixed px, no clamp)

| Element | 1080×1350 | 1080×1080 |
|---|---|---|
| Eyebrow / league | 22 | 22 |
| Event name | 34 | 30 |
| Machine name | 46 | 40 |
| Headline / result | 76 | 64 |
| Meta, credit | 16–22 | 16–20 |

---

## 5 · Shape and motion

```css
--radius: 0.5rem;                              /* tight — precision, not softness */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
```

No pills. No shadows beyond the shadcn defaults already mapped. Borders are
`1px` hairlines; `2px` only to mark a winner on a card.

---

## 6 · Logo

- `Logos/roboxing-r.svg` — the mark.
- `Logos/roboxing-r-black-square.svg` — the mark on a field.
- On a card, the wordmark is set in Oswald, uppercase, `letter-spacing: 0.16em`.

Never re-typeset, recolour or outline the mark. League marks come from
`public/leagues/` and are never redrawn.

**The identity is not final.** An earlier name/logo/colour direction was
rejected and the decision sits with Tobias. Everything above is built so a
rebrand is a token change: no template hard-codes a hex, and the accent is
already neutral.

---

## 7 · Photography

The approved library is `public/machines/` and `public/leagues/`, manifested
in `src/lib/machine-media.ts`. **If a file is not in that manifest, it is not
approved.**

- The credit prints **on the card**, bottom edge, dim text, 16 px.
- Never source imagery from the open web for a published card.
- Never a broadcast frame we did not license, never a generated robot, never
  stock.
- No approved photo? Make a typographic card. They read better in a feed than
  a press shot four other accounts posted the same morning.

---

## 8 · Card formats

| Purpose | Size |
|---|---|
| Share / OG | 1200×630 |
| Social square | 1080×1080 |
| Carousel / portrait | 1080×1350 |
| Story / vertical | 1080×1920 |

Implemented as `next/og` `ImageResponse` routes under `src/app/api/social/`,
taking an entity slug and a `format`, so any card is regenerable from a URL
and reviewable before posting. Reference implementation:
`src/app/api/social/matchup/route.tsx`.

**Satori constraints.** Flex, rectangles and text only. Every element with
more than one child must declare `display: flex` — two adjacent expressions
count as two children, so build strings in JS and pass one child. Images must
be inlined as data URIs; a relative path does not resolve.

---

## 9 · Accuracy rules for published output

These outrank every aesthetic rule in this file.

1. **Every word on a card comes from a database row.** Never inline copy into
   a template — text written into a component cannot be corrected when the
   fact changes.
2. **The confidence label is part of the image** whenever the value is not
   `confirmed`. A screenshot outlives its caption.
3. **Never state a winner the record marks `unconfirmed`.**
4. **A `date_tbd` row prints its `date_label`**, never the stored instant. The
   instant is a placeholder that exists so the calendar can sort.
5. **No invented numbers** — no attendance, no viewership, no ranking the
   database does not compute.
6. The caption links to the page the card was generated from. The card is the
   claim; the page is the evidence.

---

## 10 · Writing

Plain, past tense, specific. The hook is that the fact is surprising, not that
the sentence is excited.

- Lead with what happened, then who reported it.
- Name the source when a fact is single-sourced.
- Say what is not known when that is the story.
- Name the pilot. This sport is people driving robots and the person is
  usually omitted.
- No emoji. No exclamation marks. No "BREAKING". No hype adjectives.
- Never a paraphrase inside quotation marks.

---

## 11 · Open questions

- The identity (name, mark, palette) is not settled. §6.
- No dark mode exists. The `.dark` variant is mapped but the site ships light
  only; a card's dark field is a card decision, not a theme.
- No motion system beyond one easing curve. Nothing on this site animates
  that needs one yet.
