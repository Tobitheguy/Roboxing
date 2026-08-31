import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Localization = NonNullable<
  ComponentProps<typeof ClerkProvider>["localization"]
>;

/**
 * Say "Roboxing" where Clerk would say the application name.
 *
 * The name Clerk holds for this instance is `clerk-cyan-drum` — auto-generated
 * when the integration provisioned it — and it appears in the largest text on
 * the sign-in screen. Every visitor reads it.
 *
 * The proper fix is renaming the application in the Clerk dashboard. That is
 * not reachable from here: the Backend API accepted `PATCH /v1/instance` with
 * both `{name}` and `{application_name}`, answered 204 twice, and changed
 * nothing. Reading the value back afterwards is the only reason that is known
 * rather than assumed — a 204 with no effect looks exactly like success.
 *
 * So these strings are overridden in the client instead. Clerk interpolates
 * `{{applicationName}}` into them; replacing the whole string removes the
 * placeholder along with the wrong value.
 *
 * This covers the screens in our flow, verified against the deployed pages
 * rather than against a list of keys. It does NOT cover:
 *
 *   - the "Secured by Clerk" badge, which needs `branded: false` (paid plan)
 *   - the "Development mode" notice, which needs a production instance
 *   - transactional emails, whose sender and subject come from the instance
 *
 * Renaming the application in the dashboard makes this file redundant. That is
 * the point: it is a patch over a setting, and it should be deleted the day
 * the setting is right.
 */
/**
 * Clerk's card prints its own title and subtitle above the fields. Our page
 * already prints one, in the display face, matching step 1 of the funnel — so
 * Clerk's is the second heading saying the same thing, in a different type.
 *
 * Blanked rather than restyled: the page owns the heading, the card owns the
 * form. Empty strings collapse the elements to nothing without depending on a
 * Clerk class name surviving an upgrade.
 */
const NO_HEADING = { title: " ", subtitle: " " };

export const roboxingLocalization: Localization = {
  signIn: {
    start: NO_HEADING,
    password: {
      title: "Enter your password",
      subtitle: "Enter the password for your Roboxing account",
    },
    emailCode: {
      title: "Check your email",
      subtitle: "Enter the code we sent you to sign in to Roboxing",
    },
    alternativeMethods: {
      subtitle: "Having trouble? Use another way to sign in to Roboxing.",
    },
    forgotPasswordAlternativeMethods: {
      title: "Reset your password",
    },
  },
  signUp: {
    start: NO_HEADING,
    emailCode: {
      title: "Check your email",
      subtitle: "Enter the code we sent you to finish creating your account",
    },
    continue: {
      title: "Almost there",
      subtitle: "Fill in the remaining details to finish signing up",
    },
  },
};
