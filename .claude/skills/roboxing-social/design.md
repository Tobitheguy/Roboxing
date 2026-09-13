# Roboxing — design.md

Machine-readable design spec. Everything below is the source of truth; values
are literal and copy-pasteable. `readme.md` is the human reference and explains
*why*; this file is what to type.

- **Product:** Roboxing — the English-language record of humanoid robot
  fighting.
- **Domain:** roboxing.tv
- **Scope:** web, social cards, share images, newsletter.
- **Validated against:** `src/app/globals.css`, DIR_03 skin, 12 Sep 2026.
- **Change of record:** DIR_03 supersedes the monochrome skin. Where this
  file and Brand Book v2 disagree, DIR_03 wins — the book has not been
  re-skinned and says so itself. Its RULES are current; its colours are not.
- **Precedence:** where this file and `globals.css` disagree, **globals.css
  wins** — it is compiled, this is transcribed. Fix this file and say so.

---

## 0 · Retired values

Named explicitly so an old value found in code reads as an error rather than
an intention.

| Retired | Replaced by | When |
|---|---|---|
| Light ground `#f6f6f3` | Void `#0b0f10` | DIR_03 |
| Monochrome accent (`--color-volt` = ink) | Instrument cyan `#00e5d0` | DIR_03 — volt NAMES a colour again |
| `#e5231f` live red | `#ff3225` | DIR_03 |
| Oswald, one face for everything | Anton / Archivo / JetBrains Mono | DIR_03 |
| `--radius: 0.5rem` | `0` at every step | DIR_03 — do not reintroduce a radius scale |
| 1px hairlines | 2px rules, never softened | DIR_03 |
| `#FF2D2D` (live red) | superseded twice; see above | pre-DIR_03 |
| Non-humanoid coverage (piloted mech, wheeled) | removed entirely | 12 Sep 2026 |

---

## 1 · Brand character

Void ground, paper for long-form, **one system colour with a job**, three faces
with no overlap. Flat, flush left, zero radius, 2px rules — alignment does the
organising, nothing floats, nothing is decorated.

Three registers:

| Register | Field | Feel |
|---|---|---|
| Site | `#0b0f10` void, `#14191a` panels | Scanned. Dense, instrument-like |
| Long-form | `#f2f0ea` paper, `#0b0f10` ink | Read. Somebody sat down and wrote this |
| Card / social | `#0b0f10` void | Competes inside somebody else's feed |

Void is scanned, paper is read. The inversion is the signal, not a theme
toggle and never user-selectable.

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
--color-canvas:       #0b0f10   /* void — the ground */
--color-surface:      #14191a   /* panel — cards, rows, header */
--color-surface-2:    #1c2223   /* hover, inputs */
--color-line:         #1f2728   /* the 2px rule */
--color-line-strong:  #2e3839   /* emphasised divider */

--color-paper:            #f2f0ea   /* long-form surface */
--color-paper-ink:        #0b0f10   /* 17.1:1 on paper */
--color-paper-ink-muted:  #3c4647   /* 9.2:1 on paper */
--color-paper-line:       #cdc9bf

--color-ink:          #f2f0ea   /* body on void — 16.8:1 */
--color-ink-muted:    #8a9698   /* secondary — 7.1:1 */
--color-ink-dim:      #828e90   /* ticker, metadata — 5.71:1 */

--color-volt:         #00e5d0   /* instrument cyan — structure, links, certainty */
--color-volt-dim:     #00b3a3   /* hover/pressed on cyan fills */
--color-volt-ink:     #062b27   /* text on a cyan fill — 12.6:1 */
--color-volt-deep:    #00776c   /* cyan for text ON PAPER — 5.1:1 */

--color-live:         #ff3225   /* BROADCASTING ONLY — 5.4:1 */
--color-drift:        #ffb300   /* behind the live edge */
--color-win:          #f2f0ea
--color-loss:         #828e90
```

Inside `.on-paper` the ink tokens are REDEFINED rather than the components
restyled — an article inherits the whole inversion with no component edit, and
`--color-volt` becomes `--color-volt-deep` there, because cyan at full strength
measures 1.7:1 on paper and fails as text.

### Rules

1. **`--color-live` is red and means broadcasting right now.** Not a button,
   not an error, not a finished result, not decoration. On a normal week the
   colour does not appear at all — which is exactly what makes it legible the
   week it does. **While red is live, cyan drops to muted on that surface: two
   signals at once is no signal.**
2. **Cyan is structure, links and certainty.** It is not emphasis. A stat tile
   painted cyan is a reader looking for a meaning that is not there — emphasis
   is size.
3. **On a cyan or red field, state the text colour explicitly.** The base layer
   paints every anchor cyan, so an inherited link on a cyan bar is cyan on
   cyan. This has caught the wordmark, every heading link, and the ticker.
4. **The loser is dimmed, not tinted.** There is no third colour to spend.
5. Every value above clears WCAG AA on its intended field.

---

## 4 · Typography

**Three faces, three jobs, no overlap.**

| Role | Face | Used for |
|---|---|---|
| Display | **Anton** (400 only) | Results, machine names, headlines. Always uppercase, never a sentence. |
| Body | **Archivo** (400–700) | Every sentence. Never a headline. |
| Mono | **JetBrains Mono** | Ticker, IDs, timecodes, scores, confidence chips, nav, filter chips. |
| CJK | **Noto Sans SC** | Fallback on every stack. Anton has no CJK and machine names are routinely Chinese. |

```css
--font-display: var(--font-anton), "Anton", "Noto Sans SC", sans-serif;
--font-sans:    var(--font-archivo), "Archivo", "Noto Sans SC", sans-serif;
--font-mono:    var(--font-jetbrains-mono), ui-monospace, monospace;
```

**TRACKING IS 0.03em ON DISPLAY, NOT DIR_03's 0.005em.** Anton is extremely
condensed and its caps very nearly touch at their default fit; at 0.005em a
long name — ULTIMATE ROBOT KNOCK-OUT LEGEND — closes into an unreadable block.
The prototype's headlines are one word, where the tight fit looks deliberate.
Small headings (`h3`) take 0.055em and drop to 92% opacity: optical sizing runs
the opposite way to intuition, and #F2F0EA on #0B0F10 at 16.8:1 blooms at small
sizes.

**`font-synthesis-weight: none` is set globally.** Anton ships one weight and
the codebase still carries `font-bold` from the Oswald era; without this the
browser fakes the weight by smearing the glyphs, which welds adjacent letters
together.

**Image routes must read the font off disk**, never fetch it.

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
--radius: 0;                                   /* zero at every step */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
```

**Zero radius everywhere. Do not reintroduce a radius scale.** No pills, no
shadows, no gradients, no glow. Rules are **2px** and never softened to
hairlines. Everything is flush left, including labels inside wide buttons.

Spacing stays on the 8px rhythm.

---

## 6 · Logo

- `public/roboxing-r.svg` — the mark, as drawn. **The SVG, never reconstructed
  from a font.** A mark built from whatever face is loaded breaks on the next
  type decision — it did, when Anton replaced Oswald and the header rendered a
  black slab over the first glyph.
- The wordmark beside it is set in the display face, uppercase, `0.04em`.

Rules from Brand Book v2, all current:

- Clear space on all sides equals the width of the R's stem.
- **Minimum 24px** — it must hold beside seven foreign league marks.
- Ink on ground, or knocked out of an ink tile. **Never red. Never cyan** —
  cyan means certainty and a mark cannot also carry a meaning.
- Never stretched, squeezed, rotated, tilted, rounded, shadowed or glowed.
- **Never redraw or recomposite it.** Place the supplied SVG and leave it alone.
- League marks come from `public/leagues/` and are never redrawn either.

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

## 8a · The matchup card — the fixture poster

From Brand Book v2, template B. **Two equal cells divided by a 2px rule. The
division is the whole idea, so neither side is ever given more weight.**

```
+----------------------------------------------+
| ULTIMATE BOTS                   SEP 30, 2026 |   league left, date right
+----------------------+-----------------------+
|   [machine photo]    |    [machine photo]    |   equal cells, 2px rule
|   AI STRATEGIST      |    ENERGY GUARDIAN    |   name, display face
|   Unitree G1 · CN    |    Unitree G1 · CN    |   chassis · country
+----------------------+-----------------------+
| ROBOXING            UFB SEASON 2 · TIME TBA  |
+----------------------------------------------+
```

Verbatim from the book:

- **Machine name, chassis, country.** Never a nickname we invented.
- **A time that is genuinely unknown reads `time TBA`.** Never a guess, never
  omitted.
- **Live events only:** a red dot and `LIVE NOW` replace the date, and only
  while it is happening.
- For a single-machine profile the right cell becomes the stat block — height,
  mass, price, record.
- **No "V" as a headline.** The rule between the cells is the versus.

**Unpaired is the normal state.** Most cards in this sport are announced as a
number of bouts with no pairings, so both cells then read `TBA` with the bout
number beneath — never a placeholder name. A fabricated card in the biggest
slot on the page is the worst thing this site could publish.

**ONE IMPLEMENTATION, TWO SURFACES.** `/api/social/matchup` already renders
this as a PNG for social. The event page renders that same route rather than
rebuilding the layout in HTML. Two implementations of one card drift, and the
drift stays invisible until somebody puts them side by side.

## 8b · The result card

Template A, the workhorse. Published within two hours of a result reaching any
confidence state above nothing.

**Outcome first.** The result sits in the TOP THIRD at the largest size on the
card — a feed decides in the upper 30% of the image, and the machines below are
the evidence, not the headline.

- **Winner named first** in the outcome line, and again on the left below.
- **A timestamp, not an adjective.** Top right: "14 min ago". It carries the
  urgency that "BREAKING" pretends to.
- **Confidence label on the same baseline as the method**, never near the logo.
- **No red anywhere.** The fight is over.

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

- The identity (name, mark, palette) is not settled. §6. Tobias rejected the
  name, logo and colours and is working on his own direction; DIR_03 is the
  skin, not the brand.
- The two surfaces are void and paper, and which one a page gets is an
  editorial call — void is scanned, paper is read. There is no theme toggle
  and it is not user-selectable. A card is always void.
- No motion system beyond one easing curve. Nothing on this site animates
  that needs one yet.
- The favicon is still an Oswald "R" reconstructed as a path, from the era
  when the brand was one typeface. It contradicts §logo ("never redraw or
  recomposite the mark") and it is deliberately left alone until the rebrand
  lands, because replacing it is a branding decision, not a cleanup.
