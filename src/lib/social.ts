/**
 * The accounts that are actually ours.
 *
 * ONE MODULE because these three URLs will be needed in more than one place.
 * The footer is the first, but the natural second is a `sameAs` array in the
 * site's structured data — the signal that tells Google the X account, the
 * Instagram account and this domain are one organisation rather than three
 * unrelated things with a similar name. When that gets built, it reads from
 * here rather than retyping the URLs, because the failure mode of two copies is
 * a `sameAs` pointing at a handle we no longer own.
 *
 * ON USING THE PLATFORMS' REAL MARKS. `components/social-icons.tsx` draws the
 * X, Instagram and TikTok glyphs rather than writing the words out. That is the
 * same call already made for the organiser logos, and the same reasoning:
 * nominative use — a mark used to identify the thing it actually denotes — is
 * what every site on the internet does with a social icon row, and it is not
 * the situation the league-identity monograms were avoiding. There we were
 * declining to dress our own pages in EngineAI's and Unitree's trademarks while
 * seeking rights conversations with them. Here the glyph points at our own
 * profile on that platform, which is precisely what the mark is for.
 *
 * The icons are drawn monochrome from `currentColor` — no brand colours. That
 * is a brand decision (black and white, nothing else) that happens to also be
 * the safer trademark position.
 */
export type SocialPlatform = "x" | "instagram" | "tiktok";

export type SocialAccount = {
  platform: SocialPlatform;
  /** Used as the accessible name. "Roboxing on X", never just "X". */
  name: string;
  /** Shown to humans if a surface ever wants text instead of a glyph. */
  handle: string;
  href: string;
};

/**
 * Order is deliberate: X first because that is where robotics news is argued
 * over and where the reply-to-bigger-accounts strategy lives, then the two
 * video platforms. Not alphabetical — the row reads left to right and the first
 * position is the one that gets clicked.
 */
export const SOCIAL_ACCOUNTS: SocialAccount[] = [
  {
    platform: "x",
    name: "Roboxing on X",
    handle: "@roboxingtv",
    href: "https://x.com/roboxingtv",
  },
  {
    platform: "instagram",
    name: "Roboxing on Instagram",
    handle: "@roboxing.tv",
    href: "https://www.instagram.com/roboxing.tv/",
  },
  {
    platform: "tiktok",
    name: "Roboxing on TikTok",
    handle: "@roboxing.tv",
    href: "https://www.tiktok.com/@roboxing.tv",
  },
];
