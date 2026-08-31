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
 * Deliberately a short list. Every override here is a bet that a Clerk class
 * name stays put across upgrades, so this restyles the container and leaves
 * the internals — inputs, buttons, error states — to the dark theme already
 * configured on ClerkProvider. A sign-in form that is 90% themed and correct
 * beats one that is 100% themed until the next release.
 *
 * The card loses its own background and border because the page already
 * provides a surface; two nested cards look like a modal that failed to open.
 */
export const authAppearance: Appearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent shadow-none border-0 px-0",
    header: "text-left",
    headerTitle: "font-display text-2xl tracking-tight",
    headerSubtitle: "text-sm",
    // Clerk's footer carries the "already have an account" / "sign up"
    // cross-link. Kept, but quiet — the page renders a louder one of its own.
    footer: "bg-transparent",
    footerAction: "bg-transparent",
  },
};
