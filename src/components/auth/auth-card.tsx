import type { ReactNode } from "react";

/**
 * One shape for every step between "I want this" and "I am in".
 *
 * Plan choice, account creation and sign-in are three screens of ONE flow, so
 * they get one width, one heading treatment and one rhythm.
 *
 * The heading is deliberately smaller on the form steps than on the plan step.
 * A display-size headline above a Clerk form pushed the actual fields below
 * the fold — the visitor scrolled past a sentence they had already read to
 * reach the thing they came to do. The plan step can afford the big type
 * because it IS the content; the form steps cannot, because they are not.
 *
 * The footer slot is used by the PLAN step only. The two form steps dropped
 * theirs: Clerk's own card already carries the "Don't have an account? /
 * Already have an account?" link, correctly carrying the chosen plan with it,
 * and ours sat a few pixels below saying the same thing to the same place.
 * Two identical exits is not twice the escape route — it is one extra screen
 * of height and a moment of "which of these is the real one". The plan step
 * has no Clerk form, so it still needs its own.
 *
 * `step` is optional because sign-in is reached two ways: as step 2 of
 * subscribing, and directly by someone who already has an account. Counting
 * steps at a returning viewer would invent a journey they are not on.
 */
export function AuthCard({
  step,
  totalSteps = 2,
  title,
  subtitle,
  /** The plan step earns display type; the form steps do not. */
  emphasis = "compact",
  children,
  footer,
}: {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  emphasis?: "display" | "compact";
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="text-center">
        {step ? (
          <p className="text-eyebrow text-volt font-semibold uppercase">
            Step {step} of {totalSteps}
          </p>
        ) : null}
        <h1
          className={`font-display text-ink uppercase ${
            emphasis === "display" ? "text-hero" : "text-title"
          } ${step ? "mt-2" : ""}`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-muted mt-2 text-sm">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-6">{children}</div>

      {footer ? (
        <div className="text-ink-dim mt-5 text-center text-sm">{footer}</div>
      ) : null}
    </div>
  );
}
