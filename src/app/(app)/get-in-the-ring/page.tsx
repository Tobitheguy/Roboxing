import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { Card, CardBody } from "@/components/card";
import { PageHeading, PageShell } from "@/components/page-shell";
import { getEntryRoutes } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Get in the ring",
  description:
    "How to enter humanoid robot fighting. One tile per league, with the link.",
};

/**
 * How to enter. One tile per league, and nothing else.
 *
 * This page has now been cut twice, and the second cut was the real one. It had
 * a cost table, a three-part explainer on what a pilot does, an FCC note, a
 * barriers section and per-role cards — all true, all sourced, and collectively
 * a wall a reader has to work through to reach the one thing they came for,
 * which is a link.
 *
 * The remaining job is: name the league, say in a few words what you would be
 * doing there, flag whether they hand you a machine, and get out of the way.
 * Everything that was removed still exists where it belongs — prices on the
 * Machines pages, regulation on /context, full entry detail on each league page.
 *
 * Every word on a tile comes from the database. There is no prose in this file
 * on purpose: copy written here is copy that cannot be corrected when a season
 * changes its entry address.
 */
export default async function GetInTheRingPage() {
  const routes = await getEntryRoutes();

  // One tile per league, preserving the query's hardware-provided-first order
  // so the leagues that lend you a robot come first.
  const byLeague = new Map<string, typeof routes>();
  for (const row of routes) {
    const list = byLeague.get(row.competitionSlug) ?? [];
    list.push(row);
    byLeague.set(row.competitionSlug, list);
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="For competitors"
        title="Get in the ring"
        description="Three of these four leagues will assign you a robot."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...byLeague.values()].map((group) => {
          const { competitionSlug, competitionName, competitionCountry } =
            group[0];
          const suppliesRobot = group.some((r) => r.route.hardwareProvided);
          // First link or address the league published. One per tile.
          const link = group.find((r) => r.route.url)?.route.url;
          const contact = group.find((r) => r.route.contact)?.route.contact;

          return (
            <Card key={competitionSlug} className="flex flex-col">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div>
                  <Link
                    href={`/competitions/${competitionSlug}`}
                    className="font-display text-ink hover:text-volt text-sm font-semibold uppercase transition-colors"
                  >
                    {competitionName}
                  </Link>
                  {competitionCountry ? (
                    <span className="text-ink-dim ml-2 text-xs">
                      {competitionCountry}
                    </span>
                  ) : null}
                </div>

                {/* What you would be doing, which is just the role names. */}
                <p className="text-ink-muted text-sm leading-relaxed">
                  {group.map((r) => r.route.role).join(" · ")}
                </p>

                {suppliesRobot ? (
                  <p className="text-volt flex items-center gap-1.5 text-xs font-semibold">
                    <Check className="size-3.5 shrink-0" />
                    Robot supplied
                  </p>
                ) : null}

                {/* Pushed to the bottom so the links line up across the row. */}
                <div className="mt-auto pt-1">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-volt inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
                    >
                      {new URL(link).hostname.replace(/^www\./, "")}
                      <ArrowUpRight className="size-3" />
                    </a>
                  ) : contact ? (
                    <code className="text-ink-muted text-xs break-all">
                      {contact}
                    </code>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* One line out, for the reader who wants the detail that used to be
          dumped on this page. */}
      <p className="text-ink-dim mt-8 text-xs">
        Full entry terms, prizes and deadlines are on each league&rsquo;s page.
        Machine prices are on{" "}
        <Link href="/robots" className="hover:text-ink underline underline-offset-2">
          Machines
        </Link>
        ; import and authorization rules are on{" "}
        <Link href="/context" className="hover:text-ink underline underline-offset-2">
          Context
        </Link>
        .
      </p>
    </PageShell>
  );
}
