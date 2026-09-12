# Roboxing design guide

The full version. `SKILL.md` is the summary; this is what to read before
building a card template or writing anything that leaves the site.

---

## 1. What Roboxing is

The English-language record of humanoid robot fighting: every league, every
event, full cards, results and standings.

**It is not a broadcaster.** It holds no rights and carries almost no video.
The model is HLTV — the system of record for a sport it does not own, which
became unavoidable rather than official. Not ESPN. Getting this wrong produces
the wrong design: a player where a directory belongs, a hype register where a
record belongs.

**Scope is humanoid only.** Bipedal humanoid robots. Piloted mechs (a human
inside) and wheeled combat were carried briefly and removed — a wall between
sections is not the same as a promise kept. Nothing non-humanoid goes on a
card.

**The differentiator is provenance.** Every fact on the site carries a
confidence level and, where one exists, a source. The strongest content this
brand has is not results — it is the gaps: two World Humanoid Robot Games with
fighting as a scored event and no medallists ever published; the most famous
bout in the sport with no agreed winner. Design for that.

---

## 2. Voice

Plain, past tense, specific. The hook is that the fact is surprising, not that
the sentence is excited.

**Do**
- Lead with what happened. "Team FBA beat Team Al Majd 4–3 over seven rounds."
- Name the source when a fact is single-sourced. "The team names rest on
  Xinhua alone."
- Say what is not known when that is the story. "Nobody has published the
  medallists."
- Use the machine's real name and the pilot's real name. This sport is people
  driving robots; the person is usually omitted, and putting them back is the
  brand.

**Never**
- Emoji, exclamation marks, "BREAKING", "INSANE", "you won't believe".
- Superlatives the database cannot support — "biggest", "first ever", "fastest"
  unless a row says so with a source.
- A paraphrase inside quotation marks.
- Present tense for a finished event.

---

## 3. Visual foundations

**Read the tokens from `src/app/globals.css`.** Values below are orientation,
not a second source of truth.

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#f6f6f3` | page field |
| `--color-surface` | `#ffffff` | cards, rows |
| `--color-surface-2` | `#eeeeea` | hover, inputs |
| `--color-line` | `#e2e2dc` | hairline |
| `--color-line-strong` | `#c8c8c0` | emphasised divider |
| `--color-ink` | `#14161a` | primary text, and the accent |
| `--color-ink-muted` | `#52565e` | secondary |
| `--color-ink-dim` | `#6d717a` | tertiary, captions, credits |
| `--color-live` | `#e5231f` | **LIVE ONLY** |
| `--color-drift` | `#a35c00` | warning |

Two absolutes:

1. **Red means broadcasting.** If it appears anywhere else, it stops meaning
   anything.
2. **There is no brand colour.** Emphasis is weight, size and inversion. A card
   that needs to shout becomes an ink field with canvas text — the same "arena
   register" the home page spends its one dark panel on. This is also what
   makes a rebrand cheap: swap tokens, not templates.

### Type

- `--font-display` — Oswald 700. Condensed, uppercase, tight leading
  (`0.88`–`0.95`). Headlines and numbers.
- Body uses the same family; long prose is rare on a card.
- Numbers use the `tabular` class so scores and times align in a column.
- Eyebrows: `0.6875rem`, `letter-spacing: 0.14em`, uppercase.

### Logo

`Logos/roboxing-r.svg` (full) and `Logos/roboxing-r-black-square.svg` (mark on
a field). The brand is **not settled** — an earlier name/logo/colour direction
was rejected and the decision sits with Tobias. Build so the mark comes from
one constant and the palette from tokens.

---

## 4. The approved image library

`public/machines/` and `public/leagues/`, manifested in
`src/lib/machine-media.ts`. Every file there carries a credit: EngineAI,
Unitree Robotics, URKL / EngineAI, REK, or a named broadcast.

Rules:

- **Only these files.** Never source new imagery from the open web for a
  published card. A photo used editorially on an article page, with a credit
  line beside it, is a different act from the same photo on a branded card
  where the framing implies it is ours.
- **The credit appears on the card**, bottom edge, `--color-ink-dim`, small but
  legible.
- **Never a broadcast frame we did not license**, never a generated robot,
  never a stock "robot" image. A stock humanoid contradicts a site whose entire
  claim is that it knows the actual machines.
- **No approved photo? Make a typographic card.** They perform better in a feed
  than a press shot four other accounts posted the same morning, and they carry
  no rights question at all.
- League marks come from `public/leagues/` and are never redrawn.

---

## 5. Formats

| Purpose | Size |
|---|---|
| Share / OG | 1200×630 |
| Social square | 1080×1080 |
| Carousel / portrait | 1080×1350 |
| Story / vertical | 1080×1920 |

Design the square first, then let the portrait breathe. A portrait squashed
into a square loses the bottom third — which is where the source line lives.

---

## 6. Card types

Every card is generated from a database row. If a fact is not in the database,
it does not go on a card.

### Result card
Robot A, robot B, method, round, league mark, **confidence label**. Winner
emphasised by weight, not colour. A result card without its confidence label is
not shippable.

### Fixture card
Event, league, date. If `date_tbd` is set, print `date_label` and nothing else
— never render the stored placeholder instant as a date. Six CyberHero circuit
stops carry invented `starts_at` values purely so the calendar can sort them;
printing one as a date invents a fixture. Same rule as `EventDate` on the site.

### Open question card
The question, and one line of what is missing. The strongest posts this account
has, because nobody else tracks them.

### Machine card
Model, maker, spec line (height · weight · DoF), one approved photo with its
credit. Price only if `price_usd` is set — "Not published" is a fact about the
manufacturer, not a blank.

### Quote card
One sentence from a named source, attributed **on the card**. Never a
paraphrase in quotes.

### Live card
The only place `--color-live` appears. "X is live now", league mark, the
channel. Generated from a live check, never scheduled in advance.

---

## 7. Accuracy rules for anything published

A post is far harder to correct than a page. Treat a card as final.

- The confidence label is part of the image, not the caption.
- Never state a winner the record marks `unconfirmed`.
- Never a number the database does not hold.
- The caption always links to the page the card was generated from. The card is
  the claim; the page is the evidence.
- If a card turns out to be wrong: correct the row, regenerate the card, and
  post the correction rather than deleting quietly. The record's value is that
  it says how it knows.

---

## 8. Implementation

Templates are **code**: `next/og` `ImageResponse` routes under
`src/app/api/social/`, taking an entity slug and a format so any card can be
regenerated from a URL and reviewed before posting.

Copy the structure of `src/app/opengraph-image.tsx`:

- font read off disk with `readFile`, never fetched
- satori primitives only — flex, rectangles, text; no CSS the renderer cannot
  do
- dark field when the card must compete inside a feed

**Never inline copy into a template.** Every word comes from the row being
rendered — text written into a component cannot be corrected when the fact
changes, which is the same reason the entry-route tiles on the site carry no
prose.

A model must not draw cards at post time. Drift across posts — different
margins, a different word for "decision" — reads as improvised, which is
exactly what a record cannot afford. The skill is the spec; the route is the
implementation.
