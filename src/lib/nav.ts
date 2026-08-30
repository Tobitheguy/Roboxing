export type NavItem = { href: string; label: string };

/**
 * Primary navigation. Defined once so the header, the footer, and any future
 * mobile menu cannot drift out of sync.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/watch", label: "Watch" },
  { href: "/competitions", label: "Competitions" },
  { href: "/teams", label: "Teams" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
];
