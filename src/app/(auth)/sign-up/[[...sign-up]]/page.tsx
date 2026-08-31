import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { AuthPitch } from "@/components/auth/auth-pitch";
import { authAppearance } from "@/components/auth/appearance";
import { isTwoFactorRequired } from "@/lib/auth";
import { PLAN } from "@/lib/plan";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirect_url;
  const destination = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
  const afterAuth = `/welcome?redirect_url=${encodeURIComponent(destination)}`;

  return (
    <div className="grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-20">
      <AuthPitch
        eyebrow={`${PLAN.trialDays} days free`}
        headline={
          <>
            Start
            <br />
            <span className="text-volt">watching.</span>
          </>
        }
        body={`Create an account to get every Roboxing event live and on demand. $${PLAN.monthlyPriceUsd} a month after the trial, cancel any time.`}
        points={[
          "Every live event, in full",
          "The complete archive, for as long as you subscribe",
          "League standings, team rosters and full fight history",
          // Only claimed when it is actually enforced. Promising a security
          // control the account does not get is the kind of copy that is
          // technically marketing and practically a lie.
          ...(isTwoFactorRequired()
            ? ["Secured with two-factor authentication"]
            : []),
        ]}
      />

      <div className="w-full lg:w-[26rem]">
        <SignUp
          appearance={authAppearance}
          signInUrl="/sign-in"
          forceRedirectUrl={afterAuth}
          signInForceRedirectUrl={afterAuth}
        />

        <div className="border-line bg-surface/60 mt-4 rounded-lg border p-4 text-center backdrop-blur-sm">
          <p className="text-ink-muted text-sm">Already have an account?</p>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(destination)}`}
            className="text-volt hover:text-volt-dim focus-visible:ring-volt mt-1 inline-block rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Sign in instead
          </Link>
          {/* Said here rather than discovered two screens later. Being asked
              for an authenticator app you have not installed, at the moment
              you thought you were finished, is where people give up. */}
          {isTwoFactorRequired() && (
            <p className="text-ink-dim mt-3 text-xs leading-relaxed">
              Roboxing requires two-factor authentication. After creating your
              account you will set up an authenticator app — it takes about a
              minute.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
