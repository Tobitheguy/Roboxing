import type { ReactNode } from "react";

/**
 * The half of the auth screen that is not a form.
 *
 * It exists because of a real cost in the chosen design: with every route
 * behind the wall, a first-time visitor's entire impression of Roboxing is
 * this screen. A bare password field would ask them to sign in to something
 * they cannot see and have never heard of. This is the only place left to say
 * what the product is.
 *
 * Hidden below `lg`, where the form should be the first thing under the
 * thumb rather than something to scroll past.
 */
export function AuthPitch({
  eyebrow,
  headline,
  body,
  points,
}: {
  eyebrow: string;
  headline: ReactNode;
  body: string;
  points?: string[];
}) {
  return (
    <div className="hidden lg:block">
      <p className="text-eyebrow text-volt font-semibold uppercase">
        {eyebrow}
      </p>
      <h1 className="text-display font-display text-ink mt-5 uppercase">
        {headline}
      </h1>
      <p className="text-ink-muted mt-6 max-w-md text-base leading-relaxed">
        {body}
      </p>

      {points && points.length > 0 && (
        <ul className="mt-8 space-y-3">
          {points.map((point) => (
            <li
              key={point}
              className="text-ink-muted flex items-start gap-3 text-sm"
            >
              <span
                aria-hidden
                className="bg-volt mt-[0.45rem] h-px w-5 shrink-0"
              />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
