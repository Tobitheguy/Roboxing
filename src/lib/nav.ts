export type NavItem = {
  href: string;
  label: string;
  /**
   * A hover/focus submenu, UFC-style. When present, `href` is still a real
   * destination — the parent is clickable and the children are shortcuts into
   * it, never a dead label that only opens a menu.
   */
  children?: NavItem[];
};

/**
 * Primary navigation.
 *
 * It was six, then four: a nav item is a promise, and Teams and Watch were
 * promising the thinnest pages on the site. The rule was that they rejoin the
 * header when their pages deserve it, and Watch now does — it carries 28
 * broadcast channels across nine leagues instead of one event reading
 * "Broadcast TBA".
 *
 * Teams stays out. It is still a list of names with little behind it.
 *
 * EVENTS IS ONE ITEM WITH TWO CHILDREN, NOT TWO ITEMS.
 *
 * Schedule and Results sat side by side in the header, which is how this site
 * thinks about them — one table of fixtures, one table of outcomes — and not
 * how a visitor does. They arrive wanting "events" and then decide whether
 * they mean the next one or the last one. UFC nests both under Events and
 * Tobias pointed at exactly that; it also takes the header from six items to
 * five, which is the reason the four-item rule existed in the first place.
 *
 * `/schedule` stays the parent's own destination. A parent that only opens a
 * menu is a trap on a touchscreen, where there is no hover.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/news", label: "News" },
  {
    href: "/schedule",
    label: "Events",
    children: [
      { href: "/schedule", label: "Upcoming" },
      { href: "/results", label: "Past" },
    ],
  },
  /*
   * Back in the header, and on different terms than last time.
   *
   * It was pulled because it promised "live events play here" on a site that
   * holds no broadcast rights and almost never carries the video -- a nav item
   * leading to a page that could not deliver. It is now a directory of where
   * somebody ELSE streams each league: CCTV-10 and CGTN for the Chinese
   * events, play.ufb.gg for UFB, Hero Esports' own YouTube for CyberHero.
   * Every row is a link. That is a question this site can actually answer,
   * and one a visitor genuinely arrives with.
   */
  { href: "/watch", label: "Watch" },
  { href: "/competitions", label: "Leagues" },
  /*
   * The fifth, and the only one that breaks the four-item rule above.
   *
   * Every other header item points at something to read. This one points at
   * something to do, and the thing it says is genuinely surprising: three of
   * the four active leagues will assign you a robot. A reader who bounces off
   * the news is a reader lost; a reader who finds out they could enter is the
   * one who comes back. It earns the slot the way Teams and Watch did not.
   */
  { href: "/get-in-the-ring", label: "Get in the ring" },
];

/**
 * The footer directory: everything, including what the header dropped.
 * A footer is an index, not a pitch — completeness is the point there.
 *
 * Flattened: the header's submenu is a header affordance, and a footer with
 * nested lists is a sitemap pretending to be navigation.
 */
export const FOOTER_ITEMS: NavItem[] = [
  { href: "/news", label: "News" },
  { href: "/schedule", label: "Schedule" },
  { href: "/results", label: "Results" },
  { href: "/watch", label: "Watch" },
  { href: "/competitions", label: "Leagues" },
  { href: "/get-in-the-ring", label: "Get in the ring" },
  { href: "/teams", label: "Teams" },
  { href: "/robots", label: "Machines" },
  { href: "/open-questions", label: "Open questions" },
  { href: "/context", label: "Context" },
];
