---
name: roboxing-social
description: Use this skill to generate well-branded assets for Roboxing — social cards, carousel slides, share images, newsletter headers — and to write any copy that leaves the site. Contains the design tokens, fonts, logo and photography rules, card formats, and the accuracy rules a published card must obey.
user-invocable: true
---

# Roboxing Design

Read **`design.md`** first — it is the machine-readable source of truth:
literal, copy-pasteable values for colour, type, shape, card formats, the
retired values, and the accuracy rules. Then `readme.md` for the full
reference and the reasoning behind them.

Where `design.md` and `src/app/globals.css` disagree, **globals.css wins** —
it is compiled, `design.md` is transcribed. Fix the transcription and note it.

**Roboxing is the English-language record of humanoid robot fighting — every
league, every event, full cards, results and standings.** It is not a
broadcaster and holds no rights; the model is HLTV, not ESPN. It is the place
you go to find out what actually happened, including what nobody has published.
Default visual mode: light canvas (`#f6f6f3`), near-black ink (`#14161a`),
Oswald 700 condensed uppercase for display, monochrome with **one** reserved
red that means broadcasting and nothing else. Plainspoken, past tense,
specific — never hyped, never breathless. "Roboxing" is one word.

## Where things are

Unlike a handoff kit, this skill does **not** copy assets. The app and the
brand live in one repository, so the skill points at the real files — a copied
token is a token that drifts.

- `src/app/globals.css` — every colour, type and spacing token. Read values
  from here; never retype a hex from memory.
- `src/app/_fonts/oswald-700.ttf` — the display face, bundled for image routes.
- `Logos/roboxing-r.svg`, `Logos/roboxing-r-black-square.svg` — the mark.
- `public/leagues/` — league marks (cyberhero, engineai, rek, unitree, urkl,
  whrg).
- `public/machines/` — the approved photography library, **every file credited
  in `src/lib/machine-media.ts`**. That file is the manifest; if a photo is not
  in it, it is not approved.
- `src/app/**/opengraph-image.tsx` — three working `next/og` templates. Copy
  their structure: bundled font read off disk, satori primitives, no network.
- `src/components/` — the site's own primitives (Card, Badge, ConfidenceBadge,
  LeagueMarkBadge). Card templates should look like the site, not like a
  separate brand.

## The rules that are cheap to break

- **Red (`--color-live`, `#e5231f`) means LIVE.** Not "important", not "new",
  not an accent. The moment red appears on a finished result, red stops meaning
  broadcasting.
- **The accent is ink, not a hue.** Monochrome on purpose. To make a card
  shout, invert it — ink field, canvas text — never add a second colour. This
  also keeps a rebrand a token change rather than a rewrite of every template.
- **Fonts are read off disk, never fetched.** A Google Fonts call inside an
  image handler makes every render depend on a third party, and it fails on
  exactly the post that travels.
- **Photography: the approved library only.** `public/machines/` and
  `public/leagues/`, and the credit must appear **on the card**, not only in
  the caption. Never pull an image from the open web, never a broadcast frame
  we did not license, never a generated or placeholder robot. No approved photo
  for the subject? Use a typographic card — those are more distinctive in a
  feed than a press shot four other accounts posted today, and they carry no
  rights question.
- **Real logos only.** League marks from `public/leagues/`. Never redraw or
  generate a league's mark.
- **The confidence label travels ON the card.** `confirmed` needs no badge;
  `reported` and `unconfirmed` must be visible in the image, because a
  screenshot outlives its caption.
- **Never claim a winner the record marks unconfirmed.** The URKL opener is the
  live example — three sources, three answers, the promoter published nothing.
- **No invented numbers.** No attendance, no viewership, no "biggest ever", no
  ranking the database does not compute.
- **No emoji. No exclamation marks. No "BREAKING".**

## How to work

- **Card templates are code, not prompts.** A model drawing each card at post
  time drifts — different margins, a different word for "decision" — which is
  fatal for a site whose proposition is being the reliable record. Build
  `next/og` `ImageResponse` routes under `src/app/api/social/` that take an
  entity slug and a format, so any card can be regenerated from a URL and
  reviewed before it is posted. This skill is the spec; the route is the
  implementation.
- **Every word on a card comes from a database row.** Never inline copy into a
  template — text written into a component cannot be corrected when the fact
  changes.
- **Captions:** state the fact first, name the source when it is single-sourced,
  say plainly what is not known when that is the story, end with the link to
  the page the card was generated from. The card is the claim; the page is the
  evidence.

If invoked without other guidance, ask what is being built, ask a few focused
questions, then act as an expert Roboxing designer — producing an
`ImageResponse` route for anything that will be published, or static HTML for a
throwaway mock.
