import type { ReactNode } from "react";

/**
 * Make a Clerk form fill the column it is placed in.
 *
 * Clerk sets an explicit `width: 400px` on its root box — not a max-width, an
 * outright width. Measured on the deployed page, not assumed: the plan summary
 * above it was 448px and the form was 400px, so the funnel had two left edges
 * that agreed and two right edges that did not.
 *
 * A Tailwind `w-full` on the wrapper loses that fight, because Clerk's own
 * stylesheet is injected at runtime and wins on order. So this overrides it
 * outright, scoped to a direct child of this wrapper.
 *
 * The selector targets STRUCTURE, not a Clerk class name. An earlier attempt
 * at styling Clerk went through `appearance.elements`, referenced class names,
 * and silently did nothing at all across a version change — the shape of the
 * tree survives upgrades in a way those names demonstrably do not.
 */
export function ClerkFill({ children }: { children: ReactNode }) {
  return (
    <div className="roboxing-clerk-fill w-full">
      <style>{`
        .roboxing-clerk-fill > * {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
      {children}
    </div>
  );
}
