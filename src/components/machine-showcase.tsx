import * as React from "react";
import Image from "next/image";
import Link from "next/link";

import type { AnatomyView, Feature, MachineImage, Stat } from "@/lib/machine-media";

/**
 * The platform showcase — the presentation layer for hardware pages.
 *
 * Three pieces, used together on /robots/[slug] for platforms (T800, G1):
 * a hero band with the key numbers, annotated anatomy views with numbered
 * markers and a legend, and feature tiles for the close-up photography.
 *
 * Markers are numbered chips rather than in-place text labels on purpose:
 * text pinned next to a marker collides with its neighbours the moment the
 * image scales down, while a number always fits. The words live in the
 * legend, which can wrap freely.
 */

export function MachineHero({
  eyebrow,
  name,
  tagline,
  stats,
  image,
  tone = "dark",
}: {
  eyebrow: string;
  name: string;
  tagline: string;
  stats: Stat[];
  image: MachineImage;
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <section
      className={`border-line relative mb-8 overflow-hidden border ${
        dark ? "bg-[var(--color-ink)]" : "bg-white"
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <p
              className={`eyebrow ${dark ? "text-white/60" : ""}`}
            >
              {eyebrow}
            </p>
            <h1
              className={`font-display mt-2 text-6xl leading-none font-bold uppercase sm:text-8xl ${
                dark ? "text-white" : "text-ink"
              }`}
            >
              {name}
            </h1>
            <p
              className={`mt-4 max-w-md text-sm ${
                dark ? "text-white/70" : "text-ink-muted"
              }`}
            >
              {tagline}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className={`eyebrow ${dark ? "text-white/50" : ""}`}>
                  {stat.label}
                </dt>
                <dd
                  className={`font-display tabular mt-1 text-xl font-bold ${
                    dark ? "text-white" : "text-ink"
                  }`}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative min-h-72 sm:min-h-[26rem] sm:w-2/5">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 640px) 40vw, 100vw"
            className={image.fit === "contain" ? "object-contain" : "object-cover"}
            priority
          />
        </div>
      </div>
    </section>
  );
}

export function AnatomyFigure({ view }: { view: AnatomyView }) {
  return (
    <figure className="min-w-0">
      <p className="eyebrow mb-2">{view.title}</p>
      <div className="border-line relative overflow-hidden border bg-white">
        <Image
          src={view.image.src}
          alt={view.image.alt}
          width={view.image.width}
          height={view.image.height}
          sizes="(min-width: 640px) 50vw, 100vw"
          className="h-auto w-full"
        />
        {view.points.map((point, index) => (
          <span
            key={point.label}
            className="bg-ink font-display absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[0.65rem] font-bold text-white shadow-[0_0_0_2px_white]"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            aria-hidden
          >
            {index + 1}
          </span>
        ))}
      </div>
      <figcaption>
        <ol className="mt-3 space-y-1.5">
          {view.points.map((point, index) => (
            <li key={point.label} className="flex gap-2 text-xs">
              <span className="bg-ink font-display flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white">
                {index + 1}
              </span>
              <span className="text-ink min-w-0">
                <span className="font-semibold">{point.label}</span>
                {point.detail ? (
                  <span className="text-ink-muted"> — {point.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-ink-dim mt-2 text-xs">Photo: {view.image.credit}.</p>
      </figcaption>
    </figure>
  );
}

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {features.map((feature) => (
        <figure key={feature.title} className="border-line min-w-0 border">
          <div className="bg-surface-2 relative aspect-[4/3]">
            <Image
              src={feature.image.src}
              alt={feature.image.alt}
              fill
              sizes="(min-width: 640px) 33vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="p-4">
            <p className="font-display text-ink text-sm font-semibold uppercase">
              {feature.title}
            </p>
            <p className="text-ink-muted mt-1 text-xs">{feature.text}</p>
            <p className="text-ink-dim mt-2 text-[0.65rem]">
              Photo: {feature.image.credit}.
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * The link from a fighter's page back to the hardware it runs on — the
 * honest answer to "Matador and the T800 are the same machine": Matador is
 * the fighter, the T800 is the platform, and this is the seam between the
 * two pages.
 */
export function PlatformBanner({
  slug,
  name,
  note,
  image,
}: {
  slug: string;
  name: string;
  note: string;
  image: MachineImage;
}) {
  return (
    <Link
      href={`/robots/${slug}`}
      className="border-line hover:border-line-strong mb-8 flex items-center gap-4 border bg-[var(--color-ink)] p-4 transition-colors"
    >
      <span className="relative block h-16 w-24 shrink-0 overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="6rem"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow block text-white/50">The hardware</span>
        <span className="font-display block text-lg font-bold text-white uppercase">
          {name}
        </span>
        <span className="mt-0.5 block text-xs text-white/70">{note}</span>
      </span>
      <span className="text-white/60" aria-hidden>
        →
      </span>
    </Link>
  );
}
