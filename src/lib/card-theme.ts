import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The palette and face every generated image shares.
 *
 * WHY THIS FILE EXISTS.
 *
 * Five routes draw PNGs — three opengraph images, the matchup card, and
 * whatever comes next — and each one had its own `const INK = "#14161A"` at
 * the top. When DIR_03 replaced the skin, the site inverted and all five kept
 * rendering the retired one. Nobody sees a share card while working on the
 * site; you see it a week later, in somebody else's feed, next to the page it
 * is supposed to represent. That is the worst place to discover a palette is
 * two versions behind.
 *
 * So the tokens live here, once. A route that wants a colour imports it.
 *
 * These are the same values as `globals.css`, restated as hex because satori
 * cannot read a CSS custom property. That duplication is real and the comment
 * is the mitigation: if one changes, change both.
 */
export const CARD = {
  /** The ground. Every card is void — it competes inside somebody's feed. */
  void: "#0B0F10",
  /** Panels and photo wells inside a card. */
  surface: "#14191A",
  /** Body and machine names. */
  ink: "#F2F0EA",
  /** Secondary: teams, credits, metadata. */
  dim: "#828E90",
  /** The 2px rule. Never softened to a hairline. */
  line: "#1F2728",
  /** Emphasised divider — the one between two equal cells. */
  lineStrong: "#2E3839",
  /** Instrument cyan: structure, certainty, the winner's edge. Not emphasis. */
  volt: "#00E5D0",
  /** Text ON a cyan fill. Cyan on cyan is the bug this token prevents. */
  voltInk: "#062B27",
  /** BROADCASTING ONLY. A card carries it only while the event is live. */
  live: "#FF3225",
} as const;

/**
 * Both faces a card can use, read off disk.
 *
 * Never fetched. A Google Fonts request inside an image handler makes every
 * render depend on a third party, and it fails on exactly the post that
 * travels.
 *
 * TWO FACES, BECAUSE DISPLAY IS NEVER A SENTENCE. Anton is for names,
 * results and headlines; Archivo is for anything with a verb in it. The
 * share cards used to set their summary paragraphs in the display face,
 * which is the rule this system states most plainly and the easiest one to
 * break by accident — a card only has one `fontFamily` at the root and
 * everything inherits it.
 *
 * Anton ships one weight, which is why it is registered at 400 — asking for
 * 700 makes satori synthesise a bold and weld the letters together, the same
 * defect `font-synthesis-weight: none` fixes in the browser.
 */
export async function displayFont() {
  const [anton, archivo] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_fonts/anton-400.ttf")),
    readFile(join(process.cwd(), "src/app/_fonts/archivo-400.ttf")),
  ]);
  return [
    { name: "Anton", data: anton, weight: 400 as const, style: "normal" as const },
    {
      name: "Archivo",
      data: archivo,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
}

/** Names, results, headlines. Always uppercase, never a sentence. */
export const CARD_FONT = "Anton";

/** Anything with a verb in it. Never a headline. */
export const CARD_BODY_FONT = "Archivo";
