import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import { newsletterSends, subscribers } from "@/db/schema";
import { getAppUrl } from "@/lib/app-url";
import {
  gatherDigest,
  hasNews,
  renderDigest,
  type DigestData,
} from "@/lib/digest";
import { isEmailConfigured, sendEmail } from "@/lib/email";

/**
 * Actually sending the thing.
 *
 * `lib/digest.ts` decides what the mail says. This file decides who gets it,
 * whether it should go at all, and — the part that matters most — that it
 * cannot go twice.
 *
 * **Every mail-out claims a key before it sends.** `newsletter_sends.key` is
 * UNIQUE, the claim is an INSERT, and the send only happens if the insert won.
 * A cron that fires twice, a manual trigger racing the schedule, a redeploy
 * mid-run: all of them lose the race and return `alreadySent` instead of
 * mailing the list a second time. Getting this wrong is not a bug you can walk
 * back — the second copy is already in everyone's inbox.
 */

/**
 * Pause between individual sends, in milliseconds.
 *
 * Every recipient needs their own message because the unsubscribe link is
 * personal, so this is N requests, not one. Resend's default rate limit is 2
 * requests a second and exceeding it fails sends rather than queuing them.
 *
 * This is honest about its ceiling: at ~600ms a send, a few hundred recipients
 * fit inside the route's maxDuration and a few thousand do not. When the list
 * gets there, the fix is Resend's batch endpoint (100 messages per call, each
 * with its own body) — not a shorter sleep.
 */
const SEND_GAP_MS = 600;

/** Above this, the sequential loop is the wrong tool. Logged, not enforced. */
const SEQUENTIAL_SEND_CEILING = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ISO-8601 week key, e.g. "2026-W37".
 *
 * ISO weeks, not "seven days since the last one": the key has to be derivable
 * from the clock alone, so that two processes on the same Thursday compute the
 * same string and exactly one of them wins the insert. Anything relative to
 * the previous send would let two racing runs each decide they were first.
 */
export function isoWeekKey(date: Date): string {
  // Shift to Thursday of the same ISO week — the week's year is whatever year
  // that Thursday falls in, which is the whole subtlety of the ISO calendar
  // (1 Jan can belong to week 52 of the year before).
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNumber = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function confirmUrl(token: string, base = getAppUrl()): string {
  return `${base}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(token: string, base = getAppUrl()): string {
  return `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

export type Recipient = {
  email: string;
  unsubscribeToken: string;
};

/**
 * Who is allowed to receive a mailing.
 *
 * Confirmed AND not unsubscribed, both halves, every time — the same shape the
 * posts table uses for "visible". A list filtered only on `unsubscribed_at IS
 * NULL` would mail every address ever typed into the footer, including the
 * ones that never answered the confirmation, which is exactly what double
 * opt-in exists to prevent.
 */
export async function getRecipients(): Promise<Recipient[]> {
  return db
    .select({
      email: subscribers.email,
      unsubscribeToken: subscribers.unsubscribeToken,
    })
    .from(subscribers)
    .where(
      and(
        isNotNull(subscribers.confirmedAt),
        isNull(subscribers.unsubscribedAt),
      ),
    );
}

export type SendReport = {
  key: string;
  status: "sent" | "already-sent" | "no-news" | "no-recipients" | "not-configured";
  subject?: string;
  recipients: number;
  delivered: number;
  failed: number;
  errors: string[];
};

/**
 * Claim a send key. Returns false if somebody already has it.
 *
 * The row is inserted with `sent_at` null and stamped after delivery, so a run
 * that dies halfway leaves evidence that it started. It does NOT get retried
 * automatically — a half-sent mailing that reruns would double-mail everyone
 * who already got it, and picking that apart needs a person, not a retry loop.
 */
async function claim(
  key: string,
  kind: string,
  subject: string,
): Promise<boolean> {
  const rows = await db
    .insert(newsletterSends)
    .values({ key, kind, subject })
    .onConflictDoNothing({ target: newsletterSends.key })
    .returning({ id: newsletterSends.id });
  return rows.length > 0;
}

async function finish(key: string, delivered: number): Promise<void> {
  await db
    .update(newsletterSends)
    .set({ sentAt: new Date(), recipientCount: delivered })
    .where(eq(newsletterSends.key, key));
}

/** Render per recipient and send. The unsubscribe link differs for each. */
async function deliver(
  data: DigestData,
  recipients: Recipient[],
  base: string,
): Promise<{ delivered: number; failed: number; errors: string[] }> {
  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];

  if (recipients.length > SEQUENTIAL_SEND_CEILING) {
    console.warn(
      `[newsletter] ${recipients.length} recipients exceeds the sequential ceiling of ${SEQUENTIAL_SEND_CEILING}; switch to the batch endpoint`,
    );
  }

  for (const [index, recipient] of recipients.entries()) {
    const unsubscribe = unsubscribeUrl(recipient.unsubscribeToken, base);
    const rendered = renderDigest(data, { baseUrl: base, unsubscribeUrl: unsubscribe });

    const outcome = await sendEmail({
      to: recipient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        // RFC 8058. Gmail and Outlook render their own one-click unsubscribe
        // from these, and a bulk sender without them gets treated as one that
        // does not want to be left — which costs deliverability for everyone
        // on the domain, not just this mailing.
        "List-Unsubscribe": `<${unsubscribe}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (outcome.ok) {
      delivered += 1;
    } else {
      failed += 1;
      // Capped: one broken address must not turn the report into a wall of
      // identical strings that hides the one error that is different.
      if (errors.length < 5) errors.push(`${recipient.email}: ${outcome.error}`);
    }

    if (index < recipients.length - 1) await sleep(SEND_GAP_MS);
  }

  return { delivered, failed, errors };
}

/**
 * The weekly digest.
 *
 * Sends nothing when nothing happened. See `hasNews()` — upcoming events ride
 * along as context but never justify a mailing on their own, because a weekly
 * "these four events are still scheduled" is how a list learns to ignore you.
 */
export async function sendWeeklyDigest(
  now: Date = new Date(),
): Promise<SendReport> {
  const key = `weekly:${isoWeekKey(now)}`;
  const base = getAppUrl();
  const empty = { recipients: 0, delivered: 0, failed: 0, errors: [] };

  if (!isEmailConfigured()) {
    return { key, status: "not-configured", ...empty };
  }

  const data = await gatherDigest(now);
  if (!hasNews(data)) return { key, status: "no-news", ...empty };

  const recipients = await getRecipients();
  if (recipients.length === 0) {
    return { key, status: "no-recipients", ...empty };
  }

  const rendered = renderDigest(data, {
    baseUrl: base,
    unsubscribeUrl: unsubscribeUrl("preview", base),
  });

  if (!(await claim(key, "weekly", rendered.subject))) {
    return { key, status: "already-sent", ...empty, subject: rendered.subject };
  }

  const outcome = await deliver(data, recipients, base);
  await finish(key, outcome.delivered);

  return {
    key,
    status: "sent",
    subject: rendered.subject,
    recipients: recipients.length,
    ...outcome,
  };
}

/**
 * The double opt-in mail.
 *
 * Deliberately carries no List-Unsubscribe header: this is transactional, sent
 * once to an address that has not agreed to anything yet, and offering to
 * unsubscribe from a confirmation nobody has confirmed is nonsense. Doing
 * nothing IS the unsubscribe — an address that never clicks never receives
 * another mail, because `getRecipients()` requires `confirmed_at`.
 */
export async function sendConfirmation(
  email: string,
  token: string,
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const base = getAppUrl();
  const url = confirmUrl(token, base);

  const outcome = await sendEmail({
    to: email,
    subject: "Confirm your Roboxing subscription",
    text: [
      "One click and you're on the list.",
      "",
      `Confirm: ${url}`,
      "",
      "Roboxing is the record of humanoid robot fighting — results, schedule,",
      "and what the rest of the press has not translated yet.",
      "",
      "If you did not ask for this, ignore this mail. Without the click above",
      "you will not hear from us again.",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#f7f6f3">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<div style="font-weight:700;letter-spacing:0.12em;font-size:13px;text-transform:uppercase;margin-bottom:24px">Roboxing</div>
<p style="font-size:16px;margin:0 0 20px">One click and you're on the list.</p>
<p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;font-weight:600;font-size:14px">Confirm subscription</a></p>
<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px">Roboxing is the record of humanoid robot fighting — results, schedule, and what the rest of the press has not translated yet.</p>
<p style="color:#666;font-size:12px;line-height:1.5;margin:0">If you did not ask for this, ignore this mail. Without the click above you will not hear from us again.</p>
</div></body></html>`,
  });

  return outcome.ok;
}

/**
 * Send the current digest to one address, ignoring the subscriber list.
 *
 * For checking what the thing actually looks like in a real client before it
 * goes to real people. Claims no key and writes no send row, so it can be run
 * as often as needed and can never consume the week's real slot.
 */
export async function sendTestDigest(to: string): Promise<SendReport> {
  const key = "test";
  const base = getAppUrl();
  const empty = { recipients: 0, delivered: 0, failed: 0, errors: [] };

  if (!isEmailConfigured()) return { key, status: "not-configured", ...empty };

  const data = await gatherDigest();
  const rendered = renderDigest(data, {
    baseUrl: base,
    unsubscribeUrl: unsubscribeUrl("test-token-not-real", base),
  });

  const outcome = await sendEmail({
    to,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  });

  return {
    key,
    status: "sent",
    subject: rendered.subject,
    recipients: 1,
    delivered: outcome.ok ? 1 : 0,
    failed: outcome.ok ? 0 : 1,
    errors: outcome.ok ? [] : [outcome.error],
  };
}
