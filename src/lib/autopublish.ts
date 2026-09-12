import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, isNull, notLike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { posts, signals } from "@/db/schema";
import {
  estimateCostUsd,
  type ProgressFn,
  type Usage,
  ZERO_USAGE,
} from "@/lib/classify";

/**
 * Stage 3: the site writes itself in the morning.
 *
 * Stages 1 and 2 collect headlines and score them. This one takes the few that
 * scored highest, FETCHES AND READS the article behind each, and publishes a
 * short brief with a link out. It runs unattended from the cron.
 *
 * The risk this file is mostly about
 * ---------------------------------
 * Everything this site claims to be rests on its results being right. An
 * unattended publisher is the fastest way to lose that, and the failure is not
 * hypothetical: on 10 September the feed carried "Dubai hosts first-ever robot
 * kickboxing event", scored 75, which turned out to be a *university showcase*
 * at Canadian University Dubai. A publisher working from headlines alone puts
 * that on the front page as a second Gulf league event.
 *
 * So the rules below are not ceremony:
 *
 * 1. **Never publish from a headline.** The source article is fetched and the
 *    extracted text must clear MIN_ARTICLE_CHARS. No text, no post — the
 *    signal stays in the inbox for a human. This is why the publisher ignores
 *    every `news.google.com` row: those links are JS interstitials with no
 *    recoverable article (see the note in signals.ts), which is most of the
 *    feed and all of the Chinese half of it.
 * 2. **The model may decline.** It is given the last published headlines and
 *    told to return `publish: false` for a story already covered, a story the
 *    fetched page does not actually support, or a press release dressed as
 *    news. A skip is the expected outcome most mornings.
 * 3. **Say who wrote it.** Every brief is stored with `autoPublished` true and
 *    renders a standing disclosure plus the source link. A reader can always
 *    tell this apart from reported copy.
 * 4. **A hard cap per run.** MAX_POSTS_PER_RUN, default 2. The failure mode
 *    worth designing against is not one wrong brief, it is twelve.
 *
 * Off by default
 * --------------
 * `AUTOPUBLISH` must be `on`. Without it the function reports that it is off
 * and touches nothing, so deploying this code changes no behaviour until
 * somebody sets the variable.
 */

/** The switch. Anything other than "on" means collect-and-score only. */
function isEnabled(): boolean {
  return (process.env.AUTOPUBLISH ?? "").trim().toLowerCase() === "on";
}

/**
 * Briefs are short, factual and about one story, which Haiku does well and
 * cheaply. Overridable because the first time a brief reads badly the fix to
 * try is a better model, and that should not need a deploy.
 */
const MODEL = process.env.AUTOPUBLISH_MODEL ?? "claude-haiku-4-5";

/** Ceiling per run. Two is a news site; ten is a content farm. */
const MAX_POSTS_PER_RUN = Math.max(
  0,
  Number(process.env.AUTOPUBLISH_MAX ?? 2) || 0,
);

/**
 * The score a story needs before this stage will even fetch it.
 *
 * 85 is deliberately above the classifier's "substantive news about a league"
 * band (70-89) and inside its "a specific result, or a dated competition"
 * band (90-100), catching only the top of the former. The whole point is that
 * an unattended publisher should only touch stories whose importance is not in
 * question.
 */
const MIN_SCORE = Math.max(
  0,
  Number(process.env.AUTOPUBLISH_MIN_SCORE ?? 85) || 0,
);

/**
 * Categories worth a brief. `hardware` and `business` are excluded not because
 * they are uninteresting but because they are where the feed's near-misses live
 * — stock moves, funding rounds, spec sheets — and they are the rows a reader
 * would least forgive us for getting wrong.
 */
const PUBLISHABLE_CATEGORIES = ["result", "event", "league"] as const;

/** How far back to look. A four-day-old story is not news. */
const MAX_AGE_DAYS = 4;

/** Below this many characters of extracted text, we did not get the article. */
const MIN_ARTICLE_CHARS = 600;

/** Above this, we are paying to read the site's footer. */
const MAX_ARTICLE_CHARS = 14_000;

/** Headlines shown to the model so it can recognise what we already covered. */
const RECENT_POSTS_FOR_DEDUPE = 25;

const SYSTEM_PROMPT = `You write short news briefs for Roboxing, the English-language system of record for humanoid robot fighting — schedule, results, teams, robots and editorial for leagues like URKL (EngineAI), CyberHero (Hero Esports), the World Humanoid Robot Games, REK, and Unitree's Iron Fist King.

You are given ONE article's extracted text, its URL, and the headlines Roboxing has already published. Decide whether it deserves a brief, and if so, write one.

RETURN publish: false — this is the common and correct answer — when ANY of these is true:
- One of the already-published headlines covers this same story. A second angle on the same event is a duplicate.
- The extracted text does not actually support the headline (a teaser, a paywall page, a navigation dump, a video with no article).
- It is a press release or sponsored post with no verifiable fact in it.
- It is not really about humanoid robot fighting: a vacuum robot, an industrial arm, a toy, a stock-market note, a university demo presented as a league event, general AI news.
- The only specifics are vague ("soon", "a major city", "industry sources").
When you decline, put the reason in "reason" in under 15 words.

When you publish, write from the fetched text and NOTHING else:
- title: under 80 characters. State what happened. No colons-as-drama, no "Watch:", no clickbait, no exclamation marks.
- summary: one sentence, under 30 words, the fact a reader needs.
- body: 2 to 4 short paragraphs of plain text, separated by BLANK LINES. No markdown, no headings, no bullets, no links — the source link is added automatically.

RULES FOR THE BODY, which matter more than the prose:
- Every fact must be in the article you were given. If the article does not name the robots, do not name them. If it does not give a score, do not give one.
- Attribute contested or single-sourced facts to who reported them ("Xinhua's English service named both teams").
- Where the article is vague, say so plainly — "no date was given" is useful; a guessed date is not.
- Never predict, never speculate about what a result means for a league's future, never call anything historic.
- Plain past tense. No hype adjectives. A reader should finish knowing exactly what is known and what is not.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    publish: { type: "boolean" },
    reason: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
  },
  required: ["publish", "reason", "title", "summary", "body"],
  additionalProperties: false,
} as const;

const BriefSchema = z.object({
  publish: z.boolean(),
  reason: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
});

export type Brief = z.infer<typeof BriefSchema>;

/* -------------------------------------------------------------------------- */
/* Pure helpers — the tested surface                                           */
/* -------------------------------------------------------------------------- */

/**
 * Strip an HTML page to something a model can read.
 *
 * Not a parser and not trying to be a readability implementation: script,
 * style and chrome elements are dropped whole, everything else becomes text.
 * It leaves some navigation junk in ("More from AI and Robotics See All…"),
 * which is fine — the model is told to write only what the article supports,
 * and a menu label supports nothing.
 *
 * Tags are dropped BEFORE entities are decoded. The other order turns an
 * encoded `&lt;script&gt;` in the article body into a real tag that the tag
 * stripper has already run past.
 */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
    // Block boundaries become breaks, so two paragraphs do not run into
    // oneword.
    .replace(/<\/(p|div|h[1-6]|li|br|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(stripped).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&rsquo;|&#8217;/gi, "’")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    // Last, so an encoded "&amp;lt;" does not become a tag.
    .replace(/&amp;/gi, "&");
}

/**
 * A URL-safe slug. Diacritics are folded, everything else that is not a letter
 * or digit becomes a hyphen.
 *
 * Non-Latin titles collapse to an empty string here, which callers must handle
 * — a Chinese headline would otherwise produce the slug `-`. uniqueSlug() is
 * where that case is caught.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

/**
 * Make a slug that is not already taken, given the ones that are.
 *
 * The suffix walk matters because `posts.slug` is UNIQUE: a collision is an
 * exception mid-run, and the run has already paid for the brief by then.
 */
export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = slugify(title) || "brief";
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  // 99 same-titled posts is not a case to design for, but throwing here would
  // lose the brief; a timestamped slug is ugly and correct.
  return `${base}-${Date.now()}`;
}

/**
 * Is this a link we can actually read?
 *
 * Google News interstitials are the case this exists for, and they are the
 * majority of the feed. Anything non-http is a malformed row.
 */
export function isFetchableArticle(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const host = parsed.hostname.toLowerCase();
  return !(
    host === "news.google.com" ||
    host.endsWith(".google.com") ||
    host === "google.com"
  );
}

/**
 * Compose the stored body: the brief, then the attribution.
 *
 * The source line is appended here rather than asked of the model, because a
 * model that forgets it once publishes an unsourced claim. Plain text with a
 * markdown link — the same renderer the hand-written posts use.
 */
export function withAttribution(body: string, url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();
  return `${body.trim()}\n\nSource: [${host}](${url})`;
}

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

export type Candidate = {
  id: number;
  title: string;
  url: string;
  score: number | null;
  category: string | null;
  summary: string | null;
};

export type AutoPublishOutcome = {
  signalId: number;
  url: string;
  /** published | skipped | unreadable */
  outcome: "published" | "skipped" | "unreadable";
  reason: string;
  postSlug?: string;
};

export type AutoPublishResult = {
  enabled: boolean;
  considered: number;
  published: number;
  outcomes: AutoPublishOutcome[];
  errors: string[];
  usage: Usage;
  estimatedCostUsd: number | null;
  model: string;
};

function offResult(reason: string): AutoPublishResult {
  return {
    enabled: false,
    considered: 0,
    published: 0,
    outcomes: [],
    errors: [reason],
    usage: ZERO_USAGE,
    estimatedCostUsd: 0,
    model: MODEL,
  };
}

/**
 * Fetch an article and extract its text. Returns null for anything we could
 * not read, which is a skip rather than an error — publishers block bots,
 * paywalls exist, and neither is a fault in this pipeline.
 */
async function readArticle(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // A real UA string, because a bare fetch is 403 at most publishers.
        // Honest about who we are in the comment and in the crawler policy;
        // this is a single page fetch of a page we are about to link to.
        "user-agent":
          "Mozilla/5.0 (compatible; roboxing-watcher/1.0; +https://roboxing.tv)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("html") && !type.includes("text/plain")) return null;

  const text = htmlToText(await response.text());
  if (text.length < MIN_ARTICLE_CHARS) return null;
  return text.slice(0, MAX_ARTICLE_CHARS);
}

/** The rows worth spending a fetch and a model call on. */
async function selectCandidates(limit: number): Promise<Candidate[]> {
  const since = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  return db
    .select({
      id: signals.id,
      title: signals.title,
      url: signals.url,
      score: signals.score,
      category: signals.category,
      summary: signals.summary,
    })
    .from(signals)
    .where(
      and(
        // Never published before. This is the idempotency guard, and it holds
        // even if the post is later deleted (the FK is SET NULL, not CASCADE —
        // see the migration).
        isNull(signals.postId),
        gte(signals.score, MIN_SCORE),
        sql`${signals.category} in ${PUBLISHABLE_CATEGORIES}`,
        gte(sql`coalesce(${signals.publishedAt}, ${signals.createdAt})`, since),
        // Cheap pre-filter for the interstitials; isFetchableArticle() is the
        // real check, on every row, below.
        notLike(signals.url, "%news.google.com%"),
        eq(signals.status, "new"),
      ),
    )
    // Highest score first: if the cap only allows two, they should be the two
    // that matter most, not the two that happened to arrive first.
    .orderBy(desc(signals.score), desc(signals.publishedAt))
    .limit(limit);
}

/** The headlines the model is shown so it can spot a story we already ran. */
async function recentHeadlines(): Promise<string[]> {
  const rows = await db
    .select({ title: posts.title, summary: posts.summary })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(RECENT_POSTS_FOR_DEDUPE);
  return rows.map((r) => (r.summary ? `${r.title} — ${r.summary}` : r.title));
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** One brief. Throws on transport, refusal or truncation; the caller absorbs. */
async function writeBrief(
  client: Anthropic,
  candidate: Candidate,
  article: string,
  published: string[],
): Promise<{ brief: Brief; usage: Usage }> {
  const prompt = [
    `ALREADY PUBLISHED ON ROBOXING (do not duplicate any of these):`,
    published.length > 0
      ? published.map((h) => `- ${h}`).join("\n")
      : "- (nothing yet)",
    ``,
    `FEED HEADLINE: ${candidate.title}`,
    `SOURCE URL: ${candidate.url}`,
    ``,
    `EXTRACTED ARTICLE TEXT:`,
    article,
  ].join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const usage: Usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };

  // Same order as classify.ts and for the same reason: a refusal or a
  // truncation was generated and billed, so its tokens are read before the
  // throw. A truncated brief must never be published — half a paragraph of
  // JSON is not a news story.
  if (message.stop_reason !== "end_turn") {
    throw Object.assign(
      new Error(`stop_reason=${message.stop_reason}`),
      { usage },
    );
  }

  return { brief: BriefSchema.parse(JSON.parse(textOf(message))), usage };
}

/**
 * Sanity gate between the model and the database.
 *
 * The model was asked for a title, a summary and 2-4 paragraphs. This checks it
 * actually returned them, because the one thing worse than publishing nothing
 * is publishing an empty post. Returns the reason it is unusable, or null.
 */
export function rejectBrief(brief: Brief): string | null {
  if (!brief.publish) return brief.reason.trim() || "model declined";
  if (brief.title.trim().length < 12) return "title too short";
  if (brief.title.length > 140) return "title too long";
  if (brief.summary.trim().length < 20) return "summary too short";
  const body = brief.body.trim();
  if (body.length < 300) return "body too short";
  if (/^#{1,6}\s|^\s*[-*]\s/m.test(body)) return "body contains markdown";
  return null;
}

/**
 * Everything that happens to one candidate before the database is touched:
 * fetch, read, write, sanity-check.
 *
 * Extracted so the live run and the dry run cannot diverge. They differ in
 * exactly one thing — whether the INSERT happens — and a dry run that reaches a
 * different verdict from the live run is worse than no dry run at all, because
 * it is the thing being trusted.
 */
async function evaluateCandidate(
  client: Anthropic,
  candidate: Candidate,
  headlines: string[],
): Promise<{
  brief: Brief | null;
  outcome: AutoPublishOutcome["outcome"];
  reason: string;
  usage: Usage;
  error?: string;
}> {
  if (!isFetchableArticle(candidate.url)) {
    return {
      brief: null,
      outcome: "unreadable",
      reason: "not a fetchable article URL",
      usage: ZERO_USAGE,
    };
  }

  const article = await readArticle(candidate.url);
  if (!article) {
    return {
      brief: null,
      outcome: "unreadable",
      reason: "could not extract article text",
      usage: ZERO_USAGE,
    };
  }

  let brief: Brief;
  let usage: Usage;
  try {
    const written = await writeBrief(client, candidate, article, headlines);
    brief = written.brief;
    usage = written.usage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      brief: null,
      outcome: "skipped",
      reason: message,
      // A refusal or truncation was billed even though it produced nothing
      // usable; a connection error never reached the model.
      usage: (error as { usage?: Usage }).usage ?? ZERO_USAGE,
      error: `signal ${candidate.id}: ${message}`,
    };
  }

  const rejection = rejectBrief(brief);
  if (rejection) {
    return { brief: null, outcome: "skipped", reason: rejection, usage };
  }
  return { brief, outcome: "published", reason: "ok", usage };
}

/**
 * Write the briefs for this morning.
 *
 * Never throws. Every failure is a row in `outcomes` or a string in `errors`,
 * because this runs inside a cron whose job is the sweep — a publisher outage
 * must not cost the morning's collection.
 */
export async function autoPublish(
  onProgress?: ProgressFn,
): Promise<AutoPublishResult> {
  if (!isEnabled()) return offResult("AUTOPUBLISH is not on — skipped");
  if (MAX_POSTS_PER_RUN === 0) return offResult("AUTOPUBLISH_MAX is 0 — skipped");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return offResult("ANTHROPIC_API_KEY not set — skipped");

  const candidates = await selectCandidates(MAX_POSTS_PER_RUN * 3);
  onProgress?.(
    `${candidates.length} candidate(s) at score >= ${MIN_SCORE}, publishing at most ${MAX_POSTS_PER_RUN}`,
  );
  if (candidates.length === 0) {
    return {
      enabled: true,
      considered: 0,
      published: 0,
      outcomes: [],
      errors: [],
      usage: ZERO_USAGE,
      estimatedCostUsd: 0,
      model: MODEL,
    };
  }

  const client = new Anthropic({ apiKey, maxRetries: 5 });
  const headlines = await recentHeadlines();
  const takenSlugs = new Set(
    (await db.select({ slug: posts.slug }).from(posts)).map((r) => r.slug),
  );

  const usage: Usage = { ...ZERO_USAGE };
  const addUsage = (delta: Usage) => {
    usage.inputTokens += delta.inputTokens;
    usage.outputTokens += delta.outputTokens;
    usage.cacheReadTokens += delta.cacheReadTokens;
    usage.cacheWriteTokens += delta.cacheWriteTokens;
  };

  const outcomes: AutoPublishOutcome[] = [];
  const errors: string[] = [];
  let published = 0;

  for (const candidate of candidates) {
    if (published >= MAX_POSTS_PER_RUN) break;

    const verdict = await evaluateCandidate(client, candidate, headlines);
    addUsage(verdict.usage);
    if (verdict.error) errors.push(verdict.error);

    if (!verdict.brief) {
      onProgress?.(
        `  skip (${verdict.reason}) — ${candidate.title.slice(0, 70)}`,
      );
      outcomes.push({
        signalId: candidate.id,
        url: candidate.url,
        outcome: verdict.outcome,
        reason: verdict.reason,
      });
      /*
       * A model that read the article and said no is a finished decision:
       * dismiss the row so tomorrow does not pay to fetch and re-read the same
       * page for the same answer. A row we could not READ stays `new` — that is
       * a transient failure (a 403, a slow publisher, a paywall that may lift),
       * and it is also the row a human is most likely to want in the inbox.
       */
      if (verdict.outcome === "skipped" && !verdict.error) {
        await db
          .update(signals)
          .set({ status: "dismissed" })
          .where(eq(signals.id, candidate.id));
      }
      continue;
    }

    const brief = verdict.brief;
    const slug = uniqueSlug(brief.title, takenSlugs);
    takenSlugs.add(slug);

    const [row] = await db
      .insert(posts)
      .values({
        slug,
        kind: "article",
        status: "published",
        title: brief.title.trim(),
        summary: brief.summary.trim(),
        body: withAttribution(brief.body, candidate.url),
        publishedAt: new Date(),
        autoPublished: true,
        sourceUrl: candidate.url,
      })
      .returning({ id: posts.id });

    // Both in one statement each, and the signal update second: if it failed,
    // the post exists without its guard and tomorrow could publish the story
    // again. Marking `kept` as well as setting postId means the inbox shows
    // what happened to it.
    await db
      .update(signals)
      .set({ status: "kept", postId: row.id })
      .where(eq(signals.id, candidate.id));

    // So the next brief in the same run cannot duplicate this one.
    headlines.unshift(`${brief.title} — ${brief.summary}`);
    published += 1;
    outcomes.push({
      signalId: candidate.id,
      url: candidate.url,
      outcome: "published",
      reason: "ok",
      postSlug: slug,
    });
    onProgress?.(`  PUBLISHED /news/${slug}`);
  }

  const estimatedCostUsd = estimateCostUsd(MODEL, usage);
  onProgress?.(
    `${published} published, ${outcomes.length - published} skipped` +
      (estimatedCostUsd === null
        ? ""
        : ` — about $${estimatedCostUsd.toFixed(4)} at list price`),
  );

  return {
    enabled: true,
    considered: candidates.length,
    published,
    outcomes,
    errors,
    usage,
    estimatedCostUsd,
    model: MODEL,
  };
}

/* -------------------------------------------------------------------------- */
/* Dry run                                                                     */
/* -------------------------------------------------------------------------- */

export type DryRunEntry = {
  signalId: number;
  url: string;
  score: number | null;
  /** Null when it would not have been published. */
  brief: Brief | null;
  /** The body exactly as it would have been stored, attribution included. */
  body?: string;
  slug?: string;
  reason: string;
};

/**
 * Everything the real run does, stopping at the INSERT.
 *
 * The model call happens and is billed — a dry run that skipped it would only
 * be testing the fetcher, and the fetcher is not the part that can embarrass
 * us. What this buys is a printed brief to read before a single word of machine
 * writing goes on the public site, and the same verdict the live run would
 * reach, because both go through evaluateCandidate().
 *
 * Signal rows are not touched either — including the `dismissed` mark a live
 * skip would leave. A dry run that quietly dismissed rows would change what the
 * next real run sees, which is the one thing an inspection must not do.
 */
export async function dryRunAutoPublish(
  onProgress?: ProgressFn,
): Promise<DryRunEntry[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const candidates = await selectCandidates(MAX_POSTS_PER_RUN * 3);
  onProgress?.(
    `DRY RUN — ${candidates.length} candidate(s) at score >= ${MIN_SCORE}, model ${MODEL}, nothing will be written`,
  );

  const client = new Anthropic({ apiKey, maxRetries: 5 });
  const headlines = await recentHeadlines();
  const takenSlugs = new Set(
    (await db.select({ slug: posts.slug }).from(posts)).map((r) => r.slug),
  );

  const entries: DryRunEntry[] = [];
  for (const candidate of candidates) {
    const verdict = await evaluateCandidate(client, candidate, headlines);
    if (!verdict.brief) {
      entries.push({
        signalId: candidate.id,
        url: candidate.url,
        score: candidate.score,
        brief: null,
        reason: verdict.reason,
      });
      continue;
    }
    const slug = uniqueSlug(verdict.brief.title, takenSlugs);
    takenSlugs.add(slug);
    // Mirrors the live run: the next brief in the same run must see this one.
    headlines.unshift(`${verdict.brief.title} — ${verdict.brief.summary}`);
    entries.push({
      signalId: candidate.id,
      url: candidate.url,
      score: candidate.score,
      brief: verdict.brief,
      body: withAttribution(verdict.brief.body, candidate.url),
      slug,
      reason: "ok",
    });
  }
  return entries;
}
