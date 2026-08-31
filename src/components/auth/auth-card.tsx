import type { ReactNode } from "react";

/**
 * One shape for every step between "I want this" and "I am in".
 *
 * Plan choice, account creation and sign-in are three screens of ONE flow, so
 * they get one width, one heading treatment and one rhythm. They did not
 * before: the plan page was a narrow centred card and the auth pages were a
 * two-column marketing layout with a display-size headline, which made step 2
 * look like a different product than step 1.
 *
 * The marketing copy that used to sit beside the form is gone from here on
 * purpose. The landing page now does the selling — repeating the pitch to
 * someone who has already clicked through it is noise in the middle of a
 * funnel, and it was the thing making the two steps look unrelated.
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
  children,
  footer,
}: {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
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
          className={`font-display text-hero text-ink uppercase ${step ? "mt-3" : ""}`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-muted mt-3 text-sm">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-8">{children}</div>

      {footer ? (
        <div className="text-ink-dim mt-6 text-center text-sm">{footer}</div>
      ) : null}
    </div>
  );
}
