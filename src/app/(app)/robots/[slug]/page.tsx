import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { Badge } from "@/components/badge";
import { BoutList } from "@/components/bout-row";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { StatRow, StatTile } from "@/components/stat-tile";
import { formatHeight, formatWeight, humanize } from "@/lib/format";
import {
  AnatomyFigure,
  FeatureGrid,
  MachineHero,
  PlatformBanner,
} from "@/components/machine-showcase";
import {
  getMachineMedia,
  type MachineImage,
  type Showcase,
} from "@/lib/machine-media";
import { computeRobotRecord, formatRecord } from "@/lib/records";
import { getBoutsForRobot, getRobotBySlug } from "@/lib/queries";

export async function generateMetadata(
  props: PageProps<"/robots/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const row = await getRobotBySlug(slug);
  return {
    title: row?.robot.name ?? "Robot",
    description: row
      ? `${row.robot.name} — ${row.teamName}. Record, specifications, and full fight history.`
      : undefined,
  };
}

/**
 * One photograph with its caption and credit. The credit is not optional
 * decoration — this site uses manufacturer and league photography
 * editorially, and naming the source on every image is what keeps that
 * honest.
 */
function MachineFigure({ image }: { image: MachineImage }) {
  return (
    <figure className="min-w-0">
      <div
        className={`border-line relative aspect-[16/10] overflow-hidden border ${
          /* One plate colour. A white plate was the light skin's way of
             letting a cut-out product shot sit on its own ground; on void it
             is a lit block in the middle of a dark page. */
          image.fit === "contain" ? "bg-surface-2" : "bg-surface-2"
        }`}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className={image.fit === "contain" ? "object-contain" : "object-cover"}
        />
      </div>
      <figcaption className="text-ink-muted mt-2 text-xs">
        {image.caption}{" "}
        <span className="text-ink-dim">Photo: {image.credit}.</span>
      </figcaption>
    </figure>
  );
}

/**
 * The one aspect ratio every anatomy view in a set is rendered at.
 *
 * Taken from the first view rather than averaged: that view's framing is the
 * one the marker coordinates were placed against, so it is the shape least
 * disturbed by the crop.
 */
function anatomyAspect(showcase: Showcase): string {
  const first = showcase.anatomy[0]?.image;
  return first ? `${first.width} / ${first.height}` : "16 / 10";
}

/** Renders a jsonb spec blob as a key/value strip, if it is a flat object. */
function SpecsStrip({ specs }: { specs: unknown }) {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
  const entries = Object.entries(specs as Record<string, unknown>).filter(
    ([, v]) => v != null && typeof v !== "object",
  );
  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="eyebrow">{humanize(key)}</dt>
          <dd className="font-display tabular text-ink mt-1 text-sm font-semibold">
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function RobotPage(props: PageProps<"/robots/[slug]">) {
  const { slug } = await props.params;
  const row = await getRobotBySlug(slug);
  if (!row) notFound();

  const { robot, teamName, teamSlug } = row;
  const media = getMachineMedia(robot.slug);
  const showcase = media?.showcase;
  const platform =
    media?.platformSlug != null
      ? { slug: media.platformSlug, media: getMachineMedia(media.platformSlug) }
      : null;

  // A platform's fight history is the history of the machines fielded on it.
  // The White Eagle vs Matador bout is stored against the two variant robots,
  // so the T800's own id appears in no bout row — merge the variants' bouts
  // in, deduped (one bout lists two variants) and re-sorted newest first.
  const ownHistory = await getBoutsForRobot(robot.id);
  const variantRows = showcase?.variants
    ? (await Promise.all(showcase.variants.map((v) => getRobotBySlug(v.slug)))).filter(
        (r) => r != null,
      )
    : [];
  const variantHistories = await Promise.all(
    variantRows.map((r) => getBoutsForRobot(r.robot.id)),
  );
  const history = [...ownHistory];
  for (const boutList of variantHistories)
    for (const bout of boutList)
      if (!history.some((b) => b.id === bout.id)) history.push(bout);
  history.sort(
    (a, b) =>
      b.event.startsAt.getTime() - a.event.startsAt.getTime() ||
      b.orderIndex - a.orderIndex,
  );

  const record = computeRobotRecord(robot.id, history);
  const upcoming = history.filter((b) => !b.result);
  const resolved = history.filter((b) => b.result);

  const specLines = [
    formatHeight(robot.heightCm),
    formatWeight(robot.weightGrams),
    robot.model,
  ].filter(Boolean);

  return (
    <PageShell>
      {/* Fighter pages are reached from their platform page (the index no
          longer lists them) — back should retrace that step, not jump to
          the index. */}
      {platform && media?.platformName ? (
        <BackLink href={`/robots/${platform.slug}`} label={media.platformName} />
      ) : (
        <BackLink href="/robots" label="All machines" />
      )}

      {showcase ? (
        <MachineHero
          eyebrow={showcase.eyebrow}
          name={robot.name}
          tagline={showcase.tagline}
          stats={showcase.stats}
          image={showcase.hero}
        />
      ) : (
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* The monogram tile earns its place only when there is no
              photography — with the gallery directly below, it would just be
              a grey square repeating the name. */}
          {!media ? (
            <RobotAvatar
              name={robot.name}
              photoUrl={robot.photoUrl}
              size="xl"
              decorative
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {/* White Eagle's team is called White Eagle — repeating the name
                as its own eyebrow reads like a stutter. */}
            {teamName !== robot.name ? (
              <p className="eyebrow mb-2">
                <Link href={`/teams/${teamSlug}`} className="hover:text-volt transition-colors">
                  {teamName}
                </Link>
              </p>
            ) : null}
            <h1 className="font-display text-hero text-ink uppercase">
              {robot.name}
            </h1>
            {specLines.length > 0 ? (
              <p className="text-ink-muted tabular mt-3 text-sm">
                {specLines.join(" · ")}
              </p>
            ) : null}
            {robot.weightClass ? (
              <div className="mt-3">
                <Badge>{robot.weightClass}</Badge>
              </div>
            ) : null}
            {robot.bio ? (
              <p className="text-ink-muted mt-4 max-w-2xl text-sm">{robot.bio}</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Fighter machines are league-standard hardware in team colours —
          point straight at the platform page that explains the metal. */}
      {platform?.media && media?.platformName ? (
        <PlatformBanner
          slug={platform.slug}
          name={media.platformName}
          note="League-standard platform — full specs, anatomy and design on the hardware page"
          image={platform.media.card}
        />
      ) : null}

      {/* Annotated anatomy — the platform, part by part. */}
      {showcase && showcase.anatomy.length > 0 ? (
        <section className="mb-8">
          {/* A single view at full page width is a wall of robot — cap it. */}
          <div
            className={`grid gap-6 ${
              showcase.anatomy.length > 1 ? "sm:grid-cols-2" : "max-w-xl"
            }`}
          >
            {showcase.anatomy.map((view) => (
              <AnatomyFigure
                key={view.title}
                view={view}
                aspect={anatomyAspect(showcase)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {showcase && showcase.features.length > 0 ? (
        <FeatureGrid features={showcase.features} />
      ) : null}

      {/* The machine in action — fight photography. */}
      {media && media.gallery.length > 0 ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {media.gallery.map((image) => (
            <MachineFigure key={image.src + image.caption} image={image} />
          ))}
        </div>
      ) : null}

      {/* A platform has no record of its own — when both corners run the
          same hardware, the machine wins and loses every bout at once. The
          fighters keep their tiles; the platform's numbers live in the hero. */}
      {showcase ? null : (
      <StatRow className="mb-8">
        <StatTile
          label="Record"
          value={formatRecord(record)}
          sub={record.ko > 0 ? `${record.ko} by KO` : undefined}
          emphasis
        />
        <StatTile label="Bouts fought" value={record.fought} />
        <StatTile label="Wins by KO" value={record.ko} />
        <StatTile label="Upcoming" value={upcoming.length} />
      </StatRow>
      )}

      {/* The hero stat strip already carries the headline numbers on
          showcase pages — repeating them in a second card says nothing new. */}
      {robot.specsJson && !showcase ? (
        <Card className="mb-6">
          <CardHeader title="Specification" />
          <CardBody>
            <SpecsStrip specs={robot.specsJson} />
          </CardBody>
        </Card>
      ) : null}

      {media && media.reading.length > 0 ? (
        <Card className="mb-6">
          <CardHeader title="About this machine" />
          <CardBody>
            <div className="space-y-4">
              {media.reading.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-ink-muted text-sm leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* The named machines fielded on this platform — the seam between the
          hardware page and the fighter pages, from the other side. */}
      {showcase?.variants && showcase.variants.length > 0 ? (
        <Card className="mb-6">
          <CardHeader title="In the cage as" />
          <CardBodyFlush>
            <ul className="divide-line divide-y">
              {showcase.variants.map((variant) => (
                <li key={variant.slug}>
                  <Link
                    href={`/robots/${variant.slug}`}
                    className="hover:bg-surface-2 flex items-center justify-between gap-4 px-5 py-3 transition-colors"
                  >
                    <span className="font-display text-ink text-sm font-semibold uppercase">
                      {variant.name}
                    </span>
                    <span className="text-ink-muted min-w-0 truncate text-xs">
                      {variant.note}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBodyFlush>
        </Card>
      ) : null}

      {upcoming.length > 0 ? (
        <Card className="mb-6">
          <CardHeader title="Upcoming" />
          <CardBodyFlush>
            <BoutList bouts={upcoming} showEvent showLeague />
          </CardBodyFlush>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Fight history"
          action={
            resolved.length > 0 ? (
              <span className="text-ink-dim tabular text-xs">
                {resolved.length} {resolved.length === 1 ? "bout" : "bouts"}
              </span>
            ) : null
          }
        />
        <CardBodyFlush>
          {resolved.length > 0 ? (
            <BoutList bouts={resolved} showEvent showLeague />
          ) : (
            <EmptyState
              icon={<Swords />}
              title="No bouts fought yet"
              description="Every completed bout will appear here, newest first, with a link to the event it was on."
            />
          )}
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
