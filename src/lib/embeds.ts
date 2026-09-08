/**
 * Turning a link somebody pasted into something safe to put on a page.
 *
 * The rule this file exists to enforce: an arbitrary URL NEVER becomes an
 * iframe src. An iframe hands the embedded origin a frame on our page, and
 * `javascript:` and `data:` URLs in that position execute in our origin. So
 * the resolver works by allowlist — a known host, matched to a known embed
 * form, or no embed at all.
 *
 * Anything unrecognised is not an error and not dropped. It degrades to a link
 * card, which is honest, still useful, and means adding a platform is a change
 * here rather than a change everywhere.
 *
 * X/Twitter is deliberately a link card rather than an embed. Their embed is
 * not an iframe you can construct — it needs `platform.twitter.com/widgets.js`
 * running on our page, which is a third-party script with tracking attached,
 * on every article, to render a box of text we could render ourselves.
 */

export type ResolvedEmbed =
  | {
      kind: "iframe";
      src: string;
      /** Provider name, for the "watch on" caption and the a11y title. */
      provider: string;
      /** CSS aspect-ratio value. Shorts and Reels are portrait. */
      aspect: "16 / 9" | "9 / 16";
    }
  | { kind: "link"; href: string; host: string }
  | null;

/** A YouTube id is 11 chars of URL-safe base64. Anything else is not one. */
const YOUTUBE_ID = /^[\w-]{11}$/;
/** Bilibili's canonical id: "BV" plus 10 alphanumerics. */
const BILIBILI_ID = /^BV[\w]{10}$/;
const VIMEO_ID = /^\d{6,12}$/;

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

/**
 * Resolve a pasted URL to an embed, a link card, or nothing.
 *
 * Returns null only for input that is not a usable http(s) URL at all — an
 * empty field, or a `javascript:` payload. Everything else is at worst a link.
 */
export function resolveEmbed(raw: string | null | undefined): ResolvedEmbed {
  if (!raw?.trim()) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  // The first and most important gate. `new URL("javascript:alert(1)")` parses
  // perfectly happily; only the protocol check stops it.
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = stripWww(url.hostname);
  const segments = url.pathname.split("/").filter(Boolean);

  /* ---- YouTube ------------------------------------------------------- */

  // youtube-nocookie, not youtube.com: same player, no cookie set until the
  // viewer actually presses play. On a site with EU readers that is the
  // difference between needing a consent banner in front of every clip and
  // not needing one.
  const youtube = (id: string, aspect: "16 / 9" | "9 / 16"): ResolvedEmbed =>
    YOUTUBE_ID.test(id)
      ? {
          kind: "iframe",
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          provider: "YouTube",
          aspect,
        }
      : { kind: "link", href: url.toString(), host };

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (segments[0] === "watch") {
      const id = url.searchParams.get("v");
      if (id) return youtube(id, "16 / 9");
    }
    // Shorts are portrait, and rendering one in a 16:9 box produces a tall
    // video pillarboxed inside a wide black rectangle — most of the frame
    // being nothing. Shorts are also most of what this sport produces.
    if (segments[0] === "shorts" && segments[1]) {
      return youtube(segments[1], "9 / 16");
    }
    if (segments[0] === "embed" && segments[1]) {
      return youtube(segments[1], "16 / 9");
    }
    if (segments[0] === "live" && segments[1]) {
      return youtube(segments[1], "16 / 9");
    }
  }

  if (host === "youtu.be" && segments[0]) {
    return youtube(segments[0], "16 / 9");
  }

  /* ---- Bilibili ------------------------------------------------------ */

  // Where this sport is actually covered. Being able to embed it is most of
  // the reason an English-language outlet has anything to offer.
  if (host === "bilibili.com" || host === "m.bilibili.com") {
    const bvid = segments[0] === "video" ? segments[1] : undefined;
    if (bvid && BILIBILI_ID.test(bvid)) {
      return {
        kind: "iframe",
        // `autoplay=0` is not the default on their player, and a page with
        // three clips on it would otherwise start three of them at once.
        src: `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0`,
        provider: "Bilibili",
        aspect: "16 / 9",
      };
    }
  }

  /* ---- Vimeo --------------------------------------------------------- */

  if (host === "vimeo.com" && segments[0] && VIMEO_ID.test(segments[0])) {
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${segments[0]}`,
      provider: "Vimeo",
      aspect: "16 / 9",
    };
  }

  /* ---- Everything else ----------------------------------------------- */

  return { kind: "link", href: url.toString(), host };
}

/**
 * The YouTube video id in a URL, or null.
 *
 * Exists for thumbnails: YouTube serves a poster frame for every video at
 * `i.ytimg.com/vi/{id}/hqdefault.jpg` with no API key and no embed, which is
 * what lets a post card carry a real image instead of a headline on a white
 * rectangle. Reuses `resolveEmbed`'s host allowlist rather than re-parsing —
 * two URL parsers is how the card shows a thumbnail for a video the post page
 * then refuses to embed.
 */
export function youtubeVideoId(raw: string | null | undefined): string | null {
  const embed = resolveEmbed(raw);
  if (embed?.kind !== "iframe" || embed.provider !== "YouTube") return null;
  // The embed src is always `.../embed/{id}` — built above from a validated id.
  return embed.src.split("/embed/")[1] ?? null;
}

/**
 * A poster image for a post's video, or null when there is none to show.
 *
 * `hqdefault` (480×360) rather than `maxresdefault`: maxres does not exist
 * for every video and 404s where it is missing, while hqdefault is generated
 * for all of them. A guaranteed medium image beats an occasional sharp one
 * that sometimes renders as a broken frame.
 */
export function youtubeThumbnailUrl(
  raw: string | null | undefined,
): string | null {
  const id = youtubeVideoId(raw);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Split plain text into paragraphs.
 *
 * The whole body renderer. Blank lines separate paragraphs, and every
 * paragraph is emitted as a React text child — so it is escaped by React and
 * there is no HTML path at all. See the note on `posts.body`.
 */
export function toParagraphs(body: string | null | undefined): string[] {
  if (!body?.trim()) return [];
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Inline links                                                                */
/* -------------------------------------------------------------------------- */

/** One run of a paragraph: either plain words, or words that link out. */
export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

/**
 * The only markup a post body understands: `[words](https://example.com)`.
 *
 * Deliberately not markdown, and deliberately not HTML. The body column has
 * no HTML path by design — see the note on `posts.body` — and adding one to
 * get a hyperlink would trade a real XSS surface for a convenience. This
 * parser instead produces DATA: a list of text and link runs that the
 * renderer turns into React elements, so every character still goes through
 * React's escaping and an `<a>` is the only tag that can ever appear.
 *
 * The href is validated the same way `resolveEmbed` validates an embed:
 * parseable, and http(s) only. `[click](javascript:alert(1))` therefore
 * cannot produce a link — it degrades to the label as plain text, which
 * keeps the sentence readable instead of silently deleting words.
 */
const INLINE_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function safeHref(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}

/** Split one paragraph into its text and link runs. */
export function toInlineNodes(paragraph: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  // Fresh lastIndex per call: the regex is module-level and /g is stateful,
  // so a shared one would skip matches on every second paragraph.
  INLINE_LINK.lastIndex = 0;
  for (
    let match = INLINE_LINK.exec(paragraph);
    match !== null;
    match = INLINE_LINK.exec(paragraph)
  ) {
    const [whole, label, rawHref] = match;
    if (match.index > cursor) {
      nodes.push({ kind: "text", text: paragraph.slice(cursor, match.index) });
    }
    const href = safeHref(rawHref);
    nodes.push(href ? { kind: "link", text: label, href } : { kind: "text", text: label });
    cursor = match.index + whole.length;
  }

  if (cursor < paragraph.length) {
    nodes.push({ kind: "text", text: paragraph.slice(cursor) });
  }
  return nodes;
}

/** `toParagraphs`, with each paragraph parsed for inline links. */
export function toRichParagraphs(
  body: string | null | undefined,
): InlineNode[][] {
  return toParagraphs(body).map(toInlineNodes);
}
