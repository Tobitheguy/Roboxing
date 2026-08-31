import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppChrome } from "@/components/app-chrome";
import { HomeDashboard } from "@/components/home-dashboard";
import { Landing } from "@/components/marketing/landing";
import { ENROL_PATH, getViewer, isTwoFactorRequired } from "@/lib/auth";

/**
 * The front door — the only route with two faces.
 *
 * Signed out: a landing page that says what Roboxing is, names the next event
 * and the teams, shows the price, and asks you to sign up. Signed in: the
 * member home.
 *
 * It lives outside `(app)` for exactly one reason: the gate in that layout
 * would send signed-out visitors to a login form, and a login form is a bad
 * first thing to show someone who has never heard of the product. Every OTHER
 * route stays behind the gate. This is the shop window, not an open door.
 *
 * The member half runs the same checks the gate does, written out here rather
 * than inherited — which is the cost of moving this route out of the group,
 * and worth naming so nobody assumes it is protected by proximity.
 */
export const metadata: Metadata = {
  title: "Roboxing — Live humanoid robot combat",
  description:
    "Every Roboxing event live and on demand, plus league standings, team rosters and full fight history. 14 days free, then $9.99 a month.",
  // The one page that SHOULD be found. Everything else is disallowed in
  // robots.ts, because everything else is a redirect to a sign-in form.
  robots: { index: true, follow: true },
};

export default async function RootPage() {
  const viewer = await getViewer();

  if (!viewer) {
    return <Landing />;
  }

  if (isTwoFactorRequired() && !viewer.twoFactorEnabled) {
    redirect(`${ENROL_PATH}?redirect_url=%2F`);
  }

  return (
    <AppChrome>
      <HomeDashboard />
    </AppChrome>
  );
}
