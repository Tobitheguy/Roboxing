import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Request gate.
 *
 * Named `proxy` rather than `middleware` because Next 16 renamed the
 * convention. Clerk's handler works unchanged — it is an ordinary request
 * handler, and the proxy runtime is Node, which it needs.
 *
 * This layer only establishes that someone is SIGNED IN. Whether they are on
 * the admin allowlist is checked again by requireAdmin() in every route and
 * page, because the allowlist lives in an environment variable this layer
 * would have to fetch a Clerk user to compare against — a network call on
 * every admin request, duplicating a check the handler does anyway.
 *
 * Two layers that fail differently: a matcher typo here is caught by the
 * handler, a forgotten check in a handler is caught here.
 */
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isAdminRoute(request)) return;

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
  // heading. `redirect_url` is Clerk's own parameter and it validates the
  // destination, so this cannot become an open redirect.
  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("redirect_url", request.nextUrl.pathname);
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
