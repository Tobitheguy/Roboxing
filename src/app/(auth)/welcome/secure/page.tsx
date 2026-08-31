import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { SIGN_IN_PATH, getViewer } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Secure your account",
  robots: { index: false, follow: false },
};

/**
 * The only route a signed-in account without a second factor may reach.
 *
 * It sits in `(auth)`, outside the gate, which is what makes the gate
 * possible: if this page were behind the same check it enforces, enrolling
 * would require already having enrolled.
 */
export default async function SecureAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirect_url;
  const destination = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);

  const viewer = await getViewer();
  if (!viewer) {
    redirect(`${SIGN_IN_PATH}?redirect_url=${encodeURIComponent(destination)}`);
  }

  // Already done. Sending them through setup again would offer to replace a
  // working authenticator, which is a good way to lock someone out.
  if (viewer.twoFactorEnabled) {
    redirect(`/welcome?redirect_url=${encodeURIComponent(destination)}`);
  }

  return <TwoFactorSetup destination={destination} />;
}
