"use server";

import { headers } from "next/headers";

import { sendConfirmation } from "@/lib/newsletter";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { addSubscriber } from "@/lib/subscribe";
import type { SubscribeState } from "@/lib/subscribe-state";

/**
 * The signup form's Server Action.
 *
 * Thin on purpose — the validation and the write live in `@/lib/subscribe` so
 * they can be tested without a request. What this file adds is the two things
 * that only exist at request time: the rate limit, and the shape `useActionState`
 * wants back.
 *
 * Worth stating plainly, because Next's docs say it too and it is easy to
 * forget once a form is working: a Server Action is a public POST endpoint.
 * Nothing about it being reached from our own form is enforced. It has to
 * survive being called directly, in a loop, by someone who never loaded the
 * page.
 */

/**
 * Signups allowed per IP per hour.
 *
 * Generous for a person — nobody subscribes five times by accident — and
 * pointless for anyone trying to stuff the list. In-memory and therefore per
 * instance, so this is a speed bump, not a wall; see the note in
 * `@/lib/rate-limit`. The list being poisoned is a slow, recoverable problem,
 * which is why it does not justify a Redis dependency today.
 */
const SIGNUPS_PER_HOUR = 5;

/*
 * The state type and its initial value live in `@/lib/subscribe-state`, not
 * here. A "use server" file may export async functions and NOTHING else —
 * exporting the `initialSubscribeState` object from this file throws
 * "A use server file can only export async functions, found object" at module
 * evaluation. `next build` does not catch it, so the first sign is the site's
 * error page. Keep this file to actions only.
 */
export async function subscribeAction(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  // A bot that posts to this endpoint fills in every field it can see. A human
  // never sees this one, so anything in it is not a human. Answering with the
  // ordinary success message rather than an error is the point: an error tells
  // whoever is probing which field gave them away.
  if ((formData.get("company") as string | null)?.trim()) {
    return { status: "success", message: "You're on the list." };
  }

  const ip = clientIpFromHeaders(await headers());
  const limit = rateLimit(`subscribe:${ip}`, SIGNUPS_PER_HOUR, 3600);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Try again later.",
    };
  }

  const email = formData.get("email");
  if (typeof email !== "string") {
    return { status: "error", message: "Enter an email address." };
  }

  const source = formData.get("source");
  const result = await addSubscriber({
    email,
    source: typeof source === "string" ? source : undefined,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  /*
   * Double opt-in. The row exists now, but nothing will ever be mailed to it
   * until the link below is clicked — `getRecipients()` requires
   * `confirmed_at`. A token comes back only when the address still needs
   * confirming, so a confirmed subscriber retyping their address gets no
   * second mail.
   *
   * A send failure is logged and swallowed. The signup itself succeeded, the
   * token stays valid, and answering an error would tell someone who did
   * everything right that they did something wrong.
   */
  if (result.confirmToken) {
    const sent = await sendConfirmation(result.email, result.confirmToken);
    if (!sent) {
      console.error("[subscribe] confirmation mail not sent to", result.email);
    }
  }

  /*
   * The same message in every case — new address, repeat address, already
   * confirmed, mail provider down. Differing here would turn the form into an
   * oracle for testing whether a given address is on the list, and the
   * enumeration risk is exactly why the original message was uniform too.
   */
  return {
    status: "success",
    message: "Check your inbox — click the link to confirm.",
  };
}
