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
 *
 * EVERY SURFACE HERE IS A TOKEN, NOT A LITERAL.
 *
 * This file used to switch between a `bg-white` band and a
 * `bg-[var(--color-ink)]` one and paint `text-white` on the second, because
 * under the old light skin `--color-ink` was near-black and that read as
 * "the dark variant". DIR_03 inverted the palette: `--color-ink` is now
 * #F2F0EA, the paper-white body colour. The band kept resolving, kept
 * painting, and turned into white text on a white block — the T800 page,
 * the platform banner, and every anatomy marker at once, all from one
 * assumption that stopped being true.
 *
 * So: no light/dark branching, no literal colours. A panel is `bg-surface`
 * inside the void and inherits the inversion for free if it is ever placed
 * on paper.
 */

export function MachineHero({
  eyebrow,
  name,
  tagline,
  stats,
  image,
}: {
  eyebrow: string;
  name: string;
  tagline: string;
  stats: Stat[];
  image: MachineImage;
}) {
  return (
    <section className="border-line bg-surface relative mb-8 overflow-hidden border-2">
      <div className="flex flex-col sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="font-display text-ink mt-2 text-6xl leading-none font-bold uppercase sm:text-8xl">
              {name}
            </h1>
            <p className="text-ink-muted mt-4 max-w-md text-sm">{tagline}</p>
          </div>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="font-display tabular text-ink mt-1 text-xl font-bold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-surface-2 relative min-h-72 sm:min-h-[26rem] sm:w-2/5">
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

export function AnatomyFigure({
  view,
  aspect,
}: {
  view: AnatomyView;
  /**
   * Shared aspect ratio for every view in a set, as a CSS `aspect-ratio`
   * value. Letting each figure use its own image ratio is what made the
   * T800's back view sit a few pixels shorter than its front: source frames
   * are never cropped to exactly the same shape. One ratio for the set,
   * object-cover to fill it, and the pair lines up by construction.
   */
  aspect: string;
}) {
  return (
    <figure className="min-w-0">
      <p className="eyebrow mb-2">{view.title}</p>
      {/* Not overflow-hidden: the tooltips have to escape this box. The
          image gets its own clipping wrapper inside. */}
      <div className="relative">
        <div
          className="border-line bg-surface-2 relative overflow-hidden border-2"
          style={{ aspectRatio: aspect }}
        >
          <Image
            src={view.image.src}
            alt={view.image.alt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        {view.points.map((point, index) => (
          // z-30 while active: every marker shares the z-10 layer, so without
          // it a neighbouring chip paints on top of the open tooltip's text.
          <span
            key={point.label}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 focus-within:z-30 hover:z-30"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {/* A button, not a bare span: hover is not available on a
                touchscreen, and focus-within gives tap and keyboard the same
                tooltip without any client-side JavaScript.

                Cyan chip, dark glyph, void ring. These markers sit on
                photographs the site does not control — a light one is as
                likely as a dark one — so the chip carries its own contrast
                in both directions instead of trusting the frame behind it. */}
            <button
              type="button"
              className="bg-volt font-display text-volt-ink focus-visible:ring-volt flex size-5 cursor-help items-center justify-center text-[0.65rem] font-bold shadow-[0_0_0_2px_var(--color-canvas)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              {index + 1}
              <span className="sr-only">
                : {point.label}
                {point.detail ? `. ${point.detail}` : ""}
              </span>
            </button>
            <span
              className={`bg-surface-2 border-volt text-ink pointer-events-none absolute z-20 block w-52 scale-95 border-2 p-2.5 opacity-0 transition duration-100 group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:scale-100 group-hover:opacity-100 ${tooltipPosition(
                point.x,
                point.y,
              )}`}
              aria-hidden
            >
              <span className="font-display block text-xs font-bold uppercase">
                {point.label}
              </span>
              {point.detail ? (
                <span className="text-ink-muted mt-1 block text-xs leading-snug">
                  {point.detail}
                </span>
              ) : null}
            </span>
          </span>
        ))}
      </div>
      <figcaption className="text-ink-dim mt-2 text-xs">
        {view.points.length > 0 ? (
          <span className="text-ink-muted">Hover the markers for detail. </span>
        ) : null}
        Photo: {view.image.credit}.
      </figcaption>
    </figure>
  );
}

/**
 * Keeps a tooltip inside the figure.
 *
 * A marker near an edge cannot centre its tooltip on itself without half of
 * it hanging off the page, and one near the top would open upward over the
 * heading — so the box flips to whichever side has room. Full class strings,
 * not interpolated fragments: Tailwind scans source text, and a class built
 * at runtime never makes it into the stylesheet.
 */
function tooltipPosition(x: number, y: number): string {
  const vertical =
    y < 25 ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom";
  const horizontal =
    x > 70
      ? "right-0 translate-x-[0.625rem]"
      : x < 30
        ? "left-0 -translate-x-[0.625rem]"
        : "left-1/2 -translate-x-1/2";
  return `${vertical} ${horizontal}`;
}

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {features.map((feature) => (
        <figure key={feature.title} className="border-line min-w-0 border-2">
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
      className="border-line hover:border-volt bg-surface group mb-8 flex items-center gap-4 border-2 p-4 transition-colors"
    >
      <span className="bg-surface-2 relative block h-16 w-24 shrink-0 overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="6rem"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="eyebrow block">The hardware</span>
        <span className="font-display text-ink group-hover:text-volt block text-lg font-bold uppercase transition-colors">
          {name}
        </span>
        <span className="text-ink-muted mt-0.5 block text-xs">{note}</span>
      </span>
      <span className="text-volt" aria-hidden>
        →
      </span>
    </Link>
  );
}
