import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import {
  boutResults,
  bouts,
  competitions,
  events,
  posts,
  robots,
} from "@/db/schema";
import {
  formatDateLong,
  formatFinish,
  formatTimeWithZone,
  METHOD_LABELS,
} from "@/lib/format";

/**
 * What goes in the newsletter, and how it is written.
 *
 * Two rules shape this file.
 *
 * **1. The digest is assembled from the database, never generated.** There is
 * no model in this path and that is deliberate, not an oversight. Everything
 * here leaves the building addressed to a real person, and the site's whole
 * claim is being the record of this sport. A hallucinated score in an email
 * cannot be quietly corrected the way a web page can — it is already in
 * somebody's inbox. Stage 2 of the watcher uses a model because its output is
 * a ranking a human then reads; this is the opposite situation.
 *
 * **2. Upcoming events never justify a send.** They are context, carried along
 * when there is news. A weekly mail that says "these four events are still
 * scheduled" every Thursday is the thing that trains people to unsubscribe, so
 * `hasNews()` looks only at results and posts.
 *
 * The renderer is pure and takes its base URL as an argument, so the tests can
 * check the wording without a request, a database or an environment.
 */

/** How far back a weekly digest looks for news. */
export const DIGEST_WINDOW_DAYS = 7;

/** Upcoming events carried as context. Enough to be useful, few enough to read. */
const MAX_UPCOMING = 3;

export type DigestResult = {
  eventName: string;
  eventSlug: string;
  competitionName: string;
  robotAName: string;
  robotBName: string;
  winnerName: string | null;
  finish: string;
  startsAt: Date;
  timezone: string;
};

export type DigestEvent = {
  name: string;
  slug: string;
  competitionName: string;
  startsAt: Date;
  startTimeTbd: boolean;
  timezone: string;
  city: string | null;
  country: string | null;
  broadcastName: string | null;
};

export type DigestPost = {
  title: string;
  slug: string;
  summary: string | null;
  publishedAt: Date;
};

export type DigestData = {
  results: DigestResult[];
  events: DigestEvent[];
  posts: DigestPost[];
  since: Date;
  generatedAt: Date;
};

/**
 * Is there anything worth mailing about?
 *
 * Results and posts only. See rule 2 above — an upcoming event is not news,
 * and a digest that can send on nothing but the schedule will send every week
 * forever whether or not the sport did anything.
 */
export function hasNews(data: DigestData): boolean {
  return data.results.length > 0 || data.posts.length > 0;
}

/** Gather the last `windowDays` of news, plus the next few events as context. */
export async function gatherDigest(
  now: Date = new Date(),
  windowDays: number = DIGEST_WINDOW_DAYS,
): Promise<DigestData> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  /*
   * Results are windowed on `recorded_at`, not on the event date. The question
   * a reader is asking is "what is new to me", and on a site that covers other
   * people's leagues from foreign-language reporting those two dates are
   * routinely days or weeks apart. A fight that happened in May but was
   * verified on Tuesday is this week's news.
   */
  const resultRows = await db
    .select({
      eventName: events.name,
      eventSlug: events.slug,
      competitionName: competitions.name,
      startsAt: events.startsAt,
      timezone: events.timezone,
      robotAName: robots.name,
      winnerRobotId: boutResults.winnerRobotId,
      robotAId: bouts.robotAId,
      robotBId: bouts.robotBId,
      method: boutResults.method,
      endRound: boutResults.endRound,
      endTimeSeconds: boutResults.endTimeSeconds,
    })
    .from(boutResults)
    .innerJoin(bouts, eq(boutResults.boutId, bouts.id))
    .innerJoin(events, eq(bouts.eventId, events.id))
    .innerJoin(competitions, eq(bouts.competitionId, competitions.id))
    .innerJoin(robots, eq(bouts.robotAId, robots.id))
    .where(gte(boutResults.recordedAt, since))
    .orderBy(desc(boutResults.recordedAt))
    .limit(20);

  // Robot B and the winner's name need a second lookup rather than two more
  // aliased joins; at digest volumes a single IN query is clearer than the
  // join gymnastics and cannot hit the unqualified-column bug this codebase
  // has already been bitten by three times.
  const ids = new Set<number>();
  for (const row of resultRows) {
    ids.add(row.robotAId);
    ids.add(row.robotBId);
    if (row.winnerRobotId) ids.add(row.winnerRobotId);
  }
  const names = new Map<number, string>();
  if (ids.size > 0) {
    const rows = await db
      .select({ id: robots.id, name: robots.name })
      .from(robots)
      .where(inArray(robots.id, [...ids]));
    for (const row of rows) names.set(row.id, row.name);
  }

  const results: DigestResult[] = resultRows.map((row) => ({
    eventName: row.eventName,
    eventSlug: row.eventSlug,
    competitionName: row.competitionName,
    robotAName: names.get(row.robotAId) ?? row.robotAName,
    robotBName: names.get(row.robotBId) ?? "Unknown",
    winnerName: row.winnerRobotId ? (names.get(row.winnerRobotId) ?? null) : null,
    // METHOD_LABELS, not the raw enum: the column holds "no_contest" and the
    // reader needs "No contest" — the same string the site's badge shows.
    finish: formatFinish(
      METHOD_LABELS[row.method],
      row.endRound,
      row.endTimeSeconds,
    ),
    startsAt: row.startsAt,
    timezone: row.timezone,
  }));

  const eventRows = await db
    .select({
      name: events.name,
      slug: events.slug,
      competitionName: competitions.name,
      startsAt: events.startsAt,
      startTimeTbd: events.startTimeTbd,
      timezone: events.timezone,
      city: events.city,
      country: events.country,
      broadcastName: events.broadcastName,
    })
    .from(events)
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(and(eq(events.status, "scheduled"), gte(events.startsAt, now)))
    .orderBy(events.startsAt)
    .limit(MAX_UPCOMING);

  const postRows = await db
    .select({
      title: posts.title,
      slug: posts.slug,
      summary: posts.summary,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        isNotNull(posts.publishedAt),
        gte(posts.publishedAt, since),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(10);

  return {
    results,
    events: eventRows,
    // publishedAt is non-null by the WHERE above; the cast keeps the type
    // honest without a runtime filter that could never fire.
    posts: postRows.map((p) => ({ ...p, publishedAt: p.publishedAt as Date })),
    since,
    generatedAt: now,
  };
}

/**
 * Escape text destined for an HTML email.
 *
 * Robot names, event names and post titles are entered through the admin, so
 * they are trusted-ish — but "trusted-ish" is not a category, and an ampersand
 * in a team name is enough to break the markup on its own. Everything
 * interpolated below goes through here.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Matador def. White Eagle" — or a draw, which has no winner. */
export function describeResult(result: DigestResult): string {
  if (!result.winnerName) {
    return `${result.robotAName} vs ${result.robotBName} — ${result.finish}`;
  }
  const loser =
    result.winnerName === result.robotAName
      ? result.robotBName
      : result.robotAName;
  return `${result.winnerName} def. ${loser} — ${result.finish}`;
}

/** When and where an event is, respecting a date announced without a time. */
export function describeEvent(event: DigestEvent): string {
  const day = formatDateLong(event.startsAt, event.timezone);
  // startTimeTbd exists because organizers announce dates without times, and
  // printing an invented "9:00 PM" was a real bug on five call sites once.
  const when = event.startTimeTbd
    ? `${day}, time TBA`
    : `${day}, ${formatTimeWithZone(event.startsAt, event.timezone)}`;
  const place = [event.city, event.country].filter(Boolean).join(", ");
  return place ? `${when} · ${place}` : when;
}

export type RenderedDigest = { subject: string; html: string; text: string };

/**
 * The subject line, built from what is actually in the mail.
 *
 * Leads with the single most concrete thing available — a result beats a
 * headline, because "Matador def. White Eagle" tells a reader whether to open
 * and "This week in Roboxing" does not.
 */
export function digestSubject(data: DigestData): string {
  const extra = data.results.length + data.posts.length - 1;
  const more = extra > 0 ? ` (+${extra} more)` : "";

  if (data.results.length > 0) {
    const first = data.results[0];
    return first.winnerName
      ? `${first.winnerName} def. ${
          first.winnerName === first.robotAName
            ? first.robotBName
            : first.robotAName
        }${more}`
      : `${first.robotAName} vs ${first.robotBName}${more}`;
  }
  if (data.posts.length > 0) return `${data.posts[0].title}${more}`;
  return "Roboxing";
}

/** Render the digest. Pure — no database, no environment, no request. */
export function renderDigest(
  data: DigestData,
  opts: { baseUrl: string; unsubscribeUrl: string },
): RenderedDigest {
  const base = opts.baseUrl.replace(/\/$/, "");
  const subject = digestSubject(data);

  const textParts: string[] = ["ROBOXING", ""];
  const htmlParts: string[] = [];

  const h = (s: string) => escapeHtml(s);

  if (data.results.length > 0) {
    textParts.push("RESULTS", "");
    htmlParts.push(section("Results"));
    for (const result of data.results) {
      const line = describeResult(result);
      const url = `${base}/events/${result.eventSlug}`;
      textParts.push(`- ${line}`, `  ${result.eventName} · ${url}`, "");
      htmlParts.push(
        `<p style="margin:0 0 14px"><strong style="font-size:15px">${h(line)}</strong><br>` +
          `<a href="${h(url)}" style="color:#111;font-size:13px">${h(result.eventName)}</a> ` +
          `<span style="color:#666;font-size:13px">· ${h(result.competitionName)}</span></p>`,
      );
    }
  }

  if (data.posts.length > 0) {
    textParts.push("READING", "");
    htmlParts.push(section("Reading"));
    for (const post of data.posts) {
      const url = `${base}/news/${post.slug}`;
      textParts.push(`- ${post.title}`, `  ${url}`, "");
      htmlParts.push(
        `<p style="margin:0 0 14px"><a href="${h(url)}" style="color:#111;font-size:15px;font-weight:600">${h(post.title)}</a>` +
          (post.summary
            ? `<br><span style="color:#444;font-size:13px">${h(post.summary)}</span>`
            : "") +
          `</p>`,
      );
    }
  }

  if (data.events.length > 0) {
    textParts.push("NEXT UP", "");
    htmlParts.push(section("Next up"));
    for (const event of data.events) {
      const url = `${base}/events/${event.slug}`;
      const when = describeEvent(event);
      textParts.push(`- ${event.name}`, `  ${when}`, `  ${url}`, "");
      htmlParts.push(
        `<p style="margin:0 0 14px"><a href="${h(url)}" style="color:#111;font-size:15px;font-weight:600">${h(event.name)}</a><br>` +
          `<span style="color:#444;font-size:13px">${h(when)}</span>` +
          (event.broadcastName
            ? `<br><span style="color:#666;font-size:13px">Watch on ${h(event.broadcastName)}</span>`
            : "") +
          `</p>`,
      );
    }
  }

  textParts.push(
    "---",
    "You are getting this because you asked to hear when something happens.",
    `Unsubscribe: ${opts.unsubscribeUrl}`,
  );

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f7f6f3">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<div style="font-weight:700;letter-spacing:0.12em;font-size:13px;text-transform:uppercase;margin-bottom:24px">Roboxing</div>
${htmlParts.join("\n")}
<hr style="border:0;border-top:1px solid #ddd;margin:28px 0 14px">
<p style="color:#666;font-size:12px;line-height:1.5;margin:0">
You are getting this because you asked to hear when something happens.<br>
<a href="${h(opts.unsubscribeUrl)}" style="color:#666">Unsubscribe</a>
</p>
</div></body></html>`;

  return { subject, html, text: textParts.join("\n") };
}

function section(title: string): string {
  return `<h2 style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin:24px 0 12px;font-weight:600">${escapeHtml(title)}</h2>`;
}
