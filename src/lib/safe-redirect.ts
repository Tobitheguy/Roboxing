/**
 * Where a visitor may be sent after signing in.
 *
 * Every screen in the auth flow carries a `redirect_url` through, and that
 * parameter is attacker-controlled: anyone can send a Roboxing link with
 * `?redirect_url=` pointing anywhere. Handing it to a redirect unchecked turns
 * our own sign-in page into a credible launchpad for a phishing site — the
 * victim really did start on roboxing.tv, really did sign in, and only then
 * gets thrown somewhere else.
 *
 * So: same-site absolute paths only, and nothing that could be read as a host.
 *
 * Pure and exhaustively tested, because the failure is silent. An open
 * redirect looks exactly like a working redirect.
 */

/** Where to go when the request did not name somewhere valid. */
export const DEFAULT_DESTINATION = "/";

/**
 * Does this contain a C0 or C7 control character?
 *
 * Written as numeric comparisons rather than a regex range on purpose. The
 * regex spelling needs escape sequences, and the first version of this file
 * ended up with the raw bytes embedded in the source instead — which made the
 * file read as binary and matched the wrong class of character entirely.
 * Numbers cannot be mangled that way.
 *
 * They matter because a browser may strip a control character before parsing
 * a URL, so a value that satisfied every other check here can still resolve
 * somewhere else. A newline additionally splits the Location header.
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

/** Routes that would send someone back into the flow they just finished. */
const AUTH_PREFIXES = ["/sign-in", "/sign-up", "/welcome"];

export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_DESTINATION,
): string {
  if (typeof candidate !== "string") return fallback;

  const value = candidate.trim();
  if (value === "") return fallback;

  // Must be an absolute path on this site.
  if (!value.startsWith("/")) return fallback;

  // "//evil.com" and "/\evil.com" are protocol-relative URLs: the browser
  // reads what follows as a HOST, not as a path. The backslash counts because
  // browsers normalise it to a forward slash before parsing.
  if (value.length > 1 && (value[1] === "/" || value[1] === "\\")) {
    return fallback;
  }

  if (hasControlCharacter(value)) return fallback;

  for (const prefix of AUTH_PREFIXES) {
    if (value === prefix) return fallback;
    if (value.startsWith(`${prefix}/`)) return fallback;
    if (value.startsWith(`${prefix}?`)) return fallback;
  }

  return value;
}
