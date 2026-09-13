import { ImageResponse } from "next/og";

import { CARD, CARD_FONT, displayFont } from "@/lib/card-theme";

import { METHOD_LABELS, formatDateLong, formatFinish } from "@/lib/format";
import { getBoutsForEvent, getEventBySlug } from "@/lib/queries";

/**
 * The share card for one event — and, once it has been fought, for its result.
 *
 * This is the piece that was missing. The site's distribution is social: a
 * result gets posted, and the card is the entire message for everyone who
 * scrolls past without clicking. A link that unfurls as "Roboxing — the record
 * of humanoid robot fighting" says nothing about the fight; one that says
 * MATADOR def. WHITE EAGLE is the story.
 *
 * Same construction rules as the root card, for the same reasons: rectangles
 * and text only, the display font read off disk rather than fetched, and dark
 * on a light site because the card competes inside somebody else's feed.
 *
 * Note this does NOT override a real poster. `generateMetadata` on the page
 * sets `openGraph.images` when the event has a `posterUrl`, and explicit
 * metadata wins over the file convention — a promoter's own artwork should
 * beat anything generated here.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Roboxing event card";


export default async function EventOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fonts = await displayFont();

  const row = await getEventBySlug(slug);

  // A slug that resolves to nothing still has to answer with an image: a
  // crawler that gets a 500 here caches the failure, and the link stays
  // unfurl-less long after the page itself is fixed.
  if (!row) {
    return new ImageResponse(<Fallback />, { ...size, fonts });
  }

  const { event, competitionName } = row;
  const bouts = await getBoutsForEvent(event.id);
  const decided = bouts.filter((bout) => bout.result !== null);

  /*
   * The headline is the LAST decided bout on the card, not the first. Bouts
   * are ordered by `orderIndex` ascending and a fight card is built to finish
   * on its biggest fight, so the main event is at the end. Leading with bout
   * one would put the opener on the card.
   */
  const headline = decided.length > 0 ? decided[decided.length - 1] : null;

  const winnerName =
    headline?.result?.winnerRobotId === headline?.robotA.id
      ? headline?.robotA.name
      : headline?.result?.winnerRobotId === headline?.robotB.id
        ? headline?.robotB.name
        : null;
  const loserName =
    winnerName === null
      ? null
      : winnerName === headline?.robotA.name
        ? headline?.robotB.name
        : headline?.robotA.name;

  const where = [event.city, event.country].filter(Boolean).join(", ");
  /*
   * startTimeTbd exists because organizers announce dates without times, and
   * printing an invented hour on a share card is worse than on a page — the
   * card is what gets screenshotted and reposted without the correction.
   *
   * But "time TBA" only makes sense about something that has not happened.
   * On a finished fight it reads as nonsense: nobody is going to announce the
   * start time of a bout whose result is printed directly above it.
   */
  const when = formatDateLong(event.startsAt, event.timezone);
  const timeUnknown = event.startTimeTbd && event.status === "scheduled";

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
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: CARD.ink,
              letterSpacing: "6px",
              textTransform: "uppercase",
            }}
          >
            Roboxing
          </div>
          <div style={{ display: "flex", width: "2px", height: "26px", background: CARD.line }} />
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              color: CARD.dim,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            {competitionName}
          </div>
        </div>

        {headline && winnerName && loserName ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "86px",
                color: CARD.ink,
                lineHeight: 1.05,
                textTransform: "uppercase",
              }}
            >
              {winnerName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "40px",
                color: CARD.dim,
                margin: "8px 0",
                textTransform: "lowercase",
              }}
            >
              def.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "86px",
                color: CARD.dim,
                lineHeight: 1.05,
                textTransform: "uppercase",
              }}
            >
              {loserName}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "24px",
                fontSize: "34px",
                color: CARD.ink,
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              {formatFinish(
                METHOD_LABELS[headline.result!.method],
                headline.result!.endRound,
                headline.result!.endTimeSeconds,
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "82px",
                color: CARD.ink,
                lineHeight: 1.08,
                textTransform: "uppercase",
              }}
            >
              {event.name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "20px",
                fontSize: "34px",
                color: CARD.dim,
              }}
            >
              {bouts.length > 0
                ? `${bouts.length} ${bouts.length === 1 ? "bout" : "bouts"} on the card`
                : "Card to be announced"}
            </div>
          </div>
        )}

        {/*
         * Explicit margins, not `gap`. Two earlier attempts failed here and
         * both were only visible in the rendered PNG: a positioned square
         * separator floated above the baseline as a stray speck, and `gap` on
         * a baseline-aligned row spaced the left side of the middot but not
         * the right, gluing it to the city. Margins on the separator itself
         * are the version that actually renders.
         */}
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontSize: "32px", color: CARD.ink }}>
            {when}
            {timeUnknown ? " · time TBA" : ""}
          </div>
          {where ? (
            <>
              <div
                style={{
                  display: "flex",
                  fontSize: "32px",
                  color: CARD.dim,
                  margin: "0 14px",
                }}
              >
                ·
              </div>
              <div style={{ display: "flex", fontSize: "32px", color: CARD.dim }}>
                {where}
              </div>
            </>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

/** Shown when the slug resolves to nothing. Never a 500. */
function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: CARD.void,
        fontFamily: CARD_FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "72px",
          color: CARD.ink,
          letterSpacing: "8px",
          textTransform: "uppercase",
        }}
      >
        Roboxing
      </div>
    </div>
  );
}
