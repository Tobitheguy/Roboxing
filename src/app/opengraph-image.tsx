import { ImageResponse } from "next/og";

import { CARD, CARD_FONT, displayFont } from "@/lib/card-theme";

/**
 * The share card — what a Roboxing link looks like on X, Discord, Slack,
 * iMessage.
 *
 * For a site whose entire distribution strategy is social, this is not
 * decoration: it is the most-seen piece of brand surface after the favicon,
 * and until this file existed a shared link unfurled as a bare URL.
 *
 * Composed from primitives satori can always render — rectangles and text —
 * rather than loading the display font over the network. A font fetch inside
 * an OG handler is a runtime dependency on Google Fonts for every crawler
 * hit, and the failure mode is a broken share image on exactly the post that
 * happens to go viral. The X glyph is two rotated bars, which is also exactly
 * what it is in the favicon.
 *
 * Dark, deliberately, on a light site: a share card competes inside a feed,
 * not inside our own layout, and the dark tile with the blue X is the same
 * "arena register" the home page spends on its one dark panel.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Roboxing — the record of humanoid robot fighting";


export default async function OpengraphImage() {
  // Bundled, not fetched: a network call to Google Fonts inside the OG
  // handler would make every crawler hit depend on their uptime, and the
  // failure mode is a broken share card on exactly the post that trends.
  const fonts = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: CARD.void,
          padding: "80px",
          gap: "6px",
          fontFamily: CARD_FONT,
        }}
      >
        {/* The R, split by a diagonal bar in the card's own background —
            the same trick the header plays with a transparent gradient, done
            with an overlay here because satori cannot clip a gradient to a
            glyph. Same typeface as the rest of the word, by construction. */}
        <div style={{ display: "flex", position: "relative" }}>
          <div
            style={{
              fontSize: "110px",
              fontWeight: 700,
              color: CARD.ink,
              textTransform: "uppercase",
            }}
          >
            R
          </div>
          <div
            style={{
              position: "absolute",
              left: "-14px",
              top: "78px",
              width: "120px",
              height: "8px",
              background: CARD.void,
              transform: "rotate(-10deg)",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "110px",
              fontWeight: 700,
              color: CARD.ink,
              letterSpacing: "-2px",
              textTransform: "uppercase",
            }}
          >
            oboxing
          </div>
          <div
            style={{
              marginTop: "18px",
              fontSize: "34px",
              color: CARD.dim,
              letterSpacing: "0px",
            }}
          >
            The record of humanoid robot fighting.
          </div>
          <div
            style={{
              marginTop: "10px",
              fontSize: "34px",
              color: CARD.dim,
            }}
          >
            Every league. Every fight. In English.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
