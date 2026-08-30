/**
 * Constrain a post-login redirect to a path on this site.
 *
 * `next` arrives from the query string, so without this the login page becomes
 * an open redirect — a phishing flow that borrows Roboxing's domain and its
 * credibility to send someone somewhere else after they type a password.
 *
 * The case a naive `startsWith("/")` misses is the protocol-relative URL:
 * `//evil.com` is a path by that test and an absolute URL to the browser.
 *
 * Applied both when rendering the form and again when acting on the submitted
 * value. The second is the one that matters — a form field is client-supplied
 * regardless of what was rendered — but sanitising at render keeps a hostile
 * value from ever appearing in the page at all.
 */
export function safeNextPath(next: string | undefined | null): string {
  if (!next) return "/admin";
  if (!next.startsWith("/")) return "/admin";
  // Protocol-relative (`//host`) and backslash variants browsers normalise.
  if (next.startsWith("//") || next.startsWith("/\\")) return "/admin";
  return next;
}
