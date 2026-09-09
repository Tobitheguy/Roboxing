"use server";

import { z } from "zod";

import { adminAction, type ActionResult } from "@/lib/admin-action";
import { sendTestDigest } from "@/lib/newsletter";
import { emailSchema } from "@/lib/subscribe";

/**
 * Send the current digest to one address.
 *
 * Behind `adminAction`, so it is refused for anyone who is not an
 * administrator and every use is written to the audit log. That matters more
 * here than on most admin verbs: this is the one button in the application
 * that causes mail to leave the building on demand, and "who sent that and
 * when" is a question that eventually gets asked.
 *
 * It writes no `newsletter_sends` row and claims no key, so testing can never
 * consume the week's real send slot.
 */

const TestSendSchema = z.object({ email: emailSchema });

export async function sendTestAction(
  _prev: ActionResult<{ email: string; delivered: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string; delivered: number }>> {
  return adminAction({
    schema: TestSendSchema,
    input: Object.fromEntries(formData),
    run: async ({ email }) => {
      const report = await sendTestDigest(email);
      if (report.delivered === 0) {
        // Thrown so adminAction reports a failure rather than a cheerful
        // "sent" for a mail that never left. The detail is in the log; the
        // person needs to know it did not work, not why Resend said no.
        throw new Error(report.errors[0] ?? "not delivered");
      }
      return { email, delivered: report.delivered };
    },
    audit: (input) => ({
      action: "newsletter.test",
      entity: "newsletter",
      entityId: input.email,
    }),
  });
}
