"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { competitions, events, recordDrafts } from "@/db/schema";
import { adminAction, type ActionResult } from "@/lib/admin-action";
import { slugify } from "@/lib/autopublish";
import type { DraftPayload } from "@/lib/draft-record";

/**
 * Review for stage 4's queue. Two verbs: Apply turns a proposal into a real
 * row, Dismiss says it is not one.
 *
 * APPLY IS THE ONLY PLACE A MACHINE-PROPOSED LEAGUE BECOMES PUBLIC, which is
 * why the boring parts of it are deliberate:
 *
 * - The row is written at the confidence the model claimed, floored at
 *   `unconfirmed`. Nothing arrives `confirmed` from this path. A person who
 *   has checked the source can raise it afterwards; a machine cannot raise it
 *   for them.
 * - A NULL in the payload is written as a NULL. The temptation here is to fill
 *   a blank country from the city, or a season year from the date. Every one
 *   of those is an invention wearing a database column, and the reviewer can
 *   see the blank and type the truth.
 * - The draft is kept, marked `applied`, with the slug it became. An applied
 *   draft is the audit trail for a row nobody typed.
 */

const ReviewSchema = z.object({
  id: z.coerce.number().int().positive(),
  action: z.enum(["apply", "dismiss"]),
});

/** Slug that does not collide, without inventing a different name. */
async function freeSlug(
  kind: "competition" | "event",
  name: string,
): Promise<string> {
  const base = slugify(name) || `draft-${Date.now()}`;
  const taken = new Set(
    kind === "competition"
      ? (await db.select({ slug: competitions.slug }).from(competitions)).map(
          (r) => r.slug,
        )
      : (await db.select({ slug: events.slug }).from(events)).map(
          (r) => r.slug,
        ),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 50; n += 1) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

export async function reviewDraft(
  _prev: ActionResult<{ id: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: number }>> {
  return adminAction({
    schema: ReviewSchema,
    input: Object.fromEntries(formData),
    run: async ({ id, action }) => {
      const rows = await db
        .select()
        .from(recordDrafts)
        .where(eq(recordDrafts.id, id))
        .limit(1);
      const draft = rows[0];
      if (!draft) throw new Error("draft not found");
      if (draft.status !== "pending") {
        // Already reviewed — a stale tab, not an error worth failing on.
        return { id };
      }

      if (action === "dismiss") {
        await db
          .update(recordDrafts)
          .set({ status: "dismissed", reviewedAt: new Date() })
          .where(eq(recordDrafts.id, id));
        revalidatePath("/admin/drafts");
        return { id };
      }

      const payload = draft.payload as DraftPayload;
      const name = payload.name?.trim();
      if (!name) throw new Error("draft has no name");

      // Floored at unconfirmed: see the note above. A machine's "confirmed" is
      // a machine's opinion of a source it read once.
      const confidence =
        payload.confidence === "confirmed" ? "reported" : payload.confidence;

      const slug = await freeSlug(draft.kind, name);

      if (draft.kind === "competition") {
        await db.insert(competitions).values({
          slug,
          name,
          organizer: payload.organizer ?? null,
          country: payload.country?.toUpperCase() ?? null,
          city: payload.city ?? null,
          foundedYear: payload.foundedYear ?? null,
          websiteUrl: payload.websiteUrl ?? null,
          sourceUrl: draft.sourceUrl,
          confidence,
          status: "upcoming",
          description: payload.rationale,
        });
      } else {
        /*
         * An event needs a competition, and `events.competition_id` is NOT
         * NULL. When the article named a league we already hold, it hangs off
         * that; otherwise it goes under the unaffiliated container — the same
         * row the Shanghai UFC demo lives on. Inventing a competition to hold
         * one event would put a league on the site that nobody claimed exists.
         */
        const parentName = payload.competitionName?.trim();
        const parentSlug = parentName ? slugify(parentName) : null;
        const parent = parentSlug
          ? (
              await db
                .select({ id: competitions.id })
                .from(competitions)
                .where(eq(competitions.slug, parentSlug))
                .limit(1)
            )[0]
          : undefined;
        const fallback = (
          await db
            .select({ id: competitions.id })
            .from(competitions)
            .where(eq(competitions.isLeague, false))
            .limit(1)
        )[0];
        const competitionId = parent?.id ?? fallback?.id;
        if (!competitionId) {
          throw new Error(
            "no competition to attach this event to — create the league first",
          );
        }

        /*
         * `startsAt` is NOT NULL because the calendar sorts on it. When the
         * article gave no day, the flags are what stop the page printing a
         * date the organiser never announced: dateTbd with the source's own
         * wording in dateLabel.
         */
        const hasDay = Boolean(payload.startDate);
        await db.insert(events).values({
          slug,
          competitionId,
          name,
          venue: payload.venue ?? null,
          city: payload.city ?? null,
          country: payload.country?.toUpperCase() ?? null,
          startsAt: hasDay
            ? new Date(`${payload.startDate}T12:00:00Z`)
            : new Date(),
          startTimeTbd: true,
          dateTbd: !hasDay,
          dateLabel: hasDay ? null : (payload.dateLabel ?? null),
          status: "scheduled",
          kind: "competition",
          confidence,
          sourceUrl: draft.sourceUrl,
          note: payload.format ?? payload.rationale,
        });
      }

      await db
        .update(recordDrafts)
        .set({ status: "applied", reviewedAt: new Date(), appliedSlug: slug })
        .where(eq(recordDrafts.id, id));

      revalidatePath("/admin/drafts");
      revalidatePath("/competitions");
      revalidatePath("/schedule");
      return { id };
    },
    audit: (input) => ({
      action: `draft.${input.action}`,
      entity: "record_draft",
      entityId: input.id,
    }),
  });
}
