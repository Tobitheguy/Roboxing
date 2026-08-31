/**
 * What a Stripe secret key looks like.
 *
 * Deliberately NOT in stripe.ts: that file is `server-only`, and the setup
 * script has to answer the same question from Node. Two copies of "is this a
 * test key" is exactly how one of them ends up wrong — and it already did.
 *
 * Four shapes exist:
 *   sk_test_…  standard key, test mode
 *   sk_live_…  standard key, live mode        <- real money
 *   rk_test_…  RESTRICTED key, test mode
 *   rk_live_…  RESTRICTED key, live mode      <- real money
 *
 * A restricted key is the better one to deploy, because it can only do what it
 * was explicitly granted. Any check that matches on `sk_` alone silently
 * misreads it — the first version of this logic called `rk_test_` "LIVE".
 */

const KEY_SHAPE = /^(sk|rk)_(test|live)_/;

export function isValidStripeKeyShape(key: string | undefined): boolean {
  return KEY_SHAPE.test(key ?? "");
}

/** True only for a key we can positively identify as test mode. */
export function isTestStripeKey(key: string | undefined): boolean {
  const match = KEY_SHAPE.exec(key ?? "");
  return match?.[2] === "test";
}

/** True only for a key we can positively identify as live mode. */
export function isLiveStripeKey(key: string | undefined): boolean {
  const match = KEY_SHAPE.exec(key ?? "");
  return match?.[2] === "live";
}

export function isRestrictedStripeKey(key: string | undefined): boolean {
  return (key ?? "").startsWith("rk_");
}

/**
 * A human description that never asserts more than it knows.
 *
 * An unrecognised key is reported as unrecognised rather than defaulting to
 * "live" (alarming and wrong) or "test" (reassuring and wrong).
 */
export function describeStripeKey(key: string | undefined): string {
  if (!key) return "not set";
  if (!isValidStripeKeyShape(key)) return "unrecognised key format";
  const mode = isTestStripeKey(key) ? "TEST" : "LIVE";
  const kind = isRestrictedStripeKey(key) ? "restricted" : "standard";
  return `${mode} (${kind} key)`;
}
