import { AppChrome } from "@/components/app-chrome";
import { requireVerifiedViewer } from "@/lib/auth";

/**
 * Everything behind the wall.
 *
 * The gate is here, in the layout, rather than repeated in each page — so a
 * page added tomorrow is protected by where it lives. The failure mode of the
 * alternative is a page that renders fine for its author, who is signed in,
 * and leaks to everyone else.
 *
 * `/` is the one route NOT in this group: it has to answer signed-out
 * visitors with a landing page. It runs the same gate itself, for its member
 * half only.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireVerifiedViewer();

  return <AppChrome>{children}</AppChrome>;
}
