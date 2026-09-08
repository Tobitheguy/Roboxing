export type NavItem = { href: string; label: string };

/**
 * Primary navigation: FOUR items, deliberately.
 *
 * It was six, and two of them (Teams, Watch) led to the thinnest pages on the
 * site — a nav item is a promise, and promising your weakest content in the
 * header is how a first visit ends. UFC runs four content items with far more
 * inventory than this site has. Teams and Watch stay reachable through the
 * footer, league pages and the event strip; they rejoin the header when their
 * pages deserve it.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/news", label: "News" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/competitions", label: "Leagues" },
];

/**
 * The footer directory: everything, including what the header dropped.
 * A footer is an index, not a pitch — completeness is the point there.
 */
export const FOOTER_ITEMS: NavItem[] = [
  ...NAV_ITEMS,
  { href: "/watch", label: "Where to watch" },
  { href: "/teams", label: "Teams" },
  { href: "/robots", label: "Machines" },
];
