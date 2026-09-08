import { ExternalLink, Play } from "lucide-react";

import { resolveEmbed } from "@/lib/embeds";

/**
 * The clip.
 *
 * Everything that decides whether a URL becomes an iframe happens in
 * `resolveEmbed()`, not here — this component only renders what it is handed.
 * That separation is the point: the allowlist is one tested pure function
 * rather than a condition scattered through JSX, so "can this be framed" has
 * exactly one answer in the codebase.
 */
export function PostEmbed({
  url,
  title,
}: {
  url: string | null;
  /** The post's headline, used for the frame's accessible name. */
  title: string;
}) {
  const embed = resolveEmbed(url);
  if (!embed) return null;

  if (embed.kind === "link") {
    return (
      <a
        href={embed.href}
        target="_blank"
        rel="noopener noreferrer"
        className="border-line bg-surface hover:border-ink-dim group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
      >
        <div className="border-line bg-surface-2 text-ink-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
          <Play className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-ink group-hover:text-volt truncate text-sm font-medium transition-colors">
            Watch on {embed.host}
          </p>
          <p className="text-ink-dim truncate text-xs">{embed.href}</p>
        </div>
        <ExternalLink className="text-ink-dim size-4 shrink-0" />
      </a>
    );
  }

  return (
    <div>
      <div
        className="border-line bg-surface w-full overflow-hidden rounded-lg border"
        // Portrait for Shorts, landscape for everything else. Set on the
        // wrapper rather than the iframe so the border and radius clip the
        // player rather than sitting behind it.
        style={{ aspectRatio: embed.aspect }}
      >
        <iframe
          src={embed.src}
          // Named, because a screen reader otherwise announces "frame" with
          // nothing to say what is in it.
          title={`${title} — ${embed.provider}`}
          className="size-full"
          // No `sandbox` attribute, and that is considered rather than
          // forgotten. The frame is cross-origin, so the browser's origin
          // model already denies it our DOM, cookies and storage — sandbox
          // adds nothing there. What it would add is breakage: dropping
          // `allow-same-origin` gives the framed document an opaque origin,
          // which takes away YouTube's and Bilibili's own localStorage and
          // stops their players working. Putting `allow-same-origin` back to
          // fix that returns the frame to exactly the state it is in without
          // the attribute. So the choice is a broken player or no attribute,
          // and the security difference is nil.
          //
          // The control that actually matters is upstream: `resolveEmbed()`
          // decides what may be framed at all, by host allowlist.
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          // Below the fold on the index page more often than not, and three
          // players' worth of eager loading is most of the page weight.
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <p className="text-ink-dim mt-2 text-xs">
        Hosted on {embed.provider}. Roboxing does not host this video.
      </p>
    </div>
  );
}
