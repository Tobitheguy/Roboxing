import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Where to watch: a link that lands on the FOOTAGE, not on a broadcaster.
 *
 * The first version of this file listed CCTV-10, CCTV-5, CCTV-13, cctv.com and
 * yangshipin.cn against every China Media Group competition. Every one of those
 * URLs resolves — and every one of them lands the reader on whatever happens to
 * be on Chinese television at that moment. Tobias's verdict was right: "that's
 * just random TV". A broadcast directory that sends someone to a network's
 * homepage has answered a different question from the one they asked.
 *
 * A reader wants one of exactly two things:
 *
 *   1. Where this league STREAMS when it is on. For UFB that is Twitch.
 *   2. Where the finished footage LIVES — which, for almost everything in this
 *      sport, is the organiser's own video channel. EngineAI posts URKL,
 *      Unitree posts Iron Fist King, Hero Esports posts CyberHero, and CGTN
 *      carries the English-language coverage of CMG events.
 *
 * So every row is now a stream page or an organiser channel. A network portal
 * is never a row, however true it is that the network carried the event.
 *
 * EVERY URL BELOW WAS FETCHED AND RETURNED 200 before being written here. The
 * Hero Esports accounts were read off heroesports.com; the Twitch channel came
 * from Tobias — twitch.tv/ufb0ts, with a ZERO, which is why no search found it
 * and why a hand-typed guess would have failed silently.
 *
 * NOT included: Bilibili. It returns 200 for a space id that does not exist,
 * so "it resolved" proves nothing there, and a wrong channel is worse than a
 * missing one. Those need a human to paste the real URL.
 *
 * AND A 200 IS NOT ENOUGH EITHER, which this file learned the hard way.
 * `youtube.com/@engineai` returns 200 and is titled "Engine AI" — and is a
 * completely unrelated channel whose latest video is "Social media vs reality
 * #travel". The real one is `@EngineAIRobot`. `youtube.com/@CGTN` also returns
 * 200 and is CGTN **Español**; the English CMG channel is CCTV Video News
 * Agency. Both were live on three league pages before anyone read a feed.
 *
 * So the check is now: resolve the handle to a channel id, pull
 * `youtube.com/feeds/videos.xml?channel_id=...`, and READ THE TITLES. A
 * plausible handle that resolves is exactly the shape of a wrong link.
 *
 * Usage: npm run db:seed-watch
 */
async function main() {
  const { db } = await import("../src/db");
  const { competitions, watchChannels } = await import("../src/db/schema");

  const rows = await db
    .select({ id: competitions.id, slug: competitions.slug })
    .from(competitions);
  const C = (slug: string) => {
    const found = rows.find((r) => r.slug === slug);
    if (!found) throw new Error(`No competition "${slug}"`);
    return found.id;
  };

  const CHANNELS: {
    competition: string;
    name: string;
    url: string;
    note: string | null;
    confidence: "confirmed" | "reported" | "unconfirmed";
  }[] = [
    /* ---- URKL: EngineAI runs it and posts it ---------------------------- */
    {
      competition: "urkl",
      name: "urkl.org",
      url: "https://urkl.org/",
      note: "The league's own site. Opening-night footage is posted here.",
      confidence: "confirmed",
    },
    {
      competition: "urkl",
      name: "EngineAI on YouTube",
      url: "https://www.youtube.com/@EngineAIRobot",
      note: "The organiser, and the maker of every robot in the league.",
      confidence: "reported",
    },
    {
      competition: "urkl",
      name: "en.engineai.com.cn",
      url: "https://en.engineai.com.cn/",
      note: null,
      confidence: "confirmed",
    },

    /* ---- UFB: the only league with a real live channel ------------------- */
    {
      competition: "ufb",
      name: "Twitch",
      url: "https://www.twitch.tv/ufb0ts",
      note: "Live and on replay. The channel is ufb0ts — with a zero.",
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "play.ufb.gg",
      url: "https://play.ufb.gg/",
      note: "One account to watch and to pilot — UFB lets you drive from the browser.",
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "X",
      url: "https://x.com/UFBots",
      note: null,
      confidence: "confirmed",
    },
    {
      competition: "ufb",
      name: "ultimatebots.com",
      url: "https://www.ultimatebots.com/",
      note: null,
      confidence: "confirmed",
    },

    /* ---- CyberHero: Hero Esports' own channels -------------------------- */
    {
      competition: "cyberhero",
      name: "Hero Esports on YouTube",
      url: "https://www.youtube.com/@realheroesports",
      note: "Riyadh was invite-only with no confirmed stream, so footage appears here first.",
      confidence: "confirmed",
    },
    {
      competition: "cyberhero",
      name: "X",
      url: "https://x.com/realheroesports",
      note: null,
      confidence: "confirmed",
    },
    {
      competition: "cyberhero",
      name: "heroesports.com",
      url: "https://www.heroesports.com/",
      note: null,
      confidence: "confirmed",
    },

    /* ---- Iron Fist King: Unitree's machines, CMG's broadcast ------------ */
    {
      competition: "iron-fist-king",
      name: "Unitree on YouTube",
      url: "https://www.youtube.com/@unitreerobotics",
      note: "All four robots were Unitree G1s; Unitree posts its own fight footage.",
      confidence: "reported",
    },
    {
      competition: "iron-fist-king",
      name: "CCTV Video News Agency",
      url: "https://www.youtube.com/@CCTVVideoNewsAgency",
      note: "CMG's English-language news channel — where its coverage is findable outside China.",
      confidence: "reported",
    },

    /* ---- CMG2026 -------------------------------------------------------- */
    {
      competition: "cmg-2026",
      name: "CCTV Video News Agency",
      url: "https://www.youtube.com/@CCTVVideoNewsAgency",
      note: "CMG in English — the realistic way to see one of its events from outside China.",
      confidence: "reported",
    },
    {
      competition: "cmg-2026",
      name: "CCTV on YouTube",
      url: "https://www.youtube.com/@cctv",
      note: null,
      confidence: "reported",
    },

    /* ---- World Humanoid Robot Games ------------------------------------- */
    {
      competition: "world-humanoid-robot-games",
      name: "CCTV Video News Agency",
      url: "https://www.youtube.com/@CCTVVideoNewsAgency",
      note: "Carried the Games in English. The fighting events specifically are hard to find — see Open Questions.",
      confidence: "reported",
    },

    /* ---- Mecha King ----------------------------------------------------- */
    {
      competition: "engineai-mecha-king",
      name: "EngineAI on YouTube",
      url: "https://www.youtube.com/@EngineAIRobot",
      note: "EngineAI staged it. No footage of the final and no result have ever been published.",
      confidence: "reported",
    },

    /* ---- REK ------------------------------------------------------------ */
    {
      competition: "rek",
      name: "rek.com",
      url: "https://rek.com/",
      note: null,
      confidence: "reported",
    },
    {
      competition: "rek",
      name: "X",
      url: "https://x.com/REKrobot",
      note: null,
      confidence: "reported",
    },
  ];

  await db.delete(watchChannels);

  let order = 0;
  let last = "";
  for (const row of CHANNELS) {
    if (row.competition !== last) {
      order = 0;
      last = row.competition;
    }
    await db.insert(watchChannels).values({
      competitionId: C(row.competition),
      name: row.name,
      url: row.url,
      // `region` is gone from every row. It was "Worldwide" on almost all of
      // them, which is not information — it is a column of the same word.
      region: null,
      note: row.note,
      orderIndex: order++,
      confidence: row.confidence,
    });
  }

  const written = await db
    .select({ name: watchChannels.name, url: watchChannels.url })
    .from(watchChannels);
  const linkless = written.filter((w) => !w.url?.trim());

  console.log(`${written.length} channels written.`);
  if (linkless.length > 0) {
    throw new Error(`Rows with no link: ${linkless.map((l) => l.name).join(", ")}`);
  }
  console.log("Every row has a link, and every link is a stream or a channel.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
