import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * The URKL opener: Matador won. Correct the prose that said otherwise.
 *
 * WHAT HAPPENED, AND IT IS WORTH WRITING DOWN
 * -------------------------------------------
 * The stored bout result has always been right: `winner_robot_id` is Matador,
 * by decision. The machine pages have always been right too — read
 * `src/lib/machine-media.ts`, which says Matador "won because it had already
 * built the lead: 3–2 on rounds", cites Guangzhou's Huacheng and People's
 * Daily, and notes explicitly that "parts of the English-language press still
 * credit the machine that threw the kick".
 *
 * On 11 September this script's first version marked that result `unconfirmed`
 * and opened a question about who won. That was wrong, and the cause was a
 * one-line claim in a build-out brief — "White Eagle def. Matador" — trusted
 * over the database it was describing. The brief contradicted itself two lines
 * later ("Matador ... won three of five rounds"), and the contradiction was
 * noted at the time and resolved the wrong way: by writing the brief's version
 * into `events.results_summary` and then flagging the database for disagreeing
 * with it.
 *
 * The evidence, now that it has actually been gathered:
 *
 *   - Huacheng (Guangzhou) and People's Daily: 3–2 to Matador. Two Chinese
 *     newsrooms, independent of each other.
 *   - Wikipedia's URKL article: Matador won three of the five scored rounds.
 *   - The site's own machine pages, written from those sources.
 *   - Newsweek: describes White Eagle standing as Matador is carried away.
 *     Atmospheric, declares no decision, publishes no score — and is exactly
 *     the English-language coverage machine-media warned about.
 *
 * `reported`, not `confirmed`: EngineAI has still never published a result.
 * Three independent outlets agreeing is strong; the promoter's silence is why
 * this is not the top grade.
 *
 * Usage: npx tsx scripts/fix-urkl-winner.ts
 */
async function main() {
  const { db } = await import("../src/db");
  const { boutResults, bouts, events, openQuestions, robots } = await import(
    "../src/db/schema"
  );
  const { eq, inArray } = await import("drizzle-orm");

  const [event] = await db
    .select({ id: events.id, competitionId: events.competitionId })
    .from(events)
    .where(eq(events.slug, "urkl-opening-shenzhen-2026"));
  if (!event) throw new Error("URKL opener not found");

  const boutIds = (
    await db.select({ id: bouts.id }).from(bouts).where(eq(bouts.eventId, event.id))
  ).map((b) => b.id);

  const [matador] = await db
    .select({ id: robots.id })
    .from(robots)
    .where(eq(robots.slug, "matador-t800"));

  // Assert rather than assume. If the stored winner is not Matador, something
  // else has gone wrong and this script must not paper over it.
  const [current] = await db
    .select({ winnerRobotId: boutResults.winnerRobotId })
    .from(boutResults)
    .where(inArray(boutResults.boutId, boutIds));
  if (current?.winnerRobotId !== matador?.id) {
    throw new Error(
      `Stored winner is not Matador (${current?.winnerRobotId} vs ${matador?.id}) — investigate before running this.`,
    );
  }

  await db
    .update(boutResults)
    .set({
      confidence: "reported",
      endRound: 5,
      sourceUrl: "https://en.wikipedia.org/wiki/Ultimate_Robot_Knock-out_Legend",
      notes:
        "Matador took the decision 3–2 over five rounds after White Eagle's flying kick removed its head module; it fought on headless using the T800's distributed torso control. Scored 3–2 to Matador by Guangzhou's Huacheng and by People's Daily, and reported the same way by Wikipedia's URKL article. EngineAI has never published a result. Some English-language coverage credits White Eagle, which threw the kick and lost.",
    })
    .where(inArray(boutResults.boutId, boutIds));

  await db
    .update(events)
    .set({
      confidence: "confirmed",
      resultsSummary: `Matador beat White Eagle 3–2 over five rounds — and did it without a head.

In the closing stretch White Eagle landed a flying kick that removed Matador's head module entirely. The head carries the T800's primary vision hardware; the torso carries balance and motion control. Matador kept blocking, punching and standing on distributed torso control, finished all five rounds, and won on the lead it had already built.

The highlight and the result belong to different robots, which is this sport's founding paradox and the reason the fight is misreported so often. The clip of the kick passed hundreds of millions of plays; some English-language coverage still credits the machine that threw it. The 3–2 score comes from Guangzhou's Huacheng and from People's Daily, independently, and Wikipedia's URKL article reports it the same way. EngineAI has never published a result of its own, which is why this is recorded as reported rather than confirmed.

The rest of the night: around 200 teams from 10 countries registered, the top 32 came through online qualifiers, and every team fought an identical EngineAI T800 supplied free — standardised hardware, differentiated algorithms. A mandatory fall-recovery test required a robot to stand within 3 to 20 seconds, algorithm changes were approved in advance, and dangerous modifications were banned. Donnie Yen appeared at the opening and Buakaw Banchamek at the launch conference.

One thing here is still genuinely disputed: how autonomous these machines are. Some sources describe a semi-autonomous arrangement in which the operator supplies intent and onboard AI executes it, others describe full autonomy. That question is still open.`,
    })
    .where(eq(events.id, event.id));

  /*
   * The question closes rather than disappears. A row that records "this looked
   * contested for a day and here is how it resolved" is more honest than a
   * silent delete, and the Open Questions page is built to keep answered rows.
   */
  await db
    .update(openQuestions)
    .set({
      answeredAt: new Date(),
      answer:
        "Matador, 3–2 over five rounds. Guangzhou's Huacheng and People's Daily both scored it that way independently, and Wikipedia's URKL article agrees; the site's own machine pages have said so since they were written. The confusion is real but one-sided: White Eagle threw the kick that removed Matador's head, and a highlight that big travels further than a scorecard. EngineAI has still published no result, so this is recorded as reported rather than confirmed.",
    })
    .where(eq(openQuestions.slug, "urkl-opener-winner"));

  const [check] = await db
    .select({
      confidence: boutResults.confidence,
      winner: boutResults.winnerRobotId,
    })
    .from(boutResults)
    .where(inArray(boutResults.boutId, boutIds));
  console.log("bout result:", check, "(Matador id:", matador?.id, ")");
  console.log("Corrected. Matador won; the question is closed, not deleted.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
