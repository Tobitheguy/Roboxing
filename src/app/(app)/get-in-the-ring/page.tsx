import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Mail, X } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody, CardHeader } from "@/components/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { PageHeading, PageShell } from "@/components/page-shell";
import { formatUsd } from "@/lib/format";
import { getEntryRoutes, getMachines } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Get in the ring",
  description:
    "How to actually enter humanoid robot fighting. Three of the four active leagues will give you a robot for free.",
};

/**
 * The page that answers "could I do this?"
 *
 * Every other page here reports on the sport. This one asks the reader to join
 * it, and it exists because the answer is genuinely surprising: three of the
 * four active leagues hand you a machine.
 *
 * WHY IT IS SHAPED LIKE THIS
 * --------------------------
 * The first version was one card per ROUTE, which meant UFB appeared twice and
 * CMG twice, each repeating the league name, the prize and the same barriers —
 * and then a separate section listed the barriers again. Six cards for four
 * leagues, with the important line ("they give you the robot") buried under a
 * deadline field that mostly says "none published".
 *
 * Now: one card per LEAGUE, roles as rows inside it, the hardware answer as the
 * headline of each card, and barriers stated once — on the league they belong
 * to. Everything a reader can act on is in the first screen; the cost table is
 * for the minority who want to own a machine rather than be lent one.
 */
export default async function GetInTheRingPage() {
  const [routes, machines] = await Promise.all([
    getEntryRoutes(),
    getMachines(),
  ]);

  // Group by league, preserving the hardware-provided-first order the query
  // already applied — so the leagues that lend you a robot lead the page.
  const byLeague = new Map<string, typeof routes>();
  for (const row of routes) {
    const list = byLeague.get(row.competitionSlug) ?? [];
    list.push(row);
    byLeague.set(row.competitionSlug, list);
  }
  const leagues = [...byLeague.values()];

  // What it costs if you do want to own one. Cheapest first: the useful fact is
  // the floor, not the ceiling.
  const forSale = machines
    .filter((m) => m.robot.priceUsd !== null)
    .sort((a, b) => (a.robot.priceUsd ?? 0) - (b.robot.priceUsd ?? 0));

  return (
    <PageShell>
      <PageHeading
        eyebrow="For competitors"
        title="Get in the ring"
        description="You do not need to buy a robot. UFB assigns every Season 2 team a Unitree G1, URKL gives every entrant an identical T800 and lets the top sixteen keep it, and China Media Group runs a whole entry track for people with no machine at all. The hardware is the part that has been solved — the access is not."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {leagues.map((group) => (
          <LeagueCard key={group[0].competitionSlug} group={group} />
        ))}
      </div>

      {/* ---- What the job is --------------------------------------------- */}
      <Card className="mt-10">
        <CardHeader title="What you'd actually be doing" />
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-3">
            <Job term="Driving">
              Almost every bout is remote-piloted. UFB uses standard game
              controllers and supports piloting from a browser. Iron Fist
              King&rsquo;s robots moved on motion capture taken from
              professional kickboxers, driven live by an operator.
            </Job>
            <Job term="Building the stack">
              URKL is built entirely around this: identical hardware for every
              team, so the only thing you compete on is the algorithm. UFB calls
              the role a Ghost.
            </Job>
            <Job term="Repairing, mid-fight">
              At CyberHero&rsquo;s Riyadh event, mechanics fixed damaged
              machines in a pit between rounds using telemetry. It is the most
              sports-shaped thing about the format.
            </Job>
          </dl>
        </CardBody>
      </Card>

      {/* ---- Buying ------------------------------------------------------- */}
      {forSale.length > 0 ? (
        <>
          <h2 className="font-display text-title text-ink mt-12 mb-2 uppercase">
            If you do want to own one
          </h2>
          <p className="text-ink-muted mb-4 max-w-2xl text-sm leading-relaxed">
            List prices where they are published. A fighting machine is a
            consumable — the US vendor for the combat-edition G1 ships it with a
            repair subsidy instead of a warranty, which tells you most of what
            you need to know.
          </p>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-line text-ink-dim border-b text-left text-xs uppercase">
                    <th className="px-4 py-3 font-semibold sm:px-6">Machine</th>
                    <th className="px-4 py-3 font-semibold">Maker</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {forSale.map(({ robot, makerName }) => (
                    <tr
                      key={robot.id}
                      className="border-line/60 border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 sm:px-6">
                        <Link
                          href={`/robots/${robot.slug}`}
                          className="text-ink hover:text-volt font-semibold transition-colors"
                        >
                          {robot.name}
                        </Link>
                        {robot.class === "piloted_mech" ? (
                          <Badge variant="outline" size="sm" className="ml-2">
                            Piloted mech
                          </Badge>
                        ) : null}
                        {/* The caveat sits under the name rather than in its
                            own column — it is a footnote about the number, and
                            a fourth column made the table scroll on a phone. */}
                        {robot.priceNote ? (
                          <p className="text-ink-dim mt-0.5 text-xs">
                            {robot.priceNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="text-ink-muted px-4 py-3 align-top">
                        {makerName ?? "—"}
                      </td>
                      <td className="text-ink tabular px-4 py-3 text-right align-top font-semibold sm:px-6">
                        {formatUsd(robot.priceUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* The one barrier that is not any single league's: importing. */}
          <p className="text-ink-muted mt-4 max-w-3xl text-sm leading-relaxed">
            Before you buy: the FCC added foreign-produced advanced robotic
            devices to its Covered List in July 2026. Existing authorizations
            were not revoked and used units are unaffected, but future models
            are exposed — and EngineAI&rsquo;s T800 reportedly had no FCC
            equipment authorization on record as of August 2026.{" "}
            <Link
              href="/context"
              className="text-volt underline underline-offset-2"
            >
              The full position is on the context page.
            </Link>
          </p>
        </>
      ) : null}

      <p className="text-ink-dim mt-10 max-w-3xl text-xs leading-relaxed">
        Entry addresses, prize pools and deadlines change between seasons. Every
        route here carries the confidence we have in it. If you find something
        out of date, that is worth more to us than almost anything else on the
        site.
      </p>
    </PageShell>
  );
}

function LeagueCard({
  group,
}: {
  group: Awaited<ReturnType<typeof getEntryRoutes>>;
}) {
  const { competitionSlug, competitionName, competitionCountry } = group[0];
  const suppliesRobot = group.some((r) => r.route.hardwareProvided);

  // The hardware note is the same across a league's roles, so it is printed
  // once at the top rather than repeated under every role.
  const hardwareNote = group.find((r) => r.route.hardwareNote)?.route
    .hardwareNote;
  const prize = group.find((r) => r.route.prize)?.route.prize;
  const deadline = group.find((r) => r.route.deadline)?.route.deadline;
  const barriers = group.find((r) => r.route.barriers)?.route.barriers;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href={`/competitions/${competitionSlug}`}
              className="hover:text-volt transition-colors"
            >
              {competitionName}
            </Link>
            {competitionCountry ? (
              <span className="text-ink-dim text-xs font-normal">
                {competitionCountry}
              </span>
            ) : null}
          </span>
        }
        action={<ConfidenceBadge level={group[0].route.confidence} showLabel={false} />}
      />
      <CardBody className="flex flex-1 flex-col gap-4">
        {/* The headline fact, first and in one line. */}
        <p
          className={
            suppliesRobot
              ? "text-ink flex items-start gap-2 text-sm leading-relaxed"
              : "text-ink-muted flex items-start gap-2 text-sm leading-relaxed"
          }
        >
          {suppliesRobot ? (
            <Check className="text-volt mt-0.5 size-4 shrink-0" />
          ) : (
            <X className="text-ink-dim mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {hardwareNote ?? (suppliesRobot ? "Robot supplied." : "Bring your own machine.")}
          </span>
        </p>

        <div className="space-y-3">
          {group.map(({ route }) => (
            <div key={route.id} className="border-line border-l-2 pl-3">
              <p className="font-display text-ink text-xs font-semibold uppercase">
                {route.role}
              </p>
              <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                {route.howToEnter}
              </p>
              {route.url ? (
                <a
                  href={route.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-volt mt-1.5 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
                >
                  {new URL(route.url).hostname.replace(/^www\./, "")}
                  <ArrowUpRight className="size-3" />
                </a>
              ) : route.contact ? (
                <p className="text-ink-muted mt-1.5 inline-flex items-center gap-1.5 text-xs">
                  <Mail className="size-3.5 shrink-0" />
                  <code className="text-ink break-all">{route.contact}</code>
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Pushed to the bottom so every card's footer lines up in the grid. */}
        <div className="mt-auto space-y-2 pt-2">
          {prize ? (
            <p className="text-ink-muted text-xs">
              <span className="text-ink-dim font-semibold uppercase">
                Prize:{" "}
              </span>
              {prize}
            </p>
          ) : null}
          <p className="text-ink-muted text-xs">
            <span className="text-ink-dim font-semibold uppercase">
              Deadline:{" "}
            </span>
            {deadline ?? "None published."}
          </p>
          {barriers ? (
            <p className="text-ink-dim text-xs leading-relaxed">
              <span className="font-semibold uppercase">Catch: </span>
              {barriers}
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function Job({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-display text-ink text-xs font-semibold uppercase">
        {term}
      </dt>
      <dd className="text-ink-muted mt-1.5 text-sm leading-relaxed">
        {children}
      </dd>
    </div>
  );
}
