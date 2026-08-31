import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WelcomeHandoff } from "@/components/auth/welcome-handoff";
import {
  ENROL_PATH,
  SIGN_IN_PATH,
  getViewer,
  isTwoFactorRequired,
} from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

/**
 * The hand-off between "signed in" and "inside".
 *
 * It does real work rather than only looking busy: this is where the account
 * row is created on first sight and where the second-factor requirement is
 * decided. Someone who has not enrolled goes to the enrolment screen; nobody
 * reaches the app without one.
 *
 * The animation covers the two navigations that follow. It is not a fake
 * progress bar — the screen leaves as soon as the client has the destination.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirect_url;
  const destination = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);

  const viewer = await getViewer();

  // Arriving here signed out means the session expired between the form and
  // this page, or someone opened the URL directly.
  if (!viewer) {
    redirect(
      `${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(destination)}`,
    );
  }

  if (isTwoFactorRequired() && !viewer.twoFactorEnabled) {
    redirect(`${ENROL_PATH}?redirect_url=${encodeURIComponent(destination)}`);
  }

  const firstName = viewer.displayName?.split(" ")[0] ?? null;

  return <WelcomeHandoff destination={destination} greeting={firstName} />;
}
