"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { subscribeAction } from "@/app/newsletter-actions";
import { Button } from "@/components/ui/button";
// Not from the actions file: a "use server" module may only export async
// functions, so the initial state object lives on its own.
import { initialSubscribeState } from "@/lib/subscribe-state";
import { cn } from "@/lib/utils";

/**
 * The mailing-list form.
 *
 * The site's only conversion point, and for a while the only number that will
 * say anything true about demand. Everything about it is shaped by that:
 *
 * - One field. Every extra one costs signups, and a name we would not use is
 *   a pure loss.
 * - No account. `subscribers` is deliberately not `users`; see the schema.
 * - A plain <form action={...}>, so it submits before hydration and on a
 *   phone with a bad connection. Progressive enhancement is not decoration
 *   here — the traffic arrives from social apps' in-app browsers, which are
 *   the slowest and least predictable clients on the internet.
 */

/**
 * A honeypot field.
 *
 * Named "company" because that is what a form-filling bot looks for and it is
 * the most likely thing to be auto-completed by something that is not a
 * person. Hidden from sight AND from assistive technology — `aria-hidden` plus
 * `tabIndex={-1}` keep a screen-reader user from being asked to fill in an
 * invisible trap, which is how naive honeypots exclude exactly the people they
 * should not.
 *
 * `autoComplete="off"` matters for the opposite reason: a browser password
 * manager filling this in would flag a real person as a bot.
 */
function Honeypot() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor="company">Company</label>
      <input
        id="company"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  // useFormStatus reads the status of the nearest enclosing <form>, so this
  // has to be its own component — a hook called in the component that RENDERS
  // the form always reports "not pending".
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Adding…" : label}
    </Button>
  );
}

export function NewsletterSignup({
  /** Which surface this is, so we can tell later which one converts. */
  source,
  heading = "Never miss a fight",
  description = "One email before each event. Schedules, results, and the clips worth watching. No spam, unsubscribe any time.",
  label = "Notify me",
  className,
}: {
  source: string;
  heading?: string;
  description?: string;
  label?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(
    subscribeAction,
    initialSubscribeState,
  );
  // The same component appears in the footer and on event pages, so the id
  // cannot be a constant — two forms sharing one would make the label point at
  // whichever input rendered first.
  const emailId = useId();

  return (
    <div className={cn("relative", className)}>
      <h2 className="font-display text-title text-ink uppercase">{heading}</h2>
      <p className="text-ink-muted mt-2 max-w-prose text-sm">{description}</p>

      <form action={formAction} className="mt-4">
        <Honeypot />
        <input type="hidden" name="source" value={source} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <label htmlFor={emailId} className="sr-only">
              Email address
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={state.status === "error" ? true : undefined}
              aria-describedby={state.message ? `${emailId}-status` : undefined}
              className="border-input bg-surface-2 text-ink focus-visible:border-volt w-full rounded-md border px-3 py-2 text-sm outline-none"
            />
          </div>
          <SubmitButton label={label} />
        </div>

        {/* aria-live so the outcome reaches a screen reader. The form does not
            navigate, so without it the only feedback is visual. */}
        <p
          id={`${emailId}-status`}
          role="status"
          aria-live="polite"
          className={cn(
            "mt-2 min-h-[1.25rem] text-xs",
            state.status === "error" ? "text-destructive" : "text-volt",
          )}
        >
          {state.message}
        </p>
      </form>
    </div>
  );
}
