import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Mark the URKL opener's winner as disputed.
 *
 * WHAT WAS FOUND, 12 September 2026
 * ---------------------------------
 * The site recorded "White Eagle def. Matador, decision, 3 of 5 rounds" as a
 * settled result. Checking it against three sources produced three answers:
 *
 *   - Wikipedia's URKL article: MATADOR won. "Matador secured victory by
 *     narrowly winning three of the five scored rounds against White Eagle" —
 *     after being decapitated by White Eagle's tornado kick and continuing.
 *   - Newsweek: reads as WHITE EAGLE winning, but only atmospherically — "The
 *     White Eagle waited in the ring, fists still up, as Matador was carried
 *     away." No round score, no declared decision.
 *   - urkl.org, the PROMOTER: no winner published at all. Its own page calls
 *     the night an exhibition between White Eagle and Bullfighter (斗牛士,
 *     i.e. Matador) and stops there.
 *
 * The brief this record was built from is itself self-contradictory on this
 * point: it says "White Eagle def. Matador, decision, 3 of 5 rounds" and then
 * "Matador ... kept fighting, and won three of five rounds". In a five-round
 * decision, winning three rounds IS winning — both cannot be true.
 *
 * WHAT THIS SCRIPT DOES, AND WHAT IT DELIBERATELY DOES NOT
 * -------------------------------------------------------
 * It does NOT flip the winner. Wikipedia is explicit but is not a primary
 * source, and reversing a published result on that basis would replace one
 * unsupported assertion with another.
 *
 * It downgrades the result to `unconfirmed`, states the conflict in the event's
 * prose, and opens a question. The site keeps the bout — it happened, and the
 * decapitation is the most-reported moment in the sport — while no longer
 * claiming to know something the promoter never said.
 *
 * Usage: npx tsx scripts/fix-urkl-winner.ts
 */
async function main() {
  const { db } = await import("../src/db");
  const { boutResults, bouts, competitions, events, openQuestions } =
    await import("../src/db/schema");
  const { eq, inArray } = await import("drizzle-orm");

  const [event] = await db
    .select({ id: events.id, competitionId: events.competitionId })
    .from(events)
    .where(eq(events.slug, "urkl-opening-shenzhen-2026"));
  if (!event) throw new Error("URKL opener not found");

  const boutIds = await db
    .select({ id: bouts.id })
    .from(bouts)
    .where(eq(bouts.eventId, event.id));

  const updated = await db
    .update(boutResults)
    .set({
      confidence: "unconfirmed",
      sourceUrl: "https://en.wikipedia.org/wiki/Ultimate_Robot_Knock-out_Legend",
      notes:
        "WINNER DISPUTED. Wikipedia's URKL article states Matador won three of the five scored rounds despite being decapitated; Newsweek's account reads as a White Eagle win but declares no decision and gives no score; EngineAI, the promoter, has published no result at all and calls the night an exhibition. The winner recorded here is the one the site was originally built with and is NOT settled. See Open Questions.",
    })
    .where(
      inArray(
        boutResults.boutId,
        boutIds.map((b) => b.id),
      ),
    )
    .returning({ id: boutResults.id });

  await db
    .update(events)
    .set({
      confidence: "reported",
      resultsSummary: `The most-reported moment in this sport happened here: White Eagle landed a tornado kick that detached Matador's head, and Matador kept fighting to the end of the card without shutting down.

WHO ACTUALLY WON IS NOT SETTLED, and this site is no longer going to pretend otherwise. Wikipedia's URKL article states that Matador secured victory by narrowly winning three of the five scored rounds — decapitated, and ahead on the cards. Newsweek's account describes White Eagle left standing with its fists up as Matador was carried away, but declares no decision and publishes no round score. EngineAI, the promoter, has never published a result: its own site calls the night an exhibition between White Eagle and Bullfighter and stops there.

Our table still shows the winner the site was originally built with, marked unconfirmed, because reversing it on a single secondary source would swap one unsupported claim for another. If you have the promoter's scorecard, we want it.

The rest of the night is on firmer ground. Around 200 teams from 10 countries registered, the top 32 came through online qualifiers, and every team fought an identical EngineAI T800 supplied free — standardised hardware, differentiated algorithms. A mandatory fall-recovery test required a robot to stand within 3 to 20 seconds, algorithm changes were approved in advance, and dangerous modifications were banned. Donnie Yen appeared at the opening and Buakaw Banchamek at the launch conference.

One more thing is genuinely disputed: how autonomous these machines are. Some sources describe a semi-autonomous arrangement in which the operator supplies intent and onboard AI executes it, others describe full autonomy. Both cannot be right, and the difference decides what the sport actually is.`,
    })
    .where(eq(events.id, event.id));

  const question = {
    slug: "urkl-opener-winner",
    question: "Who actually won the URKL opener — White Eagle or Matador?",
    detail:
      "The most famous bout in humanoid fighting has no agreed winner. Wikipedia's URKL article says Matador won three of the five scored rounds after being decapitated by White Eagle's tornado kick. Newsweek describes White Eagle left standing as Matador was carried away, but declares no decision and gives no round score. EngineAI, the promoter, has published no result and refers to the night as an exhibition. This site records the winner it was originally built with, marked unconfirmed, and will correct it the moment a scorecard or a promoter statement surfaces.",
    competitionId: event.competitionId,
    eventId: event.id,
    sourceUrl: "https://en.wikipedia.org/wiki/Ultimate_Robot_Knock-out_Legend",
    orderIndex: 0,
  };
  await db
    .insert(openQuestions)
    .values(question)
    .onConflictDoUpdate({ target: openQuestions.slug, set: question });

  // Push the other questions down so this one leads the page.
  await db
    .update(openQuestions)
    .set({ orderIndex: 1 })
    .where(eq(openQuestions.slug, "whrg-2025-kickboxing-medallists"));

  console.log(`Marked ${updated.length} bout result(s) unconfirmed.`);
  console.log("Event prose rewritten; open question added.");
  void competitions;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
