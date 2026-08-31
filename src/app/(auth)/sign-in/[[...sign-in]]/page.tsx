import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { AuthCard } from "@/components/auth/auth-card";
import { ChosenPlan } from "@/components/auth/chosen-plan";
import { authAppearance } from "@/components/auth/appearance";
import { intervalFromPath } from "@/lib/plan";
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

  // Sign-in is reached two ways, and they are different journeys. Mid-subscribe
  // it is step 2 of 2 and the chosen plan should still be on screen. Reached
  // directly by a returning viewer, counting steps would invent a journey they
  // are not on.
  const interval = intervalFromPath(destination);

  // Everyone lands on /welcome first, which is where the second-factor check
  // and the hand-off animation live. Passing the destination through means a
  // deep link — or a chosen plan — survives the whole detour.
  const afterAuth = `/welcome?redirect_url=${encodeURIComponent(destination)}`;

  return (
    <AuthCard
      step={interval ? 2 : undefined}
      title={interval ? "Sign in to continue" : "Sign in"}
      subtitle={
        interval
          ? "Sign in and we will take you straight to payment."
          : "Welcome back."
      }
      footer={
        <>
          New to Roboxing?{" "}
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(destination)}`}
            className="text-volt font-semibold underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      {interval ? (
        <div className="mb-6">
          <ChosenPlan interval={interval} />
        </div>
      ) : null}

      {/* Clerk's card has its own narrower max-width, which left it out of
          line with everything else in the funnel. Forced to fill the column
          by targeting the child ELEMENT rather than a Clerk class name — the
          structure is stable across upgrades, the class names are not. */}
      <div className="[&>*]:w-full">
        <SignIn
          appearance={authAppearance}
          signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(destination)}`}
          forceRedirectUrl={afterAuth}
          signUpForceRedirectUrl={afterAuth}
        />
      </div>
    </AuthCard>
  );
}
