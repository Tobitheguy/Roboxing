import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { METHOD_LABELS, formatDateLong } from "@/lib/format";
import { getMachineMedia } from "@/lib/machine-media";
import { getBoutsForEvent, getEventBySlug } from "@/lib/queries";

/**
 * The matchup card: two machines, one fight, generated from the database.
 *
 * The first social template, and the shape every other one should copy.
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
 * - The display font is read off disk. A Google Fonts fetch inside an image
 *   handler makes every render depend on a third party, and it fails on exactly
 *   the post that travels.
 * - Photography comes from the approved library in `machine-media.ts` and is
 *   inlined as a data URI, because satori cannot resolve a relative path. Every
 *   photo carries its credit ON the card: a screenshot outlives its caption,
 *   and a manufacturer's photograph on our branded card without a credit reads
 *   as ours.
 * - Satori primitives only — flex, rectangles, text. Every element that holds
 *   more than one child declares `display: flex`, which satori requires and
 *   will otherwise throw on.
 * - The confidence label is part of the image whenever the result is not
 *   `confirmed`. That is the rule the whole site is built on.
 */

export const alt = "Roboxing matchup card";
export const contentType = "image/png";

const INK = "#14161A";
const CANVAS = "#F6F6F3";
const DIM = "#9BA0A8";
const LINE = "#2A2E35";

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

  const oswald = await readFile(
    join(process.cwd(), "src/app/_fonts/oswald-700.ttf"),
  );
  const fonts = [
    {
      name: "Oswald",
      data: oswald,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];

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

  const [photoA, photoB] = await Promise.all([
    dataUri(getMachineMedia(bout.robotA.slug)?.card?.src),
    dataUri(getMachineMedia(bout.robotB.slug)?.card?.src),
  ]);
  const creditA = getMachineMedia(bout.robotA.slug)?.card?.credit ?? null;
  const creditB = getMachineMedia(bout.robotB.slug)?.card?.credit ?? null;
  const credits = [...new Set([creditA, creditB].filter(Boolean))].join(" · ");

  const result = bout.result;
  const winnerId = result?.winnerRobotId ?? null;
  const decided = result !== null && winnerId !== null;

  // The date is the venue's, and for a date-only event it is read in UTC —
  // same rule as `dateZone` on the site, because converting a placeholder
  // produces a confident wrong answer.
  const when = formatDateLong(
    row.event.startsAt,
    row.event.startTimeTbd ? "UTC" : row.event.timezone,
  );

  const whereWhen = [when, row.event.city].filter(Boolean).join(" · ");

  const headline = decided
    ? `${winnerId === bout.robotA.id ? bout.robotA.name : bout.robotB.name} WINS`
    : "UPCOMING";

  const corner = (
    which: "a" | "b",
    robot: typeof bout.robotA,
    photo: string | null,
  ) => {
    const won = decided && winnerId === robot.id;
    const lost = decided && !won;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: which === "a" ? "flex-start" : "flex-end",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: size.height * 0.24,
            background: "#1D2127",
            border: `2px solid ${won ? CANVAS : LINE}`,
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
                // The loser is dimmed rather than tinted: this palette has no
                // second colour to spend, and weight is how it says who won.
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
                color: DIM,
                fontSize: 64,
              }}
            >
              {robot.name.charAt(0)}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: which === "a" ? "flex-start" : "flex-end",
            marginTop: 18,
          }}
        >
          <div
            style={{
              fontSize: 46,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: lost ? DIM : CANVAS,
              textTransform: "uppercase",
            }}
          >
            {robot.name}
          </div>
          <div style={{ fontSize: 22, color: DIM, marginTop: 8 }}>
            {robot.teamName}
          </div>
          {robot.pilotName ? (
            <div style={{ fontSize: 20, color: DIM, marginTop: 4 }}>
              {`Piloted by ${robot.pilotName}`}
            </div>
          ) : null}
        </div>
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
          background: INK,
          padding: "64px 64px 52px",
          fontFamily: "Oswald",
        }}
      >
        {/* League and event */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.14em",
              color: DIM,
              textTransform: "uppercase",
            }}
          >
            {bout.competitionName}
          </div>
          <div
            style={{
              fontSize: 34,
              color: CANVAS,
              marginTop: 10,
              textTransform: "uppercase",
            }}
          >
            {row.event.name}
          </div>
          <div style={{ fontSize: 22, color: DIM, marginTop: 6 }}>
            {whereWhen}
          </div>
        </div>

        {/* The matchup */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 28,
            marginTop: 36,
          }}
        >
          {corner("a", bout.robotA, photoA)}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              color: DIM,
              paddingTop: size.height * 0.1,
            }}
          >
            V
          </div>
          {corner("b", bout.robotB, photoB)}
        </div>

        {/* The outcome */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 0.92,
              letterSpacing: "-0.02em",
              color: CANVAS,
              textTransform: "uppercase",
            }}
          >
            {headline}
          </div>
          {result ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
              <div style={{ fontSize: 28, color: CANVAS }}>
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
                    fontSize: 18,
                    letterSpacing: "0.12em",
                    color: DIM,
                    border: `1px solid ${LINE}`,
                    padding: "6px 12px",
                    textTransform: "uppercase",
                  }}
                >
                  {result.confidence}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Wordmark and credit */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 22,
            marginTop: 30,
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.16em",
              color: CANVAS,
              textTransform: "uppercase",
            }}
          >
            Roboxing
          </div>
          {credits ? (
            <div style={{ fontSize: 16, color: DIM, maxWidth: 520, textAlign: "right" }}>
              {credits}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
