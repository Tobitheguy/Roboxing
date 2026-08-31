import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { AuthPitch } from "@/components/auth/auth-pitch";
import { authAppearance } from "@/components/auth/appearance";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  // Nothing behind this wall is indexable, and the sign-in screen itself has
  // no content worth ranking. Kept explicit so it survives a robots.txt edit.
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirect_url;
  const destination = safeRedirectPath(Array.isArray(raw) ? raw[0] : raw);

  // Everyone lands on /welcome first, which is where the second-factor check
  // and the hand-off animation live. Passing the destination through means a
  // deep link survives the whole detour.
  const afterAuth = `/welcome?redirect_url=${encodeURIComponent(destination)}`;

  return (
    <div className="grid w-full max-w-6xl gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-20">
      <AuthPitch
        eyebrow="Members only"
        headline={
          <>
            Every fight.
            <br />
            Every robot.
            <br />
            <span className="text-volt">One subscription.</span>
          </>
        }
        body="Live humanoid robot combat, the full archive on demand, league standings and every team roster. Sign in to watch."
      />

      <div className="w-full lg:w-[26rem]">
        <SignIn
          appearance={authAppearance}
          signUpUrl="/sign-up"
          forceRedirectUrl={afterAuth}
          signUpForceRedirectUrl={afterAuth}
        />

        {/* Clerk renders its own "Sign up" link, but it is small print at the
            bottom of a card. A new visitor who has never heard of Roboxing
            needs the second door to be as visible as the first. */}
        <div className="border-line bg-surface/60 mt-4 rounded-lg border p-4 text-center backdrop-blur-sm">
          <p className="text-ink-muted text-sm">New to Roboxing?</p>
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(destination)}`}
            className="text-volt hover:text-volt-dim focus-visible:ring-volt mt-1 inline-block rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Create an account
          </Link>
          <p className="text-ink-dim mt-1 text-xs">
            14 days free, then $9.99 a month. Cancel any time.
          </p>
        </div>
      </div>
    </div>
  );
}
