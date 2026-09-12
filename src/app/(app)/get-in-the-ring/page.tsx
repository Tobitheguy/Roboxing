import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Mail, X } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody, CardHeader } from "@/components/card";
import { ConfidenceBadge, SourceLink } from "@/components/confidence-badge";
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
 * Every other page here reports on the sport. This one is the only page that
 * asks the reader to join it, and it exists because the answer is genuinely
 * surprising: three of the four active leagues hand you a machine. The barrier
 * is not the $63,900 combat-edition G1 that every article about this sport
 * quotes — it is knowing that UFB's signup form IS the registration, and that
 * CMG's individual-operator route runs through a Chinese-language WeChat
 * keyword with no English portal anywhere.
 *
 * The barriers are printed as prominently as the invitations. A page that sells
 * a reader on entering and lets them discover the visa, the language and the
 * location problems on their own is a marketing page; this is supposed to be a
 * record.
 */
export default async function GetInTheRingPage() {
  const [routes, machines] = await Promise.all([
    getEntryRoutes(),
    getMachines(),
  ]);

  const free = routes.filter((r) => r.route.hardwareProvided);
  const bringYourOwn = routes.filter((r) => !r.route.hardwareProvided);

  // What it costs if you do want to own one. Ordered cheapest first, because
  // the useful fact is the floor, not the ceiling.
  const forSale = machines
    .filter((m) => m.robot.priceUsd !== null)
    .sort((a, b) => (a.robot.priceUsd ?? 0) - (b.robot.priceUsd ?? 0));

  return (
    <PageShell>
      <PageHeading
        eyebrow="For competitors"
        title="Get in the ring"
        description="Humanoid fighting is the rare sport where the equipment is the obstacle — except that it mostly isn't. Three of the four active leagues will assign you a robot. Here is every route in, what it costs, and what will actually stop you."
      />

      {/* The headline, stated once and early. */}
      <Card className="border-volt/30 mb-10">
        <CardBody>
          <p className="text-ink text-lg leading-relaxed">
            You do not need to buy a robot to compete.
          </p>
          <p className="text-ink-muted mt-3 max-w-3xl text-sm leading-relaxed">
            UFB assigns every Season 2 team a Unitree G1. URKL gives every
            entrant an identical EngineAI T800 free of charge and lets the top
            sixteen keep theirs. China Media Group runs an entire entry track for
            individual operators with no machine at all, competing by remote,
            voice or motion-sensing control. The hardware is the part that has
            been solved; the access is not.
          </p>
        </CardBody>
      </Card>

      <h2 className="font-display text-title text-ink mb-4 uppercase">
        Routes in that supply the robot
      </h2>
      <div className="grid gap-5 lg:grid-cols-2">
        {free.map(({ route, competitionSlug, competitionName }) => (
          <RouteCard
            key={route.id}
            route={route}
            competitionSlug={competitionSlug}
            competitionName={competitionName}
          />
        ))}
      </div>

      {bringYourOwn.length > 0 ? (
        <>
          <h2 className="font-display text-title text-ink mt-12 mb-4 uppercase">
            Routes in that need your own machine
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {bringYourOwn.map(({ route, competitionSlug, competitionName }) => (
              <RouteCard
                key={route.id}
                route={route}
                competitionSlug={competitionSlug}
                competitionName={competitionName}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* ---- What a pilot does ------------------------------------------- */}
      <h2 className="font-display text-title text-ink mt-12 mb-4 uppercase">
        What a pilot actually does
      </h2>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="You drive it" />
          <CardBody className="text-ink-muted space-y-3 text-sm leading-relaxed">
            <p>
              Almost every bout in this sport is remote-piloted. At UFB that
              means a standard game controller, and the league also supports
              piloting from a browser — the only route in this sport that does
              not require being in the room.
            </p>
            <p>
              Iron Fist King&rsquo;s robots moved on motion capture taken from
              professional kickboxers, trained in simulation and then driven live
              by an operator. The skill being tested is a mix of reaction, timing
              and knowing what the machine can survive.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Or you build the stack" />
          <CardBody className="text-ink-muted space-y-3 text-sm leading-relaxed">
            <p>
              UFB calls this role a Ghost: the Physical AI stack behind the
              robot rather than the hands on the controller. URKL is built
              entirely around it — identical hardware for every team, so the only
              thing you can compete on is the algorithm.
            </p>
            <p>
              EngineAI open-sourced its robot code before Mecha King so teams
              could customise and train their own fighters.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Between rounds, you repair" />
          <CardBody className="text-ink-muted space-y-3 text-sm leading-relaxed">
            <p>
              At CyberHero&rsquo;s Riyadh event, each side&rsquo;s mechanics and
              engineers worked on damaged machines in a pit area between rounds,
              using telemetry to diagnose and fix them under time pressure.
            </p>
            <p>
              It is the most sports-shaped thing about the whole format: a pit
              lane, and an engineering race run in public.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* ---- What it costs to buy ---------------------------------------- */}
      {forSale.length > 0 ? (
        <>
          <h2 className="font-display text-title text-ink mt-12 mb-2 uppercase">
            What it costs if you do want to own one
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
                    <th className="px-4 py-3 text-right font-semibold">Price</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell sm:px-6">
                      Note
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
                      </td>
                      <td className="text-ink-muted px-4 py-3">
                        {makerName ?? "—"}
                      </td>
                      <td className="text-ink tabular px-4 py-3 text-right font-semibold">
                        {formatUsd(robot.priceUsd)}
                      </td>
                      <td className="text-ink-dim hidden px-4 py-3 text-xs sm:table-cell sm:px-6">
                        {robot.priceNote ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {/* ---- Barriers ---------------------------------------------------- */}
      <h2 className="font-display text-title text-ink mt-12 mb-4 uppercase">
        What will actually stop you
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Barrier title="Language">
          Two of the four routes run entirely in Chinese. CMG&rsquo;s
          individual-operator track — the one that needs no robot at all, and the
          most open door in the sport — registers through a WeChat official
          account using a Chinese keyword. There is no English portal.
        </Barrier>
        <Barrier title="Geography">
          URKL fights in China and finishes in Dubai. UFB fights in San
          Francisco. CyberHero has named one of its eight cities. Only UFB&rsquo;s
          browser-based piloting offers any way to compete without travelling.
        </Barrier>
        <Barrier title="No open door at CyberHero">
          Hero Esports handles team entry through partnerships rather than a
          signup form, so approaching them is the only route, and six of the
          eight announced circuit cities are unnamed — you cannot know where you
          would be competing.
        </Barrier>
        <Barrier title="Import and authorization">
          The FCC added foreign-produced advanced robotic devices to its Covered
          List in July 2026. Existing authorizations were not revoked and used
          units are unaffected, but future models are exposed — and EngineAI&rsquo;s
          T800 reportedly had no FCC equipment authorization on record as of
          August 2026.
        </Barrier>
      </div>

      <p className="text-ink-dim mt-10 max-w-3xl text-xs leading-relaxed">
        Entry addresses, prize pools and deadlines change between seasons. Every
        route on this page carries the confidence we have in it and, where one
        was captured, a link to the source. If you find something here out of
        date, that is worth more to us than almost anything else on the site.
      </p>
    </PageShell>
  );
}

function RouteCard({
  route,
  competitionSlug,
  competitionName,
}: {
  route: Awaited<ReturnType<typeof getEntryRoutes>>[number]["route"];
  competitionSlug: string;
  competitionName: string;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href={`/competitions/${competitionSlug}`}
              className="hover:text-volt transition-colors"
            >
              {competitionName}
            </Link>
            <Badge variant="outline" size="sm">
              {route.role}
            </Badge>
          </span>
        }
        action={<ConfidenceBadge level={route.confidence} />}
      />
      <CardBody className="space-y-4">
        <p className="text-ink-muted text-sm leading-relaxed">
          {route.howToEnter}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {route.url ? (
            <a
              href={route.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line hover:border-volt hover:text-volt text-ink inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              {new URL(route.url).hostname.replace(/^www\./, "")}
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
          {route.contact ? (
            <span className="text-ink-muted inline-flex items-center gap-1.5 text-xs">
              <Mail className="size-3.5" />
              <code className="text-ink">{route.contact}</code>
            </span>
          ) : null}
        </div>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Robot supplied">
            <span className="inline-flex items-start gap-1.5">
              {route.hardwareProvided ? (
                <Check className="text-volt mt-0.5 size-4 shrink-0" />
              ) : (
                <X className="text-ink-dim mt-0.5 size-4 shrink-0" />
              )}
              <span>{route.hardwareNote ?? (route.hardwareProvided ? "Yes" : "No")}</span>
            </span>
          </Field>
          {route.prize ? <Field label="Prize">{route.prize}</Field> : null}
          <Field label="Deadline">{route.deadline ?? "None published."}</Field>
          {route.barriers ? (
            <Field label="Barriers">{route.barriers}</Field>
          ) : null}
        </dl>

        <SourceLink url={route.sourceUrl} />
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-ink-dim text-[0.6875rem] font-semibold tracking-widest uppercase">
        {label}
      </dt>
      <dd className="text-ink-muted mt-1 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

function Barrier({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line border-l-2 pl-4">
      <h3 className="font-display text-ink text-sm font-semibold uppercase">
        {title}
      </h3>
      <p className="text-ink-muted mt-2 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
