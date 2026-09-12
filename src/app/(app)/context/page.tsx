import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/badge";
import { Card, CardBody, CardHeader } from "@/components/card";
import { PageHeading, PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Context",
  description:
    "The regulation, the export controls and the credibility debate around humanoid robot fighting.",
};

/**
 * The background a reader needs to judge everything else on this site.
 *
 * Four of these five entries are routinely reported wrongly, and the errors all
 * run the same direction — toward "these robots are banned" and "these robots
 * are autonomous", neither of which is true. The FCC's July 2026 notice did not
 * revoke anything already authorized. The Pentagon's 1260H listing binds the
 * Department of War and not private buyers. And the autonomy claims are
 * overwhelmingly the manufacturers' own.
 *
 * The Goldberg quote is here deliberately. A site that covers this sport and
 * omits the most credible academic criticism of it is doing promotion. Printing
 * it is what makes the rest of the record worth believing.
 */
export default function ContextPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Background"
        title="Context"
        description="What governs this sport, what restricts the hardware, and the strongest argument that the whole thing is theatre. Read this before drawing conclusions from anything else here."
      />

      <div className="space-y-6">
        <Entry
          title="The credibility debate"
          badge="Ongoing"
          badgeVariant="warn"
        >
          <p>
            Ken Goldberg, the UC Berkeley roboticist, calls these events robot
            theater:{" "}
            <em>
              &ldquo;Many of them have humans controlling them... Beware of what
              you see in the videos, it isn&rsquo;t quite real.&rdquo;
            </em>
          </p>
          <p>
            He is largely right, and this site is built on the assumption that
            he is. Almost every bout in the record was remote-piloted by a named
            or unnamed human. Iron Fist King&rsquo;s robots moved on motion
            capture taken from professional kickboxers. The 2026 World Humanoid
            Robot Games took the criticism seriously enough to write it into the
            rules, halving the score of any teleoperated machine.
          </p>
          <p>
            The honest framing is that this is a piloted sport that is slowly
            becoming an autonomous one, and that the difference is the single
            most important fact about any given event. Where a league&rsquo;s
            autonomy level is disputed — URKL&rsquo;s is — we say so on the{" "}
            <Link
              href="/open-questions"
              className="text-volt underline underline-offset-2"
            >
              open questions
            </Link>{" "}
            page rather than picking the more exciting answer.
          </p>
        </Entry>

        <Entry
          title="FCC Public Notice DA 26-786"
          badge="28 July 2026"
          badgeVariant="outline"
        >
          <p>
            The FCC added foreign-produced advanced robotic devices to the
            Covered List. This is widely reported as a ban on Chinese humanoids
            in the United States. It is not.
          </p>
          <p>
            Existing equipment authorizations are <strong>not revoked</strong>.
            The Unitree G1, Go2, H2, A2 and R1 were certified before that date,
            and used units and continued operation are unaffected. The exposure
            is future models seeking new authorization.
          </p>
          <p>
            One machine on this site is in a different position:
            EngineAI&rsquo;s T800 reportedly had no FCC equipment authorization
            on record as of August 2026 — which matters if you are thinking
            about competing with one on American soil.
          </p>
        </Entry>

        <Entry
          title="Section 1260H listing"
          badge="8 June 2026"
          badgeVariant="outline"
        >
          <p>
            The Pentagon added Unitree to its list of Chinese Military
            Companies. This is also not a purchase ban.
          </p>
          <p>
            A 1260H listing binds the Department of War: it constrains what the
            Department itself may procure. Private and commercial buyers are
            unaffected, which is why American leagues continue to run on Unitree
            hardware and why Unitree became UFB&rsquo;s official robotics partner
            five months before the listing and remained so after it.
          </p>
        </Entry>

        <Entry
          title="The non-weaponization pledge"
          badge="6 October 2022"
          badgeVariant="outline"
        >
          <p>
            Six robotics companies signed an open letter, &ldquo;General Purpose
            Robots Should Not Be Weaponized&rdquo;: Boston Dynamics, Agility
            Robotics, ANYbotics, Clearpath Robotics, Open Robotics — and Unitree.
          </p>
          <p>
            It is regularly cited as though it were in tension with robot
            fighting. It is not. The pledge covers attaching weapons to
            general-purpose robots. Sport combat between two unarmed machines is
            outside it, and no signatory has suggested otherwise.
          </p>
        </Entry>

        <Entry
          title="Unitree UnifoLM-X2-1.0"
          badge="7 September 2026"
          badgeVariant="warn"
        >
          <p>
            Unitree announced what it describes as the first fully autonomous
            high-dynamic humanoid combat — no teleoperation and no choreography.
            Its predecessor, UnifoLM-WMA-0, was open-sourced in September 2025.
          </p>
          <p>
            This is the manufacturer&rsquo;s own claim and it has not been
            independently verified. If it holds up it is the most important thing
            that has happened in this sport; if it does not, it is exactly the
            kind of video Goldberg is warning about. Both possibilities are live,
            and until someone outside Unitree confirms it, the record says so.
          </p>
        </Entry>
      </div>

      <p className="text-ink-dim mt-10 max-w-3xl text-xs leading-relaxed">
        Regulatory summaries here are descriptions of public notices, not legal
        advice. If you are importing hardware or entering a competition abroad,
        check the current position yourself — these designations move.
      </p>
    </PageShell>
  );
}

function Entry({
  title,
  badge,
  badgeVariant,
  children,
}: {
  title: string;
  badge: string;
  badgeVariant: "outline" | "warn";
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={<Badge variant={badgeVariant}>{badge}</Badge>}
      />
      <CardBody className="text-ink-muted max-w-3xl space-y-3 text-sm leading-relaxed">
        {children}
      </CardBody>
    </Card>
  );
}
