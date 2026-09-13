import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { CARD, CARD_FONT, displayFont } from "@/lib/card-theme";
import { METHOD_LABELS, formatDateLong } from "@/lib/format";
import { getMachineMedia } from "@/lib/machine-media";
import { getBoutsForEvent, getEventBySlug } from "@/lib/queries";

/**
 * The matchup card: two machines, one fight, generated from the database.
 *
 * Brand Book v2, template B — the fixture poster.
 *
 *   +----------------------------------------------+
 *   | ULTIMATE BOTS                   SEP 30, 2026 |
 *   +----------------------+-----------------------+
 *   |   [machine photo]    |    [machine photo]    |
 *   |   AI STRATEGIST      |    ENERGY GUARDIAN    |
 *   |   Unitree G1 · CN    |    Unitree G1 · CN    |
 *   +----------------------+-----------------------+
 *   | ROBOXING            UFB SEASON 2 · TIME TBA  |
 *   +----------------------------------------------+
 *
 * TWO EQUAL CELLS DIVIDED BY A 2px RULE, AND THE DIVISION IS THE WHOLE IDEA.
 * Neither side is ever given more weight, and there is no "V" as a headline —
 * the rule between the cells IS the versus. The previous version set a "V" in
 * the gap and a 76-point "X WINS" underneath, which turned a fixture poster
 * into a results graphic and left the two machines arguing with the headline
 * for the top third.
 *
 * WHY A ROUTE AND NOT A PROMPT
 * ----------------------------
 * A model drawing this at post time produces a different card every week —
 * different margins, a different word for "decision", the logo somewhere else.
 * On a site whose whole proposition is being the reliable record, a feed that
 * looks improvised undoes the thing the site is for. So the design skill is the
 * spec and this file is the implementation: deterministic, free, and
 * reviewable from a URL before anything is posted.
 *
 *   /api/social/matchup?event=urkl-opening-shenzhen-2026&format=portrait
 *
 * `format` is portrait (1080×1350, the carousel and feed size), square
 * (1080×1080) or story (1080×1920). `bout` selects a position on the card and
 * defaults to the main event, which is the LAST bout by order index — a fight
 * card is built to finish on its biggest fight.
 *
 * CONSTRUCTION RULES, inherited from the opengraph-image routes
 * ------------------------------------------------------------
 * - The display font is read off disk, via `card-theme`. Never fetched.
 * - Photography comes from the approved library in `machine-media.ts` and is
 *   inlined as a data URI, because satori cannot resolve a relative path. Every
 *   photo carries its credit ON the card: a screenshot outlives its caption,
 *   and a manufacturer's photograph on our branded card without a credit reads
 *   as ours.
 * - Satori primitives only — flex, rectangles, text. Every element that holds
 *   more than one child declares `display: flex`, which satori requires and
 *   will otherwise throw on. Adjacent JSX expressions count as two children,
 *   so strings are built before they are placed.
 * - The confidence label is part of the image whenever the result is not
 *   `confirmed`. That is the rule the whole site is built on.
 */

export const alt = "Roboxing matchup card";
export const contentType = "image/png";

const FORMATS = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

type FormatName = keyof typeof FORMATS;

/** Inline an approved image so satori can draw it. Null when there is none. */
async function dataUri(src: string | undefined): Promise<string | null> {
  if (!src) return null;
  try {
    const file = await readFile(join(process.cwd(), "public", src));
    const ext = src.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${file.toString("base64")}`;
  } catch {
    // A missing file must not 500 the route — the card still works as type.
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventSlug = url.searchParams.get("event");
  const formatName = (url.searchParams.get("format") ?? "portrait") as FormatName;
  const size = FORMATS[formatName] ?? FORMATS.portrait;

  const fonts = await displayFont();

  if (!eventSlug) {
    return new Response("Pass ?event=<slug>", { status: 400 });
  }

  const row = await getEventBySlug(eventSlug);
  if (!row) return new Response("No such event", { status: 404 });

  const bouts = await getBoutsForEvent(row.event.id);
  if (bouts.length === 0) {
    return new Response("That event has no card entered", { status: 404 });
  }

  const wanted = url.searchParams.get("bout");
  const bout = wanted
    ? (bouts.find((b) => String(b.orderIndex) === wanted) ?? bouts[0])
    : bouts[bouts.length - 1];

  const mediaA = getMachineMedia(bout.robotA.slug)?.card;
  const mediaB = getMachineMedia(bout.robotB.slug)?.card;
  const [photoA, photoB] = await Promise.all([
    dataUri(mediaA?.src),
    dataUri(mediaB?.src),
  ]);
  const credits = [
    ...new Set([mediaA?.credit, mediaB?.credit].filter(Boolean)),
  ].join(" · ");

  const result = bout.result;
  const winnerId = result?.winnerRobotId ?? null;
  const decided = result !== null && winnerId !== null;

  /*
   * LIVE NOW replaces the date, and only while it is happening.
   *
   * A card generated an hour before the doors open is a fixture poster and
   * says so; the same card generated mid-broadcast is the only time red
   * appears anywhere in this system. The window is the event's own start
   * through a four-hour tail, which is longer than any card this sport has
   * run and short enough that a poster does not claim to be live overnight.
   */
  const startedAt = row.event.startsAt?.getTime() ?? null;
  const now = Date.now();
  const isLive =
    !row.event.dateTbd &&
    !row.event.startTimeTbd &&
    startedAt !== null &&
    now >= startedAt &&
    now < startedAt + 4 * 60 * 60 * 1000;

  /*
   * A date_tbd row prints its date_label, never the stored instant — the
   * instant is a placeholder that exists so the calendar can sort. And a
   * date-only event is read in UTC, the same rule as `dateZone` on the site,
   * because converting a placeholder produces a confident wrong answer.
   */
  const dateLine = row.event.dateTbd
    ? (row.event.dateLabel?.trim() || "DATE TBA")
    : formatDateLong(
        row.event.startsAt,
        row.event.startTimeTbd ? "UTC" : row.event.timezone,
      );

  /* A time that is genuinely unknown reads `TIME TBA`. Never a guess, never
     omitted — the omission is what makes a reader assume a time was given. */
  const footerRight = [
    row.event.name,
    row.event.startTimeTbd || row.event.dateTbd ? "TIME TBA" : row.event.city,
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  const cell = (
    which: "a" | "b",
    robot: typeof bout.robotA,
    photo: string | null,
  ) => {
    const won = decided && winnerId === robot.id;
    const lost = decided && !won;
    /* Chassis · country, from the record — the book's line, and the right
       one here: in this sport the fighting name and the team name are
       usually the same word, while the chassis is what tells a reader the
       bout is hardware-identical. Never a nickname we invented, and a field
       with no value drops out rather than printing a placeholder. */
    const under = [robot.model, robot.teamCountry].filter(Boolean).join(" · ");
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          padding: 40,
          /* The 2px rule between the cells, drawn once on the left cell so it
             cannot double up into 4px. */
          borderRight:
            which === "a" ? `2px solid ${CARD.lineStrong}` : "none",
        }}
      >
        {/* The well GROWS. It used to be a fixed 26% of the card height,
            which left a third of a portrait card as dead void between the
            chassis line and the footer — the photo is the poster, and a
            poster with a hole in the middle reads as a rendering fault. */}
        <div
          style={{
            display: "flex",
            width: "100%",
            flex: 1,
            minHeight: size.height * 0.26,
            background: CARD.surface,
            /* Cyan edges the winner. The only weight either cell is ever
               given, and only once a result exists. */
            border: `2px solid ${won ? CARD.volt : CARD.line}`,
            overflow: "hidden",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width="100%"
              height="100%"
              style={{
                objectFit: "cover",
                // The loser is dimmed, not tinted. There is no third colour
                // to spend and cyan already means something else.
                opacity: lost ? 0.45 : 1,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                color: CARD.dim,
                fontSize: 72,
              }}
            >
              {robot.name.charAt(0)}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 52,
            lineHeight: 1,
            letterSpacing: "0.03em",
            color: lost ? CARD.dim : CARD.ink,
            textTransform: "uppercase",
            marginTop: 24,
          }}
        >
          {robot.name}
        </div>
        {under ? (
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.08em",
              color: CARD.dim,
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            {under}
          </div>
        ) : null}
        {robot.pilotName ? (
          <div style={{ fontSize: 20, color: CARD.dim, marginTop: 6 }}>
            {`PILOT ${robot.pilotName.toUpperCase()}`}
          </div>
        ) : null}
      </div>
    );
  };

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
          fontFamily: CARD_FONT,
        }}
      >
        {/* League left, date right — or LIVE NOW, which is the one place in
            this system red is allowed. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `2px solid ${CARD.line}`,
            padding: "36px 40px",
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.14em",
              color: CARD.ink,
              textTransform: "uppercase",
            }}
          >
            {bout.competitionName}
          </div>
          {isLive ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: CARD.live,
                color: CARD.ink,
                fontSize: 24,
                letterSpacing: "0.14em",
                padding: "8px 16px",
              }}
            >
              ● LIVE NOW
            </div>
          ) : (
            <div
              style={{
                fontSize: 26,
                letterSpacing: "0.1em",
                color: CARD.dim,
                textTransform: "uppercase",
              }}
            >
              {dateLine}
            </div>
          )}
        </div>

        {/* The matchup: two equal cells, one rule. */}
        <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
          {cell("a", bout.robotA, photoA)}
          {cell("b", bout.robotB, photoB)}
        </div>

        {/* The outcome, when there is one — a line, not a headline. This is
            the fixture template; the result card is its own template and puts
            the outcome in the top third where a feed actually reads it. */}
        {result ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `2px solid ${CARD.line}`,
              padding: "24px 40px",
            }}
          >
            <div
              style={{
                fontSize: 30,
                letterSpacing: "0.06em",
                color: CARD.ink,
                textTransform: "uppercase",
              }}
            >
              {[
                METHOD_LABELS[result.method],
                result.endRound ? `R${result.endRound}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {/* The confidence label is part of the image. A screenshot
                outlives its caption. */}
            {result.confidence !== "confirmed" ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  letterSpacing: "0.12em",
                  color: CARD.dim,
                  border: `2px solid ${CARD.line}`,
                  padding: "6px 14px",
                  textTransform: "uppercase",
                }}
              >
                {result.confidence}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ROBOXING left, event · time right. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${CARD.line}`,
            padding: "30px 40px",
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.16em",
              color: CARD.ink,
              textTransform: "uppercase",
            }}
          >
            Roboxing
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.1em",
              color: CARD.dim,
              maxWidth: 640,
              textAlign: "right",
            }}
          >
            {footerRight}
          </div>
        </div>

        {/* The credit line. Not optional: a manufacturer's photograph on our
            branded card without a credit reads as ours. */}
        {credits ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "0 40px 26px",
              fontSize: 16,
              color: CARD.dim,
            }}
          >
            {`Photo: ${credits}`}
          </div>
        ) : null}
      </div>
    ),
    { ...size, fonts },
  );
}
