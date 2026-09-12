import { autoPublish } from "@/lib/autopublish";
import { classifySignals } from "@/lib/classify";
import { sweepSignals } from "@/lib/signals";

/**
 * The morning sweep. Vercel's cron calls this (see vercel.json); everything
 * it finds lands in the signals inbox at /admin/signals.
 *
 * Guarded by CRON_SECRET when one is set — Vercel sends it as a bearer token
 * on cron invocations, and without the check this endpoint is a free button
 * that makes the server fetch external URLs on demand. Now that the route also
 * spends money on stage 2, that guard is the difference between a free button
 * and a billable one.
 *
 * Three stages, in order and in one invocation:
 *   1. sweepSignals()    — keyless RSS, costs nothing
 *   2. classifySignals() — scores what stage 1 landed, costs a few cents a day
 *   3. autoPublish()     — reads the top-scoring sources and writes briefs
 *
 * Stage 3 is off unless AUTOPUBLISH=on, and publishes at most a couple of
 * briefs a run. See lib/autopublish.ts for why it refuses to work from a
 * headline alone.
 *
 * What "failed" means here, and why it changed
 * -------------------------------------------
 * It used to mean a broken feed and nothing else: stage 2's errors were put in
 * the response body and the run still returned 200, on the reasoning that
 * collection is the product and scoring is an enhancement.
 *
 * That reasoning cost us two days. Classification stopped on 9 September and
 * the cron kept reporting success; 44 rows sat unscored, and because the inbox
 * sorts by score they sat at the bottom of it, invisible. Nobody looks at a
 * green cron's response body.
 *
 * So a stage that was ASKED to run and could not now turns the run red. A stage
 * that is switched off, or has no key, is not an error and still returns 200 —
 * the difference between "you did not ask for this" and "you asked and it
 * broke" is the whole signal.
 */

/*
 * Roughly 8 chunked model requests on a normal 200-item morning, plus the feed
 * fetches. Well inside this, but the default would be a silent kill mid-run on
 * a backlog day, which would look like a classifier that just stopped.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await sweepSignals();
  const sweepOk = results.every((r) => !r.error);

  const classification = await classifySignals();
  const publishing = await autoPublish();

  /*
   * "Skipped" is not failure. classifySignals() and autoPublish() both report a
   * missing key or a closed switch as a single string in `errors` and do no
   * work, which is the correct outcome on a deployment that has not been given
   * those things — returning 500 for it would mean a permanently red cron and a
   * signal nobody reads. Anything else in `errors` is a stage that tried.
   */
  const skipped = (message: string) => /\bskipped$/.test(message);
  const classifyBroke = classification.errors.some((e) => !skipped(e));
  const publishBroke = publishing.errors.some((e) => !skipped(e));

  const ok = sweepOk && !classifyBroke && !publishBroke;

  return Response.json(
    {
      results,
      classification,
      publishing,
      // Named so the dashboard's one-line preview says which stage went wrong
      // without anyone expanding the body.
      failed: ok
        ? null
        : {
            sweep: !sweepOk,
            classify: classifyBroke,
            publish: publishBroke,
          },
    },
    // 500 so the cron run is MARKED failed and shows red in Vercel — a sweep
    // that silently half-runs is how a dead feed goes unnoticed for a month,
    // and a silent classifier is how two days of headlines went unscored.
    { status: ok ? 200 : 500 },
  );
}
