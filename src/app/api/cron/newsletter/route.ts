import { sendWeeklyDigest } from "@/lib/newsletter";

/**
 * The weekly send.
 *
 * Guarded by CRON_SECRET, and here that guard matters more than it does on the
 * signals sweep: an unauthenticated caller who could reach this would not just
 * cost money, they would mail the list. The idempotency key means the second
 * call of the week does nothing, but "the damage is capped at one mailing" is
 * not a reason to leave the door open.
 *
 * Returns a report rather than a bare 200 so the Vercel log line says what
 * happened — `no-news` and `already-sent` are both normal, quiet outcomes that
 * would otherwise be indistinguishable from a broken job.
 */

/*
 * Sends are sequential and paced to stay inside Resend's rate limit, so wall
 * time scales with the list. At the current size this finishes in seconds; the
 * ceiling is documented in lib/newsletter.ts.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await sendWeeklyDigest();

  /*
   * 500 only when delivery was attempted and something actually broke. The
   * quiet outcomes — nothing to report this week, no confirmed subscribers
   * yet, already sent — are successes: a red cron for "the sport had a slow
   * week" trains you to ignore the alert that matters.
   */
  const broken = report.status === "sent" && report.failed > 0;
  return Response.json(report, { status: broken ? 500 : 200 });
}
