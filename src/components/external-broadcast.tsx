import { ExternalLink, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * What an event page shows when the broadcast is not ours.
 *
 * This is the normal case, not the exception, and the site was not built for
 * it: every event used to imply a Cloudflare input and a player. Most events
 * worth covering for the next year or two belong to somebody else — Unitree,
 * EngineAI, a promoter in Riyadh — and they stream them on YouTube or
 * Bilibili. Pretending otherwise would mean either an empty player or, worse,
 * restreaming somebody's feed without a rights deal.
 *
 * So the honest version: send the viewer where the video actually is, and keep
 * the card, the results, the standings and the calendar entry here. That
 * division is the whole product for now — we are the record of the sport, not
 * yet the broadcaster of it.
 */
export function ExternalBroadcast({
  url,
  broadcasterName,
  status,
}: {
  url: string;
  /** e.g. "Hero Esports on YouTube". Falls back to the link's hostname. */
  broadcasterName: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
}) {
  // A stored URL can be anything a form accepted. `new URL()` throws on
  // malformed input, and this component renders inside a page that must not
  // 500 because someone pasted a half-copied link into the admin form.
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = null;
  }

  const label = broadcasterName?.trim() || hostname || "the broadcaster";

  const verb =
    status === "live"
      ? "Watch live on"
      : status === "completed"
        ? "Watch the replay on"
        : "Watch on";

  return (
    <div className="border-line bg-surface/50 rounded-lg border p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <Radio className="text-volt mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <h2 className="font-display text-title text-ink uppercase">
            {status === "cancelled"
              ? "This event was cancelled"
              : `${verb} ${label}`}
          </h2>
          <p className="text-ink-muted mt-2 max-w-prose text-sm">
            {status === "cancelled"
              ? "The organizer's channel may still carry an announcement."
              : "Roboxing does not carry this broadcast. The card, the results and the standings are here; the video is on the organizer's own channel."}
          </p>

          <div className="mt-5">
            <Button asChild size="lg">
              <a
                href={url}
                target="_blank"
                // noreferrer as well as noopener: the target is somebody
                // else's site and there is no reason to hand it our URL.
                rel="noopener noreferrer"
              >
                {status === "cancelled" ? "Open the channel" : verb.replace(/ on$/, "")}
                <ExternalLink />
              </a>
            </Button>
            {hostname ? (
              <p className="text-ink-dim mt-2 text-xs">Opens {hostname}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
