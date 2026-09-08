import type { Metadata } from "next";

import { AppChrome } from "@/components/app-chrome";
import { HomeDashboard } from "@/components/home-dashboard";

/**
 * The front door.
 *
 * It used to have two faces — a marketing landing page for signed-out
 * visitors, the member home for everyone else — and that split died with the
 * login wall. It was right for a subscription product whose content was behind
 * a gate: show the shop window, ask for the sale. It is wrong now for a
 * straightforward reason: almost everyone arriving here came from a clip on
 * somebody else's platform, and answering them with a pitch for a $9.99
 * subscription to a service that holds no broadcast rights is both a bad offer
 * and a lie about what the site is.
 *
 * So everyone gets the same page, because the content IS the pitch. The asks
 * are the mailing list in the footer and the prediction game on each event —
 * both free, both reversible, both things a stranger will actually do.
 *
 * `src/components/marketing/landing.tsx` is no longer routed to. It is left in
 * place rather than deleted because most of it is the right raw material for
 * an /about page, which this site will want once someone asks "who is behind
 * this" — and that is a real question for a one-person outlet covering a sport
 * nobody knows.
 */
export const metadata: Metadata = {
  title: "Roboxing — Humanoid robot fighting",
  description:
    "The English-language record of humanoid robot fighting. Every league, every event, full cards, results and standings — URKL, CyberHero, the World Humanoid Robot Games and more.",
  robots: { index: true, follow: true },
};

export default function RootPage() {
  return (
    <AppChrome>
      <HomeDashboard />
    </AppChrome>
  );
}
