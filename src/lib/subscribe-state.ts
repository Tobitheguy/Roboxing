/**
 * The shape `useActionState` passes around for the signup form.
 *
 * In its own module, and it has to be. This used to live in
 * `app/newsletter-actions.ts` next to the action that returns it, which reads
 * better and is not allowed: a `"use server"` file may export **async
 * functions and nothing else**, and `initialSubscribeState` is an object.
 *
 * That was true from the day it was written and stayed invisible for months —
 * the violation only turns into
 *
 *   Error: A "use server" file can only export async functions, found object.
 *
 * when something drags the module into a bundle where the rule is enforced.
 * Adding one unrelated import to the actions file was enough. `next build`
 * does NOT catch it; the first symptom was the site's error page in
 * production, on a form that had worked for weeks.
 *
 * There are no imports here on purpose. A client component reads this, so
 * anything pulled in would ride along into the browser bundle — which is the
 * other reason it cannot simply move into `lib/subscribe.ts`, where it would
 * drag the database client with it.
 */

export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSubscribeState: SubscribeState = {
  status: "idle",
  message: "",
};
