import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Request gate.
 *
 * Named `proxy` rather than `middleware` because Next 16 renamed the
 * convention. Clerk's handler works unchanged — it is an ordinary request
 * handler, and the proxy runtime is Node, which it needs.
 *
 * Roboxing is closed: every route requires an account. So this file is an
 * ALLOWLIST, not a blocklist. The difference matters — with a blocklist, a
 * route added tomorrow is public until someone remembers to list it, and the
 * person who would notice is the one who cannot see the problem because they
 * are signed in.
 *
 * This layer establishes only that someone is SIGNED IN. Two further checks
 * live deeper, where they can be made without a network call per request:
 *
 *   - the second factor, in `(app)/layout.tsx` and `requireViewer()`
 *   - the admin allowlist, in `requireAdmin()`
 *
 * Layers that fail differently: a matcher typo here is caught by the handler,
 * a forgotten check in a handler is caught here.
 */

/**
 * The only routes reachable without a session.
 *
 * `/api/stripe/webhook` is the one that must never be removed from this list.
 * Stripe is not a signed-in browser — redirect it and every subscription
 * event silently stops arriving. Nobody would see an error; entitlements
 * would simply stop being written, and the first sign would be a paying
 * customer who cannot watch.
 *
 * `/welcome` is here because it is where an account WITHOUT a second factor
 * goes to get one. Behind the gate it enforces, enrolling would require
 * having already enrolled.
 */
const isPublicRoute = createRouteMatcher([
  // The landing page, and ONLY the landing page — this pattern is an exact
  // match, so `/schedule` and everything else still requires an account. It
  // is the shop window: it names the next event, the teams and the price, and
  // shows no standings, no results and no video.
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/welcome(.*)",
  "/api/stripe/webhook",
  "/robots.txt",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

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
