import { sweepSignals } from "@/lib/signals";

/**
 * The morning sweep. Vercel's cron calls this (see vercel.json); everything
 * it finds lands in the signals inbox at /admin/signals.
 *
 * Guarded by CRON_SECRET when one is set — Vercel sends it as a bearer token
 * on cron invocations, and without the check this endpoint is a free button
 * that makes the server fetch external URLs on demand. When the variable is
 * unset (local dev) the guard stands down so the route can be exercised by
 * hand.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await sweepSignals();
  const ok = results.every((r) => !r.error);

  return Response.json(
    { results },
    // 500 on any source failure so the cron run is MARKED failed and shows
    // red in the Vercel dashboard — a sweep that silently half-runs is how a
    // dead feed goes unnoticed for a month.
    { status: ok ? 200 : 500 },
  );
}
