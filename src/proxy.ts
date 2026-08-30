import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-tokens";

/**
 * Gate for everything under /admin and /api/admin.
 *
 * Named `proxy` rather than `middleware`: Next 16 renamed the convention, and
 * the proxy runtime is Node, which this needs — the session check uses
 * node:crypto for a constant-time HMAC comparison.
 *
 * This is the SECOND of two independent layers. Every /api/admin route also
 * calls requireAdmin() itself. That redundancy is deliberate: a single missed
 * check on a single route is the entire breach, and these two layers fail in
 * different ways — a matcher typo here is caught by the route, a forgotten
 * guard in a route is caught here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page itself must stay reachable, or there is no way in.
  if (pathname === "/admin/login") return NextResponse.next();

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  // Send them back where they were headed after signing in — but only ever to
  // a path on this site. An open redirect here would turn the login page into
  // a phishing tool that borrows Roboxing's domain.
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
