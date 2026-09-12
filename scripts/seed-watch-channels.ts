import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Where to watch, with a link on every row.
 *
 * The page listed "CCTV-10" and "CGTN" as plain text, which answers the
 * question only for someone who already knows where CCTV-10 lives. A broadcast
 * directory whose rows are not clickable is a list of names.
 *
 * EVERY URL BELOW WAS FETCHED AND RETURNED 200 before being written here, and
 * the two social accounts were read off the operator's own site rather than
 * guessed — heroesports.com links @realheroesports on both YouTube and X. A
 * plausible-looking channel URL that 404s is worse than no link, because it
 * costs the reader a click to discover we were wrong.
 *
 * UFB streams on TWITCH, at twitch.tv/ufb0ts — with a zero, which is the kind
 * of detail that makes a hand-typed guess fail silently. It was not findable
 * from their own site or from search; Tobias supplied it, and it was fetched
 * and checked before landing here.
 *
 * Usage: npx tsx scripts/seed-watch-channels.ts
 */
async function main() {
  const { db } = await import("../src/db");
  const { competitions, watchChannels } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({ id: competitions.id, slug: competitions.slug })
    .from(competitions);
  const C = (slug: string) => {
    const found = rows.find((r) => r.slug === slug);
    if (!found) throw new Error(`No competition "${slug}"`);
    return found.id;
  };

  /*
   * China Media Group runs three of the competitions on this site and carries
   * them across the same network every time, so the block is shared rather
   * than retyped per league.
   */
  const CMG = [
    {
      name: "CCTV-10",
      url: "https://tv.cctv.com/live/cctv10/",
      region: "China",
      note: "The science and education channel, which is where CMG files robot fighting.",
    },
    {
      name: "CCTV-5 Sports",
      url: "https://tv.cctv.com/live/cctv5/",
      region: "China",
      note: null,
    },
    {
      name: "CCTV-13 News",
      url: "https://tv.cctv.com/live/cctv13/",
      region: "China",
      note: null,
    },
    {
      name: "央视频 (CCTV Video)",
      url: "https://www.yangshipin.cn/",
      region: "China",
      note: "CMG's own streaming app. Free, no account needed to watch.",
    },
    {
      name: "CGTN",
      url: "https://www.cgtn.com/live",
      region: "International",
      note: "CMG's English-language channel — the one to try first from outside China.",
    },
    {
      name: "cctv.com",
      url: "https://www.cctv.com/",
      region: "Worldwide",
      note: "CMG simulcasts its own events across the network.",
    },
  ];

  const CHANNELS: {
    competition: string;
    name: string;
    url: string | null;
    region: string | null;
    note: string | null;
    confidence: "confirmed" | "reported" | "unconfirmed";
  }[] = [
    ...(["iron-fist-king", "cmg-2026", "world-humanoid-robot-games"] as const).flatMap(
      (slug) =>
        CMG.map((c) => ({
          competition: slug,
          ...c,
          confidence: "reported" as const,
        })),
    ),

    /* ---- URKL: had no channels at all, which was the worst gap ---------- */
    {
      competition: "urkl",
      name: "urkl.org",
      url: "https://urkl.org/",
      region: "Worldwide",
      note: "The league's own site. Opening-night footage is posted here.",
      confidence: "confirmed",
    },
    {
      competition: "urkl",
      name: "EngineAI",
      url: "https://en.engineai.com.cn/",
      region: "Worldwide",
      note: "The organiser, and the manufacturer of every robot in the league.",
      confidence: "confirmed",
    },

    /* ---- UFB ------------------------------------------------------------ */
    {
      competition: "ufb",
      name: "Twitch — twitch.tv/ufb0ts",
      url: "https://www.twitch.tv/ufb0ts",
      region: "Worldwide",
      note: "Where UFB actually streams. Note the spelling: ufb0ts, with a zero.",
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "play.ufb.gg",
      url: "https://play.ufb.gg/",
      region: "Worldwide",
      note: "Sign up here — the same account watches and pilots. UFB lets you drive a robot from the browser.",
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "UFB live stream",
      url: "https://luma.com/ufb-live-stream",
      region: "Worldwide",
      note: "Register for the stream of each event.",
      confidence: "reported",
    },
    {
      competition: "ufb",
      name: "@UFBots on X",
      url: "https://x.com/UFBots",
      region: "Worldwide",
      note: "Where fight nights are announced.",
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "ultimatebots.com",
      url: "https://www.ultimatebots.com/",
      region: "Worldwide",
      note: "The league's own schedule.",
      confidence: "confirmed",
    },

    /* ---- CyberHero: Hero Esports' own channels, read off their site ----- */
    {
      competition: "cyberhero",
      name: "Hero Esports on YouTube",
      url: "https://www.youtube.com/@realheroesports",
      region: "Worldwide",
      note: "The organiser's channel. No live stream was confirmed for the Riyadh launch — the event was invite-only — so whatever footage exists appears here first.",
      confidence: "confirmed",
    },
    {
      competition: "cyberhero",
      name: "@realheroesports on X",
      url: "https://x.com/realheroesports",
      region: "Worldwide",
      note: null,
      confidence: "confirmed",
    },
    {
      competition: "cyberhero",
      name: "heroesports.com",
      url: "https://www.heroesports.com/",
      region: "Worldwide",
      note: null,
      confidence: "confirmed",
    },

    /* ---- REK ------------------------------------------------------------ */
    {
      competition: "rek",
      name: "rek.com",
      url: "https://rek.com/",
      region: "Worldwide",
      note: null,
      confidence: "reported",
    },
    {
      competition: "rek",
      name: "@REKrobot on X",
      url: "https://x.com/REKrobot",
      region: "Worldwide",
      note: null,
      confidence: "reported",
    },
  ];

  await db.delete(watchChannels);

  let order = 0;
  let lastCompetition = "";
  for (const row of CHANNELS) {
    if (row.competition !== lastCompetition) {
      order = 0;
      lastCompetition = row.competition;
    }
    await db.insert(watchChannels).values({
      competitionId: C(row.competition),
      name: row.name,
      url: row.url,
      region: row.region,
      note: row.note,
      orderIndex: order++,
      confidence: row.confidence,
    });
  }

  // Read back rather than trust the inserts: the whole point of this pass is
  // that every row has a link.
  const written = await db
    .select({ name: watchChannels.name, url: watchChannels.url })
    .from(watchChannels);
  const linkless = written.filter((w) => !w.url?.trim());

  console.log(`${written.length} channels written.`);
  if (linkless.length > 0) {
    throw new Error(
      `Rows with no link: ${linkless.map((l) => l.name).join(", ")}`,
    );
  }
  console.log("Every row has a link. Verified.");
  void eq;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
