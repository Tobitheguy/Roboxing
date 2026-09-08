/**
 * Visual identity per league.
 *
 * Exists because Tobias's feedback on the light redesign was exact: the page
 * was "white and full of text" — structurally right and visually anonymous.
 * The cause was equally exact: five leagues rendered identically, so a page
 * about distinct real competitions read as one undifferentiated list.
 *
 * What this is NOT: the leagues' actual logos. EngineAI, Hero Esports and
 * Unitree own their marks, and a site that wants rights conversations with
 * exactly these companies does not open by using their trademarks undisclosed.
 * Same reasoning as never re-hosting their video. What we CAN own is a colour
 * and a monogram per league — the same convention every sports aggregator
 * uses for competitions it does not own.
 *
 * Keyed by slug, so a league seeded later gets the neutral fallback rather
 * than a crash. Colours are hand-picked against the light palette:
 *
 * - Every ACCENT clears 3:1 on white (WCAG 1.4.11) so it can carry a border
 *   or an icon, and every accent is ALSO the background of the monogram with
 *   white text on it, so it must clear 4.5:1 with white — the binding
 *   constraint. Measured values in comments.
 * - None of them is the live red (#E5231F) or close to it. Red still means
 *   exactly one thing on this site.
 * - Tint is the same hue at ~8% opacity for wash backgrounds.
 */

export type LeagueIdentity = {
  /** Saturated brand hue. Border, icon, monogram background. */
  accent: string;
  /** The accent at wash strength, for card headers and eyebrows. */
  tint: string;
  /** Short display mark, e.g. "URKL". Fits a square monogram. */
  mark: string;
};

/**
 * Ink for everyone. Every league had its own hue — violet, magenta, teal,
 * steel — until the brand decision of 2026-09-08: black and white, nothing
 * else, and the league colours were the loudest violators on the page. The
 * per-league MARK stays, because "which league is this" still needs answering;
 * the answer is now the mark and the logo, not a colour.
 *
 * The shape of this map is preserved rather than collapsed to a constant so
 * that per-league colour can come back with a five-line diff if the brand
 * decision ever reverses.
 */
const INK = "#14161A";
const TINT = "rgba(20, 22, 26, 0.06)";

const IDENTITIES: Record<string, LeagueIdentity> = {
  urkl: { accent: INK, tint: TINT, mark: "URKL" },
  cyberhero: { accent: INK, tint: TINT, mark: "CH" },
  "world-humanoid-robot-games": { accent: INK, tint: TINT, mark: "WHRG" },
  rek: { accent: INK, tint: TINT, mark: "REK" },
  "iron-fist-king": { accent: INK, tint: TINT, mark: "IFK" },
};

/** Neutral fallback for a league seeded after this file was written. */
const FALLBACK: LeagueIdentity = { accent: INK, tint: TINT, mark: "" };

export function leagueIdentity(slug: string): LeagueIdentity {
  return IDENTITIES[slug] ?? FALLBACK;
}

/**
 * A short mark for an arbitrary league name, for the fallback case.
 * "Some New League" -> "SNL", capped at 4 characters.
 */
export function leagueMark(slug: string, name: string): string {
  const known = IDENTITIES[slug]?.mark;
  if (known) return known;
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return initials.slice(0, 4) || name.slice(0, 3).toUpperCase();
}
