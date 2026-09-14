import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { BoutList } from "@/components/bout-row";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { CompetitionFilter } from "@/components/competition-filter";
import { EventRow } from "@/components/event-row";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import {
  getAllResults,
  getLeagues,
  getMachineRecords,
  getPastEvents,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage(props: PageProps<"/results">) {
  const params = await props.searchParams;
  const raw = params.competition;
  const competition = Array.isArray(raw) ? raw[0] : raw;

  const [competitions, results, machineRecords, pastEvents] = await Promise.all([
    // getLeagues, not getCompetitions: the filter is a list of LEAGUES, and
    // `getCompetitions` also returns the exhibitions container — a row that
    // exists so a manufacturer's sparring video has somewhere to hang without
    // inventing a competition for it. Listing it as a filter chip presented it
    // as a league, which it is not.
    getLeagues(),
    getAllResults(competition),
    getMachineRecords(),
    getPastEvents(),
  ]);

  /*
   * Counts per confidence state, not per method.
   *
   * The old tiles counted finishes and draws — sensible for a sport with a
   * steady stream of results, and meaningless here, where the whole table is
   * two rows. What a reader of THIS record wants to know first is how much of
   * it is corroborated, so the summary counts sourcing.
   */
  const byConfidence = {
    confirmed: results.filter((b) => b.result?.confidence === "confirmed").length,
    reported: results.filter((b) => b.result?.confidence === "reported").length,
    unconfirmed: results.filter((b) => b.result?.confidence === "unconfirmed")
      .length,
  };

  // Group by event so a night of fights reads as a night rather than a stream.
  /* Keyed by slug, not id: both queries select the same `events` rows, and
     the slug is the stable public identifier either way. */
  const pastBySlug = new Map(pastEvents.map((e) => [e.event.slug, e]));

  const byEvent = new Map<number, typeof results>();
  for (const bout of results) {
    const list = byEvent.get(bout.event.id) ?? [];
    list.push(bout);
    byEvent.set(bout.event.id, list);
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Completed"
        title="Results"
        description="Every finished bout, with winner, method, and round."
      />

      <CompetitionFilter
        competitions={competitions}
        active={competition}
        basePath="/results"
      />

      {results.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            // The absence is explained, not just stated. The real reason
            // there are no rows is a fact about the SPORT — the leagues do
            // not publish complete fight cards yet — and saying so turns an
            // empty page from "this site is broken" into the site's core
            // promise stated at the exact moment a visitor tests it.
            title="No verified results yet"
            description={
              competition
                ? "This league has not published a complete, verifiable fight card yet. The day it does, the card is here."
                : "Not a gap in this site — a gap in the sport. No league has yet published complete fight cards we can verify, and we record nothing we cannot stand behind. The moment one does, its results appear here the same day."
            }
          />
        </Card>
      ) : (
        <>
          {/* One hue, three densities — the same grammar as the chips on the
              rows below, so the summary and the table teach each other. A
              reader learns the system here and can then scan the whole page.
              A state with no rows still prints its zero: "nothing unconfirmed"
              is a fact about the record, not an empty slot. */}
          <div className="border-line mb-8 flex flex-wrap items-center gap-2 border-y-2 py-3">
            <span className="ticker mr-2">{`${results.length} bouts · ${byEvent.size} events`}</span>
            <span className="chip-confirmed font-mono px-2.5 py-[5px] text-[11px] font-bold tracking-[0.1em] uppercase">
              {`Confirmed ${byConfidence.confirmed}`}
            </span>
            <span className="chip-reported font-mono px-2 py-[3px] text-[11px] font-bold tracking-[0.1em] uppercase">
              {`Reported ${byConfidence.reported}`}
            </span>
            <span className="chip-unconfirmed font-mono px-2 py-[3px] text-[11px] font-bold tracking-[0.1em] uppercase">
              {`Unconfirmed ${byConfidence.unconfirmed}`}
            </span>
          </div>

          <div className="space-y-6">
            {[...byEvent.values()].map((eventBouts) => {
              const event = eventBouts[0].event;
              /* The bout query carries a thin event — no confidence, note,
                 date label or broadcaster — so the row reads from the events
                 query instead. Null only if an event holds bouts while its own
                 status is not `completed`, which would be a data problem
                 worth seeing rather than papering over. */
              const row = pastBySlug.get(event.slug) ?? null;
              return (
                <div key={event.id}>
                  {/*
                   * THE ROW, THEN THE RECORD.
                   *
                   * /schedule drops the bout list entirely — on a calendar it
                   * is mostly "Card not announced" repeated down the page. Here
                   * it stays, because the bouts ARE the archive: winner, method,
                   * round and how well each is sourced. The UFC-style row on
                   * top gives the two pages one grammar; what hangs off it
                   * differs because the two pages answer different questions.
                   */}
                  {row ? (
                    <EventRow
                      event={row.event}
                      competitionName={row.competitionName}
                      competitionSlug={row.competitionSlug}
                      competitionLogoUrl={row.competitionLogoUrl}
                      boutCount={eventBouts.length}
                      bouts={eventBouts}
                      showCountdown={false}
                      className="border-b-0"
                    />
                  ) : null}
                  <Card className={row ? "border-t-0" : undefined}>
                    {row ? null : (
                      <CardHeader title={eventBouts[0].competitionName} />
                    )}
                    <CardBodyFlush>
                      <BoutList bouts={eventBouts} />
                    </CardBodyFlush>
                  </Card>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---- Cross-league machine record ---------------------------------- */}
      {machineRecords.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-display text-title text-ink uppercase">
            Machine record
          </h2>
          <p className="text-ink-muted mt-2 mb-5 max-w-2xl text-sm leading-relaxed">
            How each platform performs across every humanoid league, grouped by
            model rather than by fighting name — URKL&rsquo;s entrants are all
            T800s under different names, so the interesting question is about the
            machine, not the entry.
          </p>
          <p className="text-ink-dim mb-5 max-w-2xl text-xs leading-relaxed">
            Exhibitions are excluded, and so is anything outside the humanoid
            class. A demonstration with no declared winner and a piloted mech
            with a person inside both produce numbers that look like a record and
            are not one. This table is small because the sport has published very
            few complete cards — four honest rows beat forty invented ones.
          </p>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-line text-ink-dim border-b text-left text-xs uppercase">
                    <th className="px-4 py-3 font-semibold sm:px-6">Model</th>
                    <th className="px-4 py-3 font-semibold">Maker</th>
                    <th className="px-4 py-3 text-right font-semibold">Bouts</th>
                    <th className="px-4 py-3 text-right font-semibold">W</th>
                    <th className="px-4 py-3 text-right font-semibold">L</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">D</th>
                  </tr>
                </thead>
                <tbody>
                  {machineRecords.map((row) => (
                    <tr
                      key={row.model}
                      className="border-line/60 border-b last:border-b-0"
                    >
                      <td className="text-ink px-4 py-3 font-semibold sm:px-6">
                        {row.model}
                      </td>
                      <td className="text-ink-muted px-4 py-3">
                        {row.maker ?? "\u2014"}
                      </td>
                      <td className="text-ink-muted tabular px-4 py-3 text-right">
                        {row.bouts}
                      </td>
                      <td className="text-ink tabular px-4 py-3 text-right font-semibold">
                        {row.wins}
                      </td>
                      <td className="text-ink-muted tabular px-4 py-3 text-right">
                        {row.losses}
                      </td>
                      <td className="text-ink-muted tabular px-4 py-3 text-right sm:px-6">
                        {row.draws}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
