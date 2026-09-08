import { countryCode, countryName } from "@/lib/places";
import { cn } from "@/lib/utils";

/**
 * A team's country, as a two-letter mark.
 *
 * Letters rather than a flag, and that is a finding rather than a preference.
 * The first version of this rendered flag emoji built from regional indicator
 * symbols — clean, no assets, and broken: **Windows has no flag emoji font**,
 * so it silently degraded to small letters there while showing real flags on
 * macOS. Caught by opening the page rather than by reasoning about it.
 *
 * Flag IMAGES would work everywhere and are the obvious next step — HLTV ships
 * them. They are 250 assets and a sprite pipeline for something two letters
 * already say, and at 10px a flag is a coloured smudge anyway. If the site
 * ever gets a proper asset pipeline this is the place to swap.
 *
 * Why it earns its space at all: this sport is Chinese, American and
 * Gulf-based simultaneously, and its robots are called things like T800 and
 * PM01. Nationality is the fastest way a reader orients themselves in a
 * matchup where none of the names mean anything to them yet.
 */
export function CountryTag({
  code,
  className,
}: {
  code: string | null | undefined;
  className?: string;
}) {
  const normalised = countryCode(code);
  if (!normalised) return null;

  return (
    <abbr
      // The full country name for anyone who does not read the code at a
      // glance — and `abbr` rather than a `title` on a span so a screen reader
      // announces the expansion instead of two letters.
      title={countryName(normalised) ?? normalised}
      className={cn(
        "border-line bg-surface-2 text-ink-dim font-display shrink-0 rounded-[3px] border px-1 py-px text-[0.6rem] leading-none font-semibold tracking-wide no-underline",
        className,
      )}
    >
      {normalised}
    </abbr>
  );
}
