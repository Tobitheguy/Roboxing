import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The way back up.
 *
 * Every detail page gets one, pointing at ITS OWN index — not a
 * history-back button. `router.back()` depends on how you arrived: from a
 * Google result or a shared link it would bounce you out of the site
 * entirely, and most readers here arrive exactly that way. A static link to
 * the section index is the same for everyone and doubles as orientation:
 * it tells you where you are by naming where up is.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-ink-muted hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}
