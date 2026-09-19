import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, isNull, notLike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { competitions, events, recordDrafts, signals } from "@/db/schema";
import { estimateCostUsd, type Usage, ZERO_USAGE } from "@/lib/classify";
import { isFetchableArticle, readArticle, slugify } from "@/lib/autopublish";

/**
 * Stage 4: a discovered league arrives as a reviewable draft, not a paragraph.
 *
 * THE GAP THIS CLOSES.
 * --------------------
 * Stages 1-3 find news and write news. None of them has ever written the
 * RECORD — the leagues, events, machines and fixtures that are the actual
 * product. Every competition on this site was typed in by hand, which meant
 * discovery and coverage were two different jobs and only one of them was
 * automated. Shadow Combat League held two events in Kuala Lumpur before
 * anybody here knew it existed.
 *
 * So when a signal scores high and the classifier calls it a league or an
 * event, this reads the article behind it and proposes a row: name, organiser,
 * country, city, date, venue, and a source. The proposal lands in
 * /admin/drafts. Nothing it produces is public until a human presses Apply.
 *
 * THE RULES, which are the same ones stage 3 earned the hard way.
 * --------------------------------------------------------------
 * 1. **Never from a headline.** The article is fetched and must clear a length
 *    bar. Google News interstitials are unreadable and are skipped, which is
 *    most of the feed.
 * 2. **A missing fact stays missing.** Every field is nullable and the model is
 *    told to return null rather than a guess. A league with an unknown founding
 *    year is a league with a null founding year, not a plausible one. This is
 *    the single most important instruction in the file: a fabricated venue is
 *    indistinguishable from a real one three weeks later.
 * 3. **The model may decline**, and most mornings should. A hardware story that
 *    mentions a league in passing is not a league announcement.
 * 4. **Nothing is published.** A draft is a claim in a table no public query
 *    reads. The review step is the product, not a formality.
 *
 * ON BEING ON BY DEFAULT, which stage 3 is not.
 * ---------------------------------------------
 * `AUTOPUBLISH` defaults to off because its output is a page readers see. This
 * defaults to ON, with `AUTODRAFT=off` as the kill switch, because its output
 * is a row in an admin queue. The asymmetry is deliberate: the cost of a wrong
 * draft is ten seconds of somebody's attention, and the cost of a missed league
 * is the thing this whole file exists to prevent.
 */

/** Off only when explicitly switched off. See the note above. */
function isEnabled(): boolean {
  return (process.env.AUTODRAFT ?? "on").trim().toLowerCase() !== "off";
}

const MODEL = process.env.AUTODRAFT_MODEL ?? "claude-haiku-4-5";

/**
 * How many signals to read per run. Low, because each one is an article fetch
 * plus a model call, and a morning that turns up six new leagues is a morning
 * something else has gone wrong.
 */
const MAX_DRAFTS_PER_RUN = Math.max(
  0,
  Number(process.env.AUTODRAFT_MAX ?? 3) || 0,
);

/**
 * The bar. Deliberately lower than stage 3's 85.
 *
 * A brief is published to readers and should be sure. A draft is shown to one
 * person who can bin it in a second, and the asymmetry runs the other way: the
 * expensive error here is the league that never gets drafted at all.
 */
const MIN_SCORE = Math.max(
  0,
  Number(process.env.AUTODRAFT_MIN_SCORE ?? 75) || 0,
);

const MAX_AGE_DAYS = 14;
const MIN_ARTICLE_CHARS = 600;

const SYSTEM_PROMPT = `You extract structured records for Roboxing, the English-language system of record for humanoid robot fighting.

You are given one news article. Decide whether it announces or describes a COMPETITION ORGANISATION (a league, promotion or championship series) or a SINGLE EVENT (a dated fight card, tournament or exhibition) involving bipedal humanoid robots that fight.

Return draft: false for anything else. Specifically return false for:
- humanoid robot hardware, funding, factory or company news with no competition in it
- wheeled or destructive robot combat (BattleBots, NHRL) — this site covers bipedal humanoids only
- a robot that appears in a human sporting event as a mascot, demo or half-time act
- an article that merely mentions an existing league in passing
- a competition in robotics that is not fighting: racing, football, dancing, marathons

THE RULE THAT MATTERS MOST: every field is optional and NULL IS A VALID ANSWER. Return null for anything the article does not state. Do not infer a country from a company's name, do not guess a founding year, do not convert "later this year" into a date, do not invent a venue. A record with three true fields and nine nulls is correct and useful. A record with twelve plausible fields is worthless, because nobody can tell which three were real.

For a competition, extract: name, organizer, country (ISO 3166-1 alpha-2), city, foundedYear, websiteUrl.
For an event, extract: name, competitionName (the league it belongs to, if the article names one), venue, city, country (ISO alpha-2), startDate (YYYY-MM-DD, ONLY if the article gives a specific day), dateLabel (the article's own wording when the date is vague — "December 2026", "later this year"), and format (one sentence on bouts, rounds or rules, only if stated).

confidence: "confirmed" only when the article is first-party or a major news agency AND states the fact plainly; "reported" for ordinary single-source coverage; "unconfirmed" when the article is itself hedging, aggregating or repeating a rumour.

rationale: one sentence, at most 30 words, saying what this is and why it belongs in the record.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    draft: { type: "boolean" },
    reason: { type: "string" },
    kind: { type: "string", enum: ["competition", "event"] },
    rationale: { type: "string" },
    confidence: {
      type: "string",
      enum: ["confirmed", "reported", "unconfirmed"],
    },
    name: { type: ["string", "null"] },
    organizer: { type: ["string", "null"] },
    competitionName: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    venue: { type: ["string", "null"] },
    foundedYear: { type: ["integer", "null"] },
    websiteUrl: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    dateLabel: { type: ["string", "null"] },
    format: { type: ["string", "null"] },
  },
  required: ["draft", "reason", "kind", "rationale", "confidence", "name"],
  additionalProperties: false,
} as const;

const DraftSchema = z.object({
  draft: z.boolean(),
  reason: z.string(),
  kind: z.enum(["competition", "event"]),
  rationale: z.string(),
  confidence: z.enum(["confirmed", "reported", "unconfirmed"]),
  name: z.string().nullable(),
  organizer: z.string().nullable().optional(),
  competitionName: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dateLabel: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
});

export type DraftPayload = z.infer<typeof DraftSchema>;

export type DraftResult = {
  drafted: number;
  skipped: string[];
  errors: string[];
  usage: Usage;
  /** Null when the model is not in the local price table — see classify.ts. */
  costUsd: number | null;
};

function offResult(reason: string): DraftResult {
  return {
    drafted: 0,
    skipped: [reason],
    errors: [reason],
    usage: ZERO_USAGE,
    costUsd: 0,
  };
}

/**
 * Reject a draft the model returned but that cannot become a row.
 *
 * Exported and pure so the test can assert the gate directly. A draft with no
 * name is the one shape that must never reach the queue: the reviewer would be
 * looking at a proposal for a league that is not called anything.
 */
export function rejectDraft(draft: DraftPayload): string | null {
  if (!draft.draft) return draft.reason.trim() || "model declined";
  const name = draft.name?.trim() ?? "";
  if (name.length < 3) return "no name";
  if (name.length > 160) return "name too long";
  if (draft.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)) {
    return `unusable date ${draft.startDate}`;
  }
  // A two-letter code or nothing. "Malaysia" in a column the site renders as a
  // flag is a wrong flag, which is worse than an empty one.
  if (draft.country && !/^[A-Za-z]{2}$/.test(draft.country)) {
    return `country is not an ISO code: ${draft.country}`;
  }
  return null;
}

/**
 * Does the record already know about this?
 *
 * Slug-level, and deliberately crude: it catches "Shadow Combat League" against
 * an existing `shadow-combat-league` and will miss "SCL". A missed duplicate
 * costs a reviewer one dismissal; a false match would silently swallow a real
 * discovery, so the check errs towards showing it.
 */
async function alreadyInRecord(
  kind: "competition" | "event",
  name: string,
): Promise<boolean> {
  const slug = slugify(name);
  if (!slug) return false;
  const rows =
    kind === "competition"
      ? await db
          .select({ slug: competitions.slug })
          .from(competitions)
          .where(eq(competitions.slug, slug))
          .limit(1)
      : await db
          .select({ slug: events.slug })
          .from(events)
          .where(eq(events.slug, slug))
          .limit(1);
  return rows.length > 0;
}

type Candidate = {
  id: number;
  title: string;
  url: string;
  score: number | null;
  category: string | null;
};

async function selectCandidates(limit: number): Promise<Candidate[]> {
  const since = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({
      id: signals.id,
      title: signals.title,
      url: signals.url,
      score: signals.score,
      category: signals.category,
    })
    .from(signals)
    .leftJoin(recordDrafts, eq(recordDrafts.signalId, signals.id))
    .where(
      and(
        gte(signals.score, MIN_SCORE),
        sql`${signals.category} in ('league','event')`,
        gte(sql`coalesce(${signals.publishedAt}, ${signals.createdAt})`, since),
        notLike(signals.url, "%news.google.com%"),
        // Never drafted before. The unique on signal_id is the hard guard;
        // this is what keeps the run from paying to re-read the same article.
        isNull(recordDrafts.id),
      ),
    )
    .orderBy(desc(signals.score), desc(signals.createdAt))
    .limit(limit);
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function extractDraft(
  client: Anthropic,
  candidate: Candidate,
  article: string,
): Promise<{ draft: DraftPayload; usage: Usage }> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `FEED HEADLINE: ${candidate.title}`,
          `CLASSIFIER CATEGORY: ${candidate.category ?? "unknown"}`,
          `SOURCE URL: ${candidate.url}`,
          ``,
          `EXTRACTED ARTICLE TEXT:`,
          article,
        ].join("\n"),
      },
    ],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const usage: Usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };

  // Tokens first, then the throw — the refusal was billed either way.
  if (message.stop_reason !== "end_turn") {
    throw Object.assign(new Error(`stop_reason=${message.stop_reason}`), {
      usage,
    });
  }

  return { draft: DraftSchema.parse(JSON.parse(textOf(message))), usage };
}

/**
 * Read the top league/event signals and propose rows for them.
 *
 * Never throws: a broken source, a dead fetch or a model refusal is reported
 * in `errors` and the run continues. The cron turns red on a real failure and
 * stays green on "nothing to draft", which is the normal morning.
 */
export async function draftRecords(): Promise<DraftResult> {
  if (!isEnabled()) return offResult("AUTODRAFT is off — skipped");
  if (MAX_DRAFTS_PER_RUN === 0)
    return offResult("AUTODRAFT_MAX is 0 — skipped");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return offResult("ANTHROPIC_API_KEY is not set — skipped");

  const result: DraftResult = {
    drafted: 0,
    skipped: [],
    errors: [],
    usage: { ...ZERO_USAGE },
    costUsd: 0,
  };

  const candidates = await selectCandidates(MAX_DRAFTS_PER_RUN * 3);
  if (candidates.length === 0) return result;

  const client = new Anthropic({ apiKey });

  for (const candidate of candidates) {
    if (result.drafted >= MAX_DRAFTS_PER_RUN) break;

    if (!isFetchableArticle(candidate.url)) {
      result.skipped.push(`${candidate.id}: link is not a readable article`);
      continue;
    }

    // readArticle() already applies the publisher's floor and cap and returns
    // null for a page it could not read — a 403, a paywall, a JS shell.
    const article = await readArticle(candidate.url);
    if (!article || article.length < MIN_ARTICLE_CHARS) {
      result.skipped.push(
        `${candidate.id}: no readable article behind the link`,
      );
      continue;
    }

    let draft: DraftPayload;
    try {
      const extracted = await extractDraft(client, candidate, article);
      draft = extracted.draft;
      result.usage.inputTokens += extracted.usage.inputTokens;
      result.usage.outputTokens += extracted.usage.outputTokens;
      result.usage.cacheReadTokens += extracted.usage.cacheReadTokens;
      result.usage.cacheWriteTokens += extracted.usage.cacheWriteTokens;
    } catch (error) {
      const usage = (error as { usage?: Usage }).usage;
      if (usage) {
        result.usage.inputTokens += usage.inputTokens;
        result.usage.outputTokens += usage.outputTokens;
      }
      result.errors.push(
        `${candidate.id}: ${error instanceof Error ? error.message : "extract failed"}`,
      );
      continue;
    }

    const rejection = rejectDraft(draft);
    if (rejection) {
      result.skipped.push(`${candidate.id}: ${rejection}`);
      continue;
    }

    if (await alreadyInRecord(draft.kind, draft.name!)) {
      result.skipped.push(`${candidate.id}: ${draft.name} is already on file`);
      continue;
    }

    await db
      .insert(recordDrafts)
      .values({
        signalId: candidate.id,
        kind: draft.kind,
        payload: draft,
        rationale: draft.rationale,
        sourceUrl: candidate.url,
        model: MODEL,
      })
      // Belt and braces with the unique index: two runs overlapping must not
      // make the second one throw and take the whole cron red with it.
      .onConflictDoNothing({ target: recordDrafts.signalId });

    result.drafted += 1;
  }

  result.costUsd = estimateCostUsd(MODEL, result.usage);
  return result;
}
