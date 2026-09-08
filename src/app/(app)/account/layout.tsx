import { requireVerifiedViewer } from "@/lib/auth";

/**
 * The gate on everything about a person's own account.
 *
 * Exists because the site around it went public. When `(app)/layout.tsx` held
 * the gate, billing inherited it; now that the schedule and the results are
 * readable by anyone, the subtree that shows someone their subscription and
 * their invoices has to say so itself.
 *
 * In the layout rather than in the page, so an account page added tomorrow is
 * protected by where it lives. That was the reasoning behind the original
 * site-wide gate and it is still right — the scope it applies to is what
 * changed, not the principle.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVerifiedViewer("/account/billing");

  return <>{children}</>;
}
