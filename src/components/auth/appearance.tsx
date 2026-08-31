import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

/**
 * Derived from the component that consumes it rather than imported by name.
 *
 * Core 3 deprecated `@clerk/types`, and the replacement path does not export
 * `Appearance`. Taking the type from `<SignIn>`'s own props means it is
 * correct by construction and survives Clerk moving the declaration again.
 */
type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

/**
 * How Clerk's forms sit inside the Roboxing auth screen.
 *
 * Empty, and that is the finding rather than an oversight.
 *
 * This started as a block of `elements` overrides — transparent card, display
 * font on the heading, no border — on the assumption that Clerk's class names
 * were still addressable. Checked against the deployed page: none of them
 * applied. The heading renders in the UI face, not the condensed display
 * face, and the card keeps its own surface. Core 3 changed the contract.
 *
 * What DOES work is the `variables` block on ClerkProvider in the root
 * layout: the accent, the surface colour and the radius all land, which is
 * why the form already matches the brand. So the overrides bought nothing and
 * cost a false impression that the styling was under our control.
 *
 * Deleted rather than left in place. Styling code that silently does nothing
 * is worse than none: the next person to change the look edits this file,
 * sees no effect, and starts debugging the wrong layer.
 *
 * If the card ever needs to lose its background, do it through `variables`
 * (`colorBackground`) or check Clerk's current appearance docs first — do not
 * reintroduce guesses at class names.
 */
export const authAppearance: Appearance = {};
