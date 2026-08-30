import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Request gate.
 *
 * Named `proxy` rather than `middleware` because Next 16 renamed the
 * convention. Clerk's handler works unchanged — it is an ordinary request
 * handler, and the proxy runtime is Node, which it needs.
 *
 * This layer only establishes that an administrator is SIGNED IN. Whether that
 * person is on the admin allowlist is checked again by requireAdmin() in every
 * route and page, because the allowlist lives in an environment variable that
 * this layer would have to fetch a Clerk user to compare against — a network
 * call on every admin request, to duplicate a check the handler does anyway.
 *
 * Two layers that fail differently: a matcher typo here is caught by the
 * handler, a forgotten check in a handler is caught here.
 */
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isAdminRoute(request)) return;

  // Redirects a browser to sign-in; returns 401 for an API request. Clerk
  // picks the right one from the Accept header.
  await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, so the auth context
    // is available to any page that wants to know who is watching.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
