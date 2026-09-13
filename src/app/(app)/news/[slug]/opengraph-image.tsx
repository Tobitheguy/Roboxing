import { ImageResponse } from "next/og";

import { CARD, CARD_BODY_FONT, CARD_FONT, displayFont } from "@/lib/card-theme";

import { getPostBySlug } from "@/lib/queries";

/**
 * The share card for a story that has no picture of its own.
 *
 * Three of the seven launch pieces carry a YouTube embed and unfurl with the
 * video's poster frame; the rest had nothing. Worse than nothing, in fact —
 * because the page sets its own `openGraph` object, an explicit metadata
 * export suppresses the inherited site-wide card too, so those links unfurled
 * with no image at all.
 *
 * A generated headline card beats the generic site card regardless: the
 * headline IS the reason to click, and on a social-first site the card is the
 * whole pitch for everyone who scrolls past.
 *
 * Only used when the post has neither a cover image nor an embed — the page's
 * `generateMetadata` sets `openGraph.images` in those cases, and explicit
 * metadata wins over this file.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Roboxing story";


/**
 * Long headlines have to shrink or they overflow the card silently — satori
 * clips rather than wrapping indefinitely, and the failure is invisible until
 * somebody shares the one post with a long title.
 */
function headlineSize(title: string): number {
  if (title.length > 78) return 56;
  if (title.length > 52) return 68;
  return 84;
}

export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fonts = await displayFont();

  const row = await getPostBySlug(slug);
  const title = row?.post.title ?? "Roboxing";
  const summary = row?.post.summary ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CARD.void,
          padding: "70px 80px",
          fontFamily: CARD_FONT,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "30px",
            color: CARD.dim,
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          Roboxing
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: `${headlineSize(title)}px`,
              color: CARD.ink,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          {summary ? (
            <div
              style={{
                display: "flex",
                marginTop: "26px",
                fontSize: "32px",
                color: CARD.dim,
                /* The summary is a sentence, so it is set in the body face.
                   The card's root fontFamily is the display face and
                   everything inherits it — which is how a paragraph ends up
                   in Anton without anyone deciding it should. */
                fontFamily: CARD_BODY_FONT,
                lineHeight: 1.3,
              }}
            >
              {summary.length > 130 ? `${summary.slice(0, 127)}…` : summary}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "28px",
            color: CARD.dim,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          roboxing.tv
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
