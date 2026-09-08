"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { predictions } from "@/db/schema";
import { getViewer } from "@/lib/auth";
import { arePicksOpen, picksClosedReason } from "@/lib/predictions";
import { getBoutForPicking } from "@/lib/queries";

/**
 * Making a pick.
 *
 * Every rule that decides whether a pick counts is enforced HERE, on the
 * server, and not one of them is enforced only by the UI. A Server Action is a
 * public POST endpoint — the disabled button, the missing form, the greyed-out
 * card are all suggestions to a browser and none of them are a control. The
 * three that matter:
 *
 *   1. You must be signed in, and the pick is attributed to YOUR user id read
 *      from the session — never to a user id sent in the request.
 *   2. The deadline is re-checked against the event's own start time.
 *   3. The robot you picked must be one of THIS bout's two.
 *
 * Miss the second and someone picks the winner after the knockout. Miss the
 * third and someone picks a robot that is not in the fight and can never lose.
 */

const PickSchema = z.object({
  boutId: z.coerce.number().int().positive(),
  robotId: z.coerce.number().int().positive(),
});

export type PickState = {
  status: "idle" | "saved" | "error";
  message: string;
  /** Echoed back so the card can show the pick without a round trip. */
  boutId?: number;
  robotId?: number;
};

export const initialPickState: PickState = { status: "idle", message: "" };

export async function savePrediction(
  _previous: PickState,
  formData: FormData,
): Promise<PickState> {
  const viewer = await getViewer();
  if (!viewer) {
    return {
      status: "error",
      message: "Sign in to make a pick.",
    };
  }

  const parsed = PickSchema.safeParse({
    boutId: formData.get("boutId"),
    robotId: formData.get("robotId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That pick could not be read." };
  }

  const { boutId, robotId } = parsed.data;

  const bout = await getBoutForPicking(boutId);
  if (!bout) {
    return { status: "error", message: "That bout no longer exists." };
  }

  // The deadline, re-derived from the event rather than trusted from the page
  // that rendered the button. `arePicksOpen` is the same function the card
  // used to decide whether to show the button at all.
  if (
    !arePicksOpen({
      startsAt: bout.eventStartsAt,
      status: bout.eventStatus,
    })
  ) {
    return {
      status: "error",
      message: picksClosedReason({
        startsAt: bout.eventStartsAt,
        status: bout.eventStatus,
      }),
    };
  }

  // The robot has to actually be in this fight. The database cannot express
  // this — a CHECK constraint cannot reach across to the bouts table — so it
  // is checked here or it is not checked at all.
  if (robotId !== bout.robotAId && robotId !== bout.robotBId) {
    return { status: "error", message: "That robot is not in this bout." };
  }

  try {
    await db
      .insert(predictions)
      .values({ userId: viewer.id, boutId, robotId })
      // Changing your mind before the deadline is allowed, and this is also
      // what makes a double-submit idempotent rather than a unique violation.
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.boutId],
        set: { robotId, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("[predictions] could not save pick:", error);
    return { status: "error", message: "Could not save that. Try again." };
  }

  // The crowd split on the event page changes with every pick, including this
  // one — the page is dynamic, but the cached render would otherwise show the
  // percentages as they were before this person voted.
  revalidatePath(`/events/${bout.eventSlug}`);

  return {
    status: "saved",
    message: "Pick saved.",
    boutId,
    robotId,
  };
}
