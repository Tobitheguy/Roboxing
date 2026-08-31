import Link from "next/link";
import { connection } from "next/server";
import { UserButton } from "@clerk/nextjs";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { rethrowControlFlow } from "@/lib/next-errors";

/**
 * Sign-in state in the header.
 *
 * Branches on the server rather than with Clerk's <SignedIn>/<SignedOut>
 * components — those were removed in @clerk/nextjs Core 3, and this component
 * already has to load the viewer to know whether to show the admin link, so
 * asking twice would be wasteful anyway.
 *
 * The signed-out branch should now be unreachable — this header only renders
 * inside `(app)`, which the gate guards. It is kept as a fallback for the one
 * case that can still produce it: getViewer() throwing, below. Rendering a
 * sign-in link then is the safe direction, and it is a link rather than a
 * silent empty slot so the person can act on it.
 *
 * The admin link appears only for administrators. That is a convenience, not a
 * security boundary — /admin is gated by the proxy and again by requireAdmin(),
 * and hiding a link protects nothing on its own.
 */
export async function ViewerMenu() {
  // Request-time, not build-time. Clerk reads headers, and without this Next
  // tries to prerender the header and signals that by throwing — which the
  // catch below would otherwise mistake for a failure and render everyone as
  // signed out, on every page.
  await connection();

  // A Clerk or database hiccup must not take the header down with it. Falling
  // back to the signed-out state is the safe direction: it offers a sign-in
  // link rather than implying access that may not exist.
  let viewer;
  try {
    viewer = await getViewer();
  } catch (error) {
    rethrowControlFlow(error);
    console.error("[ViewerMenu] could not resolve viewer:", error);
    viewer = null;
  }

  if (!viewer) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {viewer.isAdmin ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/admin">Admin</Link>
        </Button>
      ) : null}
      {/* Where signing out lands is set once on ClerkProvider — in Core 3 it
          is an instance option rather than a prop here, which is better: it
          holds for every route out of a session, not just this button. */}
      <UserButton appearance={{ elements: { avatarBox: "size-8" } }}>
        {/* Billing belongs in the account menu, next to profile and sign-out,
            because that is where someone looks for it. Clerk owns the profile;
            the money is ours, so it is a link out rather than a Clerk page. */}
        <UserButton.MenuItems>
          <UserButton.Link
            label="Billing"
            labelIcon={<CreditCard className="size-4" />}
            href="/account/billing"
          />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
