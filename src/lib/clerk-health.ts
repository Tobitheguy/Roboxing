/**
 * Which Clerk instance is this deployment talking to?
 *
 * WHY A CHECK AND NOT A COMMENT.
 *
 * roboxing.tv served a sign-in form with "Development mode" printed under it
 * in orange for days, and nothing in the codebase or the deployment said so.
 * The key is the only evidence: Clerk formats production publishable keys
 * `pk_live_` and development ones `pk_test_`, so the instance type is
 * knowable without an API call — but only if something looks.
 *
 * The failure mode is specific and quiet. Development keys work: people sign
 * in, sessions persist, nothing errors. What they also do is advertise the
 * site as unfinished to every visitor who reaches the form, on a site whose
 * entire proposition is being the reliable record.
 *
 * Reads the PUBLISHABLE key, which is public by design — it ships to every
 * browser. The secret key is never read here, and its prefix would tell us
 * nothing the publishable one does not.
 */
export type ClerkHealth = {
  /** A publishable key is present at all. */
  configured: boolean;
  /** `pk_live_` rather than `pk_test_`. */
  production: boolean;
  /** What to do about it, or null when nothing. */
  problem: string | null;
};

export function checkClerk(): ClerkHealth {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!key) {
    return {
      configured: false,
      production: false,
      problem: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set — nobody can sign in.",
    };
  }

  if (key.startsWith("pk_live_")) {
    return { configured: true, production: true, problem: null };
  }

  if (key.startsWith("pk_test_")) {
    return {
      configured: true,
      production: false,
      problem:
        "This is a DEVELOPMENT instance. Clerk prints \"Development mode\" under the sign-in form, and the shared OAuth credentials it uses for \"Continue with Google\" are Clerk\'s own and not meant for a live site. Create a production instance, set its DNS records, supply your own Google OAuth credentials, then swap both keys here and redeploy.",
    };
  }

  return {
    configured: true,
    production: false,
    problem: `The publishable key does not start with pk_live_ or pk_test_ (${key.slice(0, 8)}…). Clerk may have changed its key format.`,
  };
}
