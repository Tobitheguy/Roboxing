import { Resend } from "resend";

/**
 * Sending mail.
 *
 * One thin wrapper over Resend, for the same reason `lib/classify.ts` wraps
 * Anthropic: this is a place the application reaches outside itself, and every
 * such place should have exactly one door with the failure handling written
 * once behind it.
 *
 * The rule this file exists to enforce: **a send failure is never an
 * exception that reaches the caller.** Mail goes out from cron jobs and from
 * a signup form. In the cron, one bounced address must not abort the run; in
 * the form, a mail provider having a bad minute must not turn a successful
 * signup into an error page for someone who did nothing wrong. So every
 * function here returns an outcome and logs the detail.
 */

/**
 * Who the mail is from.
 *
 * Must be on a domain VERIFIED IN RESEND. Checked on 2026-09-08 and the
 * account had no domains at all (`domains.list()` returned an empty array with
 * no error), so this default is currently rejected and nothing can be sent —
 * not the digest, not the double opt-in confirmation.
 *
 * Two ways forward, and they are not the same:
 *
 *  - **The real fix:** add roboxing.tv in the Resend dashboard and publish the
 *    DNS records it asks for. The domain is already on Vercel's registrar, so
 *    the records go in Vercel's DNS panel.
 *  - **To test before that:** set NEWSLETTER_FROM to
 *    `onboarding@resend.dev`. Resend allows that sender without a domain, but
 *    ONLY to the address that owns the Resend account — it proves the code
 *    path and cannot mail a subscriber.
 *
 * A send from an unverified domain fails with a 403 whose message does not
 * obviously say "domain", which is why this is written down here.
 */
const FROM = process.env.NEWSLETTER_FROM ?? "Roboxing <news@roboxing.tv>";

export type SendOutcome =
  | { ok: true; id: string | null }
  | { ok: false; error: string; configured: boolean };

let client: Resend | null = null;

/**
 * Null when RESEND_API_KEY is unset — which is a state, not a failure.
 *
 * Local development and preview deployments have no key and must still run.
 * Callers check `configured` and report "skipped" rather than "broken", the
 * same shape stage 2 of the watcher uses for a missing Anthropic key.
 */
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Extra headers. The newsletter passes List-Unsubscribe here; transactional
   * mail (confirmation) deliberately does not, because a confirmation is not a
   * bulk mailing and offering to unsubscribe from it is nonsense.
   */
  headers?: Record<string, string>;
};

/** Send one message. Never throws. */
export async function sendEmail(message: EmailMessage): Promise<SendOutcome> {
  const resend = getClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not set", configured: false };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      // Always both parts. A newsletter that is HTML-only reads as spam to
      // filters and is unreadable in a text client, and writing the plain part
      // as an afterthought is how it ends up empty.
      text: message.text,
      headers: message.headers,
    });

    if (result.error) {
      console.error("[email] send rejected:", result.error);
      return { ok: false, error: result.error.message, configured: true };
    }

    return { ok: true, id: result.data?.id ?? null };
  } catch (error) {
    // Network failures, timeouts, an SDK change. Same handling: log the detail,
    // hand the caller something it can put in a status line.
    console.error("[email] send failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      configured: true,
    };
  }
}
