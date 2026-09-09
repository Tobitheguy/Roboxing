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
 * Two stages, in order and in one invocation:
 *   1. sweepSignals()    — keyless RSS, costs nothing
 *   2. classifySignals() — scores what stage 1 landed, costs a few cents a day
 *
 * Stage 2 never fails the run on its own. Collection is the product; scoring is
 * an enhancement, and a missing API key or a bad afternoon at the model
 * provider must not cost us the morning's headlines. Only a broken FEED turns
 * the run red.
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
  const ok = results.every((r) => !r.error);

  // Deliberately after the sweep and deliberately not awaited into the status:
  // a classifier outage is reported in the body and left visible, but the cron
  // run is judged on collection alone.
  const classification = await classifySignals();

  return Response.json(
    { results, classification },
    // 500 on any SOURCE failure so the cron run is MARKED failed and shows
    // red in the Vercel dashboard — a sweep that silently half-runs is how a
    // dead feed goes unnoticed for a month.
    { status: ok ? 200 : 500 },
  );
}
