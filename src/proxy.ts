import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Request gate.
 *
 * Named `proxy` rather than `middleware` because Next 16 renamed the
 * convention. Clerk's handler works unchanged — it is an ordinary request
 * handler, and the proxy runtime is Node, which it needs.
 *
 * Roboxing is a public site with private corners, and this file is the
 * BLOCKLIST that names the corners.
 *
 * It used to be the reverse — an allowlist with `/` as the only entry, because
 * the site was built as a rights holder's subscription product where the
 * schedule itself was worth an account. That model does not survive contact
 * with the actual one: the audience arrives from a clip on TikTok or YouTube,
 * and a link that answers them with a sign-in form converts nobody. It also
 * left the site unindexable, which for a publication is most of the point.
 *
 * So: the CONTENT is open — schedule, events, results, standings, teams,
 * robots. The two things that are not are named below.
 *
 * The inversion costs a real safety property and it is worth being explicit
 * about which. Under the allowlist, a route added tomorrow was private by
 * default and the worst case was a page nobody could reach. Under a blocklist
 * the worst case is a page everyone can reach. That is the correct default for
 * every page this site will grow — a publication's pages are meant to be read
 * — but it is NOT the correct default for anything handling money, identity or
 * a broadcast credential. Those do not rely on this file at all:
 *
 *   - `/admin/*` re-checks the ADMIN_EMAILS allowlist in its own layout, and
 *     `requireAdmin()` re-checks it in every API handler.
 *   - `/account/*` gates in its own layout.
 *   - Video playback is gated per event by `checkEventAccess()`, at the point
 *     the URL is minted rather than at the point it is displayed.
 *
 * Layers that fail differently: a matcher typo here is caught by the handler,
 * a forgotten check in a handler is caught here. That property is unchanged.
 */

/**
 * Everything that still requires a session.
 *
 * Note what is NOT here: `/watch/*` and `/events/*`. The page is public — it
 * has a card, results and a countdown that anyone should be able to read and
 * link to. Only the video itself is entitled, and that decision is made in
 * `resolvePlayback()` where it can distinguish "sign in" from "subscribe".
 * Gating the whole page here would have hidden the free half too.
 */
const isPrivateRoute = createRouteMatcher([
  "/admin(.*)",
  "/account(.*)",
  "/api/admin(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

/**
 * The commerce pages.
 *
 * Closed while PAYWALL_ENABLED is off, which is the normal state: Roboxing
 * holds no broadcast rights, so there is nothing to sell and a pricing page is
 * an offer we cannot honour. Handled here rather than with a guard at the top
 * of each page because this one matcher covers `/subscribe`, its checkout and
 * success steps, and `/plans` — and a fifth commerce page added later is
 * covered by where it lives rather than by someone remembering.
 *
 * They redirect rather than 404: these URLs appear in old emails and in
 * Stripe's return path, and "this does not exist" is a worse answer than
 * putting someone on the home page.
 *
 * The pages themselves are untouched and still work. Flip the flag the day
 * there is a broadcast to sell.
 */
const isCommerceRoute = createRouteMatcher(["/subscribe(.*)", "/plans(.*)"]);

function isPaywallEnabled() {
  return process.env.PAYWALL_ENABLED === "true";
}

export default clerkMiddleware(async (auth, request) => {
  if (isCommerceRoute(request) && !isPaywallEnabled()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPrivateRoute(request)) return;

  const { userId } = await auth();
  if (userId) return;

  // Deliberately NOT auth.protect(). That rewrites to the not-found page,
  // which hides the route but answers an API client with HTTP 200 and a page
  // of HTML — a status that says "fine" for a request that was refused. Any
  // caller checking `response.ok` would treat the refusal as success.
  if (isApiRoute(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A browser gets sent somewhere useful, with a way back to where it was
  // heading. The destination is re-validated by safeRedirectPath() on the
  // sign-in page before anything is done with it — this value arrives from
  // the request and is not trusted just because we wrote it.
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set(
    "redirect_url",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(signIn);
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, so the auth context
    // is available to any page that wants to know who is watching.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
