import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { AuthCard } from "@/components/auth/auth-card";
import { ChosenPlan } from "@/components/auth/chosen-plan";
import { ClerkFill } from "@/components/auth/clerk-fill";
import { authAppearance } from "@/components/auth/appearance";
import { isTwoFactorRequired } from "@/lib/auth";
import { intervalFromPath } from "@/lib/plan";
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
  const interval = intervalFromPath(destination);
  const afterAuth = `/welcome?redirect_url=${encodeURIComponent(destination)}`;

  return (
    <AuthCard
      step={interval ? 2 : undefined}
      title="Create your account"
      subtitle={
        interval
          ? "One more step, then payment. You will not be charged today."
          : "Every Roboxing event, live and on demand."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(destination)}`}
            className="text-volt font-semibold underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      {interval ? (
        <div className="mb-6">
          <ChosenPlan interval={interval} />
        </div>
      ) : null}

      <ClerkFill>
        <SignUp
          appearance={authAppearance}
          signInUrl={`/sign-in?redirect_url=${encodeURIComponent(destination)}`}
          forceRedirectUrl={afterAuth}
          signInForceRedirectUrl={afterAuth}
        />
      </ClerkFill>

      {/* Said here rather than discovered two screens later. Being asked for
          an authenticator app you have not installed, at the moment you
          thought you were finished, is where people give up. Only claimed when
          it is actually enforced. */}
      {isTwoFactorRequired() ? (
        <p className="text-ink-dim mt-4 text-center text-xs leading-relaxed">
          Roboxing requires two-factor authentication. After creating your
          account you will set up an authenticator app — about a minute.
        </p>
      ) : null}
    </AuthCard>
  );
}
