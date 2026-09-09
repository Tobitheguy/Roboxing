import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscribers } from "@/db/schema";

/**
 * Leaving the list.
 *
 * Two verbs on purpose:
 *
 * - **GET** is the link a person clicks at the foot of the mail. It redirects
 *   to a page that says what happened, because a bare 200 with no words looks
 *   like it did not work and produces a second click and then a complaint.
 * - **POST** is RFC 8058 one-click. Gmail and Outlook render their own
 *   unsubscribe button from the `List-Unsubscribe-Post` header and POST here
 *   with no human involved; it must answer 2xx and must not redirect.
 *
 * Both are unauthenticated and that is correct. Requiring a login to leave a
 * mailing list is the pattern that gets a sender marked as spam — the person
 * has an easier button right there in their client, and using it costs the
 * domain's reputation rather than one subscription.
 */

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;

  const rows = await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date() })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning({ id: subscribers.id });

  return rows.length > 0;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribe(token);

  const done = new URL("/newsletter/unsubscribed", request.url);
  if (!ok) done.searchParams.set("ok", "0");
  return Response.redirect(done, 303);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");

  /*
   * One-click clients post the List-Unsubscribe-Post key as a form body. The
   * token still arrives in the query string, but some clients replay the body
   * against a bare URL, so accept it from either place rather than failing a
   * legitimate unsubscribe on a technicality.
   */
  if (!token) {
    try {
      const form = await request.formData();
      const value = form.get("token");
      if (typeof value === "string") token = value;
    } catch {
      // No body, or not form-encoded. Nothing to recover; fall through.
    }
  }

  await unsubscribe(token);

  /*
   * 200 even for an unknown token. The sender's obligation under one-click is
   * to accept the request, and answering 4xx makes the mail client report a
   * broken unsubscribe to the user — which is worse for the domain than
   * silently doing nothing about a token that was already used.
   */
  return new Response(null, { status: 200 });
}
