/**
 * The shape `useActionState` passes around for the prediction card.
 *
 * Split out of `app/prediction-actions.ts` for the same reason as
 * [subscribe-state]: a `"use server"` file may export **async functions and
 * nothing else**, and this is an object. Exporting it from the actions file
 * throws
 *
 *   Error: A "use server" file can only export async functions, found object.
 *
 * at module evaluation — but only once something drags that module into a
 * bundle where the rule is enforced, which is why it can sit there working for
 * months. `next build` does not catch it.
 *
 * This one had not fired yet. The identical bug in the newsletter action did,
 * in production, the first time an unrelated import was added to the file
 * beside it. Moved pre-emptively rather than waiting for the picks form to
 * take its turn.
 *
 * No imports here on purpose: a client component reads it, and anything
 * imported would ride into the browser bundle.
 */

export type PickState = {
  status: "idle" | "saved" | "error";
  message: string;
  /** Echoed back so the card can show the pick without a round trip. */
  boutId?: number;
  robotId?: number;
};

export const initialPickState: PickState = { status: "idle", message: "" };
