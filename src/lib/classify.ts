import Anthropic from "@anthropic-ai/sdk";
import { asc, isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { signals } from "@/db/schema";

/**
 * Stage 2 of the watcher: read the morning's haul and rank it.
 *
 * Stage 1 (lib/signals.ts) is keyless RSS and costs nothing. This stage is the
 * only part of Roboxing that spends money, so the shape below is built around
 * that fact rather than around elegance:
 *
 * - **A hard item cap per run.** A feed that suddenly returns 5,000 rows must
 *   not turn into a 5,000-row bill. MAX_ITEMS_PER_RUN stops the run, reports
 *   what it skipped, and leaves the rest queued for tomorrow. A cost control
 *   that lives only in the prompt is not a cost control.
 * - **Chunked, and a failed chunk is survivable.** One request per item would
 *   re-send the system prompt 200 times; one request for all 200 loses
 *   everything to a single malformed row. Twenty-five is the compromise, and a
 *   chunk that throws leaves its rows unclassified rather than aborting the run
 *   — the same principle the sweep already uses for a dead feed.
 * - **No `server-only` marker**, deliberately. The pure functions below are
 *   imported directly by the tests, and `server-only` throws outside an RSC
 *   context, which silently fails the whole test file. Only classifySignals()
 *   touches the database or the network.
 *
 * The single most valuable field it produces is `summary`. It is always
 * English, including for Chinese sources — the Chinese sweep is this site's
 * edge and it is unreadable to the person actually doing triage.
 */

/**
 * Haiku 4.5 by default: this is single-turn classification, the task the
 * cheapest tier is built for, and at ~200 items a day it is the difference
 * between roughly $1.50 and roughly $5 a month. Override with SIGNALS_MODEL if
 * the scoring ever turns out to need a stronger model — nothing else changes.
 *
 * Note if you do override: `output_config.effort` is NOT sent below, and must
 * not be — Haiku 4.5 rejects it. Omitting both `effort` and `thinking` is valid
 * on every current model, so this call shape survives a model swap.
 */
const MODEL = process.env.SIGNALS_MODEL ?? "claude-haiku-4-5";

/** The spend ceiling, in rows. Roughly $0.05 per 200 items on Haiku 4.5. */
const MAX_ITEMS_PER_RUN = Math.max(
  0,
  Number(process.env.SIGNALS_CLASSIFY_LIMIT ?? 300) || 0,
);

const CHUNK_SIZE = 25;

/**
 * Generous on purpose. You are billed for tokens generated, not for the
 * ceiling, so the only thing a tight limit buys is a truncated chunk. It also
 * leaves room for thinking if SIGNALS_MODEL is pointed at a model that thinks
 * by default — max_tokens caps thinking and response text together.
 */
const MAX_TOKENS = 8000;

export const CATEGORIES = [
  "result",
  "event",
  "league",
  "hardware",
  "business",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const SYSTEM_PROMPT = `You triage a news feed for Roboxing, the English-language system of record for humanoid robot fighting — schedule, results, teams, robots and editorial for leagues like URKL (EngineAI), CyberHero (Hero Esports), the World Humanoid Robot Games, REK, and Unitree's Iron Fist King.

For each item you are given, return a relevance score, a category, and a one-sentence summary.

SCORING (0-100). Score what the item IS, not how excited the headline sounds:
- 90-100: A specific fight result, or an organizer announcing a dated competition. These are what the site exists to record.
- 70-89: Substantive news about one of these leagues or a competitor in them — format, schedule, rules, entrants, venue, standings.
- 40-69: Humanoid robot hardware, funding or company news with a plausible connection to combat (a platform that fights, a maker that enters leagues).
- 10-39: General humanoid robotics with no combat link.
- 0-9: Unrelated. Stock-market coverage, industrial arms, toys, vacuum robots, generic AI news, listicles, press-release spam.

Chinese-language items reporting actual fight outcomes are the highest-value thing in this feed and are routinely the ONLY source for a result. Do not discount an item for being in Chinese.

CATEGORY:
- result: a bout or tournament outcome that already happened
- event: a scheduled or announced competition
- league: organizational news about a competition or its teams
- hardware: robots, specs, platforms, manufacturing
- business: funding, partnerships, market and industry coverage
- other: anything else

SUMMARY: one plain sentence, at most 25 words, ALWAYS in English even when the source is Chinese. State what happened, with names and numbers where the headline gives them. Do not editorialise, do not speculate beyond the headline, and do not begin with "This article".

Only describe what the given title actually supports. If a title is too vague to tell, say so in the summary and score it low rather than inventing detail.`;

/**
 * JSON Schema for structured outputs.
 *
 * Note what is absent: `minimum`/`maximum` on score. Structured outputs do not
 * support numeric constraints, so the range is enforced in coerceClassification()
 * and again by a CHECK constraint on the column. Adding them here would look
 * like a guarantee and silently be none.
 */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          score: { type: "integer" },
          category: { type: "string", enum: [...CATEGORIES] },
          summary: { type: "string" },
        },
        required: ["id", "score", "category", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

const ResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      score: z.number(),
      category: z.string(),
      summary: z.string(),
    }),
  ),
});

export type SignalToClassify = {
  id: number;
  title: string;
  source: string;
  language: string | null;
};

export type Classification = {
  id: number;
  score: number;
  category: Category;
  summary: string;
};

/** Split into fixed-size chunks, preserving order. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The user turn for one chunk: the items as compact JSON, ids included so the
 * model can address each one back.
 */
export function buildBatchPrompt(items: SignalToClassify[]): string {
  const lines = items.map((item) =>
    JSON.stringify({
      id: item.id,
      language: item.language ?? "unknown",
      source: item.source,
      title: item.title,
    }),
  );
  return `Classify each of these ${items.length} items. Return exactly one result per id, and use only the ids given.\n\n${lines.join("\n")}`;
}

/**
 * Validate, clamp and filter a model response against the chunk it answers.
 *
 * Three things this refuses to trust, each of which has a real failure mode:
 * an id that was not in the chunk (a hallucinated or echoed id would write the
 * wrong row, or a row from someone else's chunk), a score outside 0–100 (the
 * column's CHECK would reject the whole batch), and a category outside the
 * enum (structured outputs make this unlikely, not impossible — a model swap
 * or schema edit reopens it).
 */
export function coerceClassification(
  raw: unknown,
  askedFor: SignalToClassify[],
): Classification[] {
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const known = new Set(askedFor.map((item) => item.id));
  const seen = new Set<number>();
  const out: Classification[] = [];

  for (const item of parsed.data.items) {
    if (!known.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);

    const score = Number.isFinite(item.score)
      ? Math.min(100, Math.max(0, Math.round(item.score)))
      : 0;
    const category = (CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as Category)
      : "other";

    out.push({
      id: item.id,
      score,
      category,
      summary: item.summary.trim().slice(0, 400),
    });
  }

  return out;
}

/** Extract the assistant's text, whatever else the response carries. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** Classify one chunk. Throws on transport or refusal — the caller absorbs it. */
async function classifyChunk(
  client: Anthropic,
  items: SignalToClassify[],
): Promise<Classification[]> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildBatchPrompt(items) }],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  // Check before reading content: on a refusal `content` is empty, and on
  // max_tokens it is truncated JSON. Both parse to nothing useful, and both
  // should leave the rows queued rather than write garbage.
  if (message.stop_reason !== "end_turn") {
    throw new Error(`stop_reason=${message.stop_reason}`);
  }

  return coerceClassification(JSON.parse(textOf(message)), items);
}

export type ClassifyResult = {
  /** Rows that were waiting when the run started. */
  pending: number;
  /** Rows actually sent to the model this run. */
  attempted: number;
  /** Rows written back. */
  classified: number;
  /** Rows left for the next run because the cap was hit. */
  deferred: number;
  /** One entry per failed chunk. A run can partly succeed. */
  errors: string[];
};

/**
 * Optional progress sink. A full run is a dozen model calls and several
 * hundred row updates, which takes minutes and otherwise prints nothing at all
 * until it finishes — and a silent job is indistinguishable from a hung one.
 * The cron passes nothing; the manual script passes console.log.
 */
export type ProgressFn = (message: string) => void;

/**
 * Classify everything waiting, up to the cap.
 *
 * Oldest first: on a backlog, yesterday's unclassified rows are worth more than
 * this morning's, because the inbox is triaged in order and a stale unscored
 * row is the one that gets missed.
 */
export async function classifySignals(
  onProgress?: ProgressFn,
): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Not an error. Stage 1 is the product; stage 2 is an enhancement, and the
    // sweep must keep working on a deployment that has no key.
    return {
      pending: 0,
      attempted: 0,
      classified: 0,
      deferred: 0,
      errors: ["ANTHROPIC_API_KEY not set — skipped"],
    };
  }

  const waiting = await db
    .select({
      id: signals.id,
      title: signals.title,
      source: signals.source,
      language: signals.language,
    })
    .from(signals)
    .where(isNull(signals.classifiedAt))
    .orderBy(asc(signals.createdAt))
    .limit(MAX_ITEMS_PER_RUN + 1);

  // One row over the cap tells us a backlog exists without counting it all.
  const deferred = Math.max(0, waiting.length - MAX_ITEMS_PER_RUN);
  const batch = waiting.slice(0, MAX_ITEMS_PER_RUN);

  /*
   * More retries than the SDK's default of 2. The first live run lost 2 of 10
   * chunks — 50 rows — to bare `Connection error.`, i.e. requests that never
   * got a response at all. Nothing is lost when that happens (the rows stay
   * queued and the next sweep retries them), but a fifth of the morning
   * arriving a day late defeats the point of a morning brief, and a retried
   * connection failure costs nothing because no tokens were generated.
   */
  const client = new Anthropic({ apiKey, maxRetries: 5 });
  const errors: string[] = [];
  let classified = 0;

  const groups = chunk(batch, CHUNK_SIZE);
  onProgress?.(
    `${batch.length} waiting${deferred > 0 ? ` (+${deferred} over the cap, deferred)` : ""} — ${groups.length} chunks of up to ${CHUNK_SIZE}, model ${MODEL}`,
  );

  for (const [index, group] of groups.entries()) {
    let results: Classification[];
    try {
      results = await classifyChunk(client, group);
    } catch (error) {
      // A dead chunk costs its own rows, not the run. They stay queued.
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      onProgress?.(`  chunk ${index + 1}/${groups.length} FAILED — ${message}`);
      continue;
    }

    const now = new Date();
    for (const result of results) {
      await db
        .update(signals)
        .set({
          score: result.score,
          category: result.category,
          summary: result.summary,
          classifiedAt: now,
        })
        .where(eq(signals.id, result.id));
      classified += 1;
    }

    onProgress?.(
      `  chunk ${index + 1}/${groups.length} — ${results.length}/${group.length} scored (${classified} total)`,
    );
  }

  return {
    pending: batch.length + deferred,
    attempted: batch.length,
    classified,
    deferred,
    errors,
  };
}
