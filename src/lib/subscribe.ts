import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { subscribers } from "@/db/schema";

/**
 * Joining the mailing list.
 *
 * This is the only demand instrument the site has that means anything before
 * there is anything to sell. A pageview is a stranger who bounced; an address
 * is a stranger who expects to hear from us again about a sport that barely
 * exists yet. So the bar to give one has to be as low as it can be — no
 * account, one field — and the write has to be very hard to break.
 */

/**
 * Longest address accepted.
 *
 * RFC 5321 caps a path at 256 octets including the angle brackets, so 254 is
 * the real ceiling for the address itself. The point of the limit is not
 * standards compliance though — it is that the field is unauthenticated and
 * the column is unbounded `text`, and without it a single POST can store a
 * megabyte.
 */
export const MAX_EMAIL_LENGTH = 254;

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter an email address.")
  .max(MAX_EMAIL_LENGTH, "That email address is too long.")
  .pipe(z.email("That does not look like an email address."));

/**
 * Where the signup came from, e.g. "footer" or "event:riyadh-2026".
 *
 * Bounded and pattern-checked because it arrives in a hidden form field, which
 * means it arrives from the client and a hidden input is not a promise. It is
 * only ever read by us, in aggregate, to answer "which surface converts" — so
 * anything that does not look like one of our own labels is dropped rather
 * than stored.
 */
const sourceSchema = z
  .string()
  .trim()
  .max(64)
  .regex(/^[a-z0-9:_-]+$/i)
  .optional()
  .catch(undefined);

export const subscribeSchema = z.object({
  email: emailSchema,
  source: sourceSchema,
});

/**
 * Lowercase an address for storage.
 *
 * Postgres compares `text` case-sensitively and the column is UNIQUE, so
 * without this `Tobi@x.com` and `tobi@x.com` are two perfectly legal rows —
 * and the person behind them gets every mail twice, then has to unsubscribe
 * twice.
 *
 * Strictly speaking the local part of an address IS case-sensitive per RFC
 * 5321, so this can in theory merge two different mailboxes. In practice no
 * mail provider in use has ever treated them as distinct, and the alternative
 * failure — duplicate sends to a real person — is the one that actually
 * happens.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type SubscribeOutcome =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

/**
 * Record a signup.
 *
 * A repeat address is a SUCCESS, not an error, and that is a deliberate
 * choice rather than laziness. Someone who types their address again has
 * plainly not changed their mind, and answering "you are already on the list"
 * to an unauthenticated form turns it into an oracle that confirms whether a
 * given address is a subscriber. Both reasons point the same way.
 *
 * A previous unsubscribe is reversed on purpose: typing your address into a
 * signup form is a fresh, explicit consent, and it is the only way back onto
 * the list for someone who left and returned.
 */
export async function addSubscriber(input: {
  email: string;
  source?: string;
}): Promise<SubscribeOutcome> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const email = normalizeEmail(parsed.data.email);

  try {
    const rows = await db
      .insert(subscribers)
      .values({ email, source: parsed.data.source ?? null })
      // ON CONFLICT rather than select-then-insert. Two submissions of the
      // same address can race, and the check-first version loses that race by
      // throwing a unique violation at the person who clicked twice.
      .onConflictDoUpdate({
        target: subscribers.email,
        set: { unsubscribedAt: null },
        // Only touch a row that actually needs it, so an unchanged repeat
        // signup does not rewrite the row and lose nothing but tells us
        // nothing either. `excluded` is the row we tried to insert.
        setWhere: sql`${subscribers.unsubscribedAt} is not null`,
      })
      .returning({ id: subscribers.id, createdAt: subscribers.createdAt });

    // No returned row means the conflict target matched and setWhere excluded
    // it — an address already on the list, unchanged. Still a success.
    return { ok: true, alreadySubscribed: rows.length === 0 };
  } catch (error) {
    // The list is worth more than the error message. Log the detail and tell
    // the visitor something they can act on.
    console.error("[subscribe] could not record signup:", error);
    return { ok: false, error: "Something went wrong. Try again in a moment." };
  }
}
