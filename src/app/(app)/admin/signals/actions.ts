"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { signals } from "@/db/schema";
import { adminAction, type ActionResult } from "@/lib/admin-action";

/**
 * Triage for the signals inbox. Two verbs, deliberately: "keep" marks a lead
 * worth turning into coverage, "dismiss" clears noise. Neither deletes — a
 * dismissed row still blocks its URL from resurfacing tomorrow, which is half
 * the point of keeping it.
 */

const TriageSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["kept", "dismissed", "new"]),
});

export async function triageSignal(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: TriageSchema,
    input: Object.fromEntries(formData),
    run: async ({ id, status }) => {
      await db.update(signals).set({ status }).where(eq(signals.id, id));
      return { id };
    },
    audit: (input) => ({
      action: `signal.${input.status}`,
      entity: "signal",
      entityId: input.id,
    }),
  });
}
