import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/badge";
import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { ConfidenceBadge, SourceLink } from "@/components/confidence-badge";
import { PageHeading, PageShell } from "@/components/page-shell";
import { toParagraphs } from "@/lib/embeds";
import { getBoutsForPilot, getPilotBySlug } from "@/lib/queries";

const ROLE_LABEL: Record<string, string> = {
  pilot: "Pilot",
  founder: "Founder",
  engineer: "Engineer",
  executive: "Executive",
  referee: "Referee",
};

export async function generateMetadata(
  props: PageProps<"/pilots/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getPilotBySlug(slug);
  if (!row) return { title: "Pilot" };
  return {
    title: row.pilot.name,
    description: row.pilot.notableResult ?? undefined,
  };
}

export default async function PilotPage(props: PageProps<"/pilots/[slug]">) {
  const { slug } = await props.params;
  const row = await getPilotBySlug(slug);
  if (!row) notFound();

  const { pilot, competitionSlug, competitionName } = row;
  const bouts = await getBoutsForPilot(pilot.id);

  return (
    <PageShell>
      <BackLink href="/pilots" label="All pilots" />
      <PageHeading
        eyebrow={
          <span className="flex items-center gap-2">
            {ROLE_LABEL[pilot.role] ?? pilot.role}
            {pilot.nationality ? <span>· {pilot.nationality}</span> : null}
          </span>
        }
        title={pilot.name}
        description={pilot.notableResult ?? undefined}
        action={<ConfidenceBadge level={pilot.confidence} />}
      />

      {pilot.nameLocal ? (
        <p className="text-ink-dim -mt-4 mb-8 text-sm">{pilot.nameLocal}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {pilot.bio ? (
            <div className="max-w-2xl space-y-4">
              {toParagraphs(pilot.bio).map((paragraph, i) => (
                <p key={i} className="text-ink-muted leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {/* Recorded bouts, when there are any.
              Usually there are not, and the page is built to read fine without
              them: this sport's coverage names teams far more often than
              operators, so a pilot with a prose achievement and no card is the
              normal case, not a broken record. */}
          {bouts.length > 0 ? (
            <Card className="mt-8">
              <CardHeader
                title={bouts.length === 1 ? "Recorded bout" : "Recorded bouts"}
              />
              <CardBodyFlush>
                <BoutList bouts={bouts} />
              </CardBodyFlush>
            </Card>
          ) : (
            <Card className="mt-8">
              <CardBody className="text-ink-dim text-sm leading-relaxed">
                No individual bouts are attributed to {pilot.name} in the
                record. Where a league publishes team results without naming the
                operator — which is most of them — there is nothing to attach.
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Row label="Role">{ROLE_LABEL[pilot.role] ?? pilot.role}</Row>
                {pilot.affiliation ? (
                  <Row label="Affiliation">{pilot.affiliation}</Row>
                ) : null}
                {competitionSlug && competitionName ? (
                  <Row label="League">
                    <Link
                      href={`/competitions/${competitionSlug}`}
                      className="text-ink hover:text-volt underline underline-offset-2 transition-colors"
                    >
                      {competitionName}
                    </Link>
                  </Row>
                ) : null}
                {pilot.nationality ? (
                  <Row label="Nationality">
                    <Badge variant="outline" size="sm">
                      {pilot.nationality}
                    </Badge>
                  </Row>
                ) : null}
              </dl>
              <div className="mt-4">
                <SourceLink url={pilot.sourceUrl} />
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-dim text-xs tracking-wide uppercase">{label}</dt>
      <dd className="text-ink-muted text-right">{children}</dd>
    </div>
  );
}
