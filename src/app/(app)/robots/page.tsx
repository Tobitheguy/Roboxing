import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bot } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody } from "@/components/card";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { formatHeight, formatUsd, formatWeight } from "@/lib/format";
import { getMachineMedia } from "@/lib/machine-media";
import { getMachines, getManufacturers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Machines",
  description:
    "The humanoid platforms this sport is fought on — specs, makers, prices, availability and fight history.",
};

/**
 * The machines index.
 *
 * A hardware database, not a fighter roster, because that is what the data
 * actually is: whole leagues share one standardised platform. URKL hands every
 * team an identical T800 and lets them differentiate on software alone.
 *
 * Two things changed here when the record was built out. Platform rows no
 * longer belong to a team — they belong to a MAKER, which is what stopped
 * Unitree appearing on the site as a competitor fighting itself. And piloted
 * mechs are separated out below: a 2.7 m, 500 kg machine with a person inside
 * is genuinely interesting and must never sit in a spec comparison beside a
 * 35 kg G1, because a reader scanning a table does not check the class column.
 */
export default async function MachinesPage() {
  const [allRows, makers] = await Promise.all([
    getMachines(),
    getManufacturers(),
  ]);

  // This index promises "these are the models" — so it lists platforms, not
  // fighters. Matador and White Eagle are league-standard T800s in team
  // colours; they live on as pages reachable from fight cards, team pages and
  // the T800's "In the cage as" list, but showing them here would list the same
  // machine three times.
  const rows = allRows.filter(
    ({ robot }) => !getMachineMedia(robot.slug)?.platformSlug,
  );

  const humanoids = rows.filter(({ robot }) => robot.class === "humanoid");
  const mechs = rows.filter(({ robot }) => robot.class !== "humanoid");

  return (
    <PageShell>
      <PageHeading
        eyebrow="Hardware"
        title="Machines"
        description="The humanoid platforms this sport is fought on. Entire leagues run on standardised hardware — these are the models, what they cost, and whether you can get one."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bot />}
            title="No machines on record"
            description="Platforms appear here as leagues announce the hardware they run on."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {humanoids.map((row) => (
              <MachineCard key={row.robot.id} row={row} />
            ))}
          </div>

          {mechs.length > 0 ? (
            <>
              <h2 className="font-display text-title text-ink mt-12 mb-2 uppercase">
                Piloted mechs
              </h2>
              <p className="text-ink-muted mb-4 max-w-2xl text-sm leading-relaxed">
                A separate class, listed apart on purpose. These carry a human
                inside rather than being driven from outside, and they never
                appear in humanoid standings or spec comparisons — half a tonne
                with a pilot in it is not the same sport as 35 kg on a
                controller.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {mechs.map((row) => (
                  <MachineCard key={row.robot.id} row={row} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}

      {/* ---- Makers ------------------------------------------------------ */}
      {makers.length > 0 ? (
        <>
          <h2 className="font-display text-title text-ink mt-12 mb-2 uppercase">
            Makers
          </h2>
          <p className="text-ink-muted mb-4 max-w-2xl text-sm leading-relaxed">
            Who builds the machines, which is not who fights them. A
            manufacturer supplies the platform; a team enters it; a pilot drives
            it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {makers.map(({ maker, machineCount }) => (
              <Card key={maker.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-ink text-sm font-semibold uppercase">
                        {maker.name}
                      </h3>
                      {maker.nameLocal ? (
                        <p className="text-ink-dim mt-0.5 text-xs">
                          {maker.nameLocal}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-ink-dim tabular shrink-0 text-xs">
                      {machineCount}{" "}
                      {machineCount === 1 ? "machine" : "machines"}
                    </span>
                  </div>
                  {maker.bio ? (
                    <p className="text-ink-muted mt-3 text-sm leading-relaxed">
                      {maker.bio}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {maker.websiteUrl ? (
                      <a
                        href={maker.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-ink-dim hover:text-ink text-xs underline underline-offset-2"
                      >
                        {maker.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : null}
                    <ConfidenceBadge level={maker.confidence} showLabel={false} />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

function MachineCard({
  row,
}: {
  row: Awaited<ReturnType<typeof getMachines>>[number];
}) {
  const { robot, makerName, teamName, teamSlug, boutCount } = row;
  const media = getMachineMedia(robot.slug);
  const cardImage = media?.card;

  const specs = [formatHeight(robot.heightCm), formatWeight(robot.weightGrams)]
    .filter(Boolean)
    .concat(robot.degreesOfFreedom ? [`${robot.degreesOfFreedom} DoF`] : [])
    .join(" · ");

  return (
    <Card className="hover:border-line-strong overflow-hidden transition-colors">
      {/* The machine itself, not a monogram. Cards without photography keep the
          letter tile inside the body below. */}
      {cardImage ? (
        <Link
          href={`/robots/${robot.slug}`}
          className={`border-line relative block aspect-[16/9] border-b ${
            cardImage.fit === "contain" ? "bg-white" : "bg-surface-2"
          }`}
        >
          <Image
            src={cardImage.src}
            alt={cardImage.alt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className={
              cardImage.fit === "contain" ? "object-contain" : "object-cover"
            }
          />
        </Link>
      ) : null}
      <CardBody>
        <div className="flex items-start gap-4">
          {!cardImage ? (
            <RobotAvatar
              name={robot.name}
              photoUrl={robot.photoUrl}
              size="lg"
              decorative
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-ink text-lg font-semibold uppercase">
                <Link
                  href={`/robots/${robot.slug}`}
                  className="hover:text-volt transition-colors"
                >
                  {robot.name}
                </Link>
              </h2>
              <ConfidenceBadge level={robot.confidence} showLabel={false} />
            </div>

            <p className="text-ink-dim mt-0.5 text-xs">
              {makerName ? (
                <span>{makerName}</span>
              ) : (
                <span>Maker unrecorded</span>
              )}
              {/* A fighting machine still shows its team; a platform has none,
                  and that absence is the point rather than missing data. */}
              {teamName && teamSlug ? (
                <>
                  {" · "}
                  <Link
                    href={`/teams/${teamSlug}`}
                    className="hover:text-ink-muted transition-colors"
                  >
                    {teamName}
                  </Link>
                </>
              ) : null}
              {robot.weightClass ? ` · ${robot.weightClass}` : null}
            </p>

            <p className="text-ink-muted tabular mt-3 text-xs">
              {specs || "Specs to follow"}
            </p>

            {robot.bio ? (
              <p className="text-ink-muted mt-3 line-clamp-3 text-sm">
                {robot.bio}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant={robot.priceUsd ? "outline" : "default"} size="sm">
                {formatUsd(robot.priceUsd)}
              </Badge>
              {boutCount > 0 ? (
                <Badge variant="outline" size="sm">
                  {boutCount} {boutCount === 1 ? "bout" : "bouts"}
                </Badge>
              ) : null}
            </div>

            {/* The question an American reader actually has, answered on the
                card rather than three clicks in. */}
            {robot.usAvailability ? (
              <p className="text-ink-dim mt-3 text-xs leading-relaxed">
                <span className="font-semibold uppercase">US: </span>
                {robot.usAvailability}
              </p>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
