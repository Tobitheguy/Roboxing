import Link from "next/link";

import { Countdown } from "@/components/countdown";
import { EventTime } from "@/components/event-time";
import { LivePill } from "@/components/live-pill";
import { RoboxingMark } from "@/components/roboxing-mark";
import { getLiveNow } from "@/lib/live";
import { PLAN } from "@/lib/plan";
import { getNextEvent, getPrimaryCompetition, getTeams } from "@/lib/queries";

/**
 * What a visitor without an account sees.
 *
 * The job is narrow and worth stating: show enough that signing up feels
 * obvious, and nothing that removes the reason to. So this page names the
 * next event, the league, the teams and the price — and shows no standings,
 * no results, no fight cards and no video. Those are the product.
 *
 * That split is how ESPN+, Peacock and Netflix all run their front door:
 * loud repeated sign-up, one quiet sign-in, named content as the hook, price
 * visible before you commit to anything.
 *
 * Everything here is read from the database. Nothing on this page is written
 * into the markup by hand, because the moment a number is typed into JSX it
 * starts drifting from the thing it claims to describe — and this is the one
 * page a stranger judges the whole product by.
 */
export async function Landing() {
  const [live, next, primary, teams] = await Promise.all([
    getLiveNow(),
    getNextEvent(),
    getPrimaryCompetition(),
    getTeams(),
  ]);

  // getTeams() returns rows shaped { team, robotCount } — the roster count is
  // deliberately not shown here. "4 robots" next to a team name invites the
  // question of who they are, and that answer is inside.
  const teamNames = teams.map((row) => row.team.name).filter(Boolean);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Same backdrop as the auth screens, so arriving here and arriving at
          sign-in feel like one product rather than two. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #26262f 1px, transparent 1px), linear-gradient(to bottom, #26262f 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #000 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #000 30%, transparent 80%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-[0.18] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, #c8ff00 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-6 sm:px-10">
        <RoboxingMark size="md" />
        {/* One quiet sign-in, per the pattern every one of these services
            follows: the loud button is for the visitor who has no account,
            because that is almost everyone arriving here. */}
        <Link
          href="/sign-in"
          className="text-ink-muted hover:text-ink focus-visible:ring-volt rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 flex-1 px-5 sm:px-10">
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-5xl pt-10 pb-20 text-center sm:pt-20">
          {live ? (
            <div className="mb-6 flex justify-center">
              <LivePill status="live" />
            </div>
          ) : (
            <p className="text-eyebrow text-volt font-semibold uppercase">
              Humanoid robot combat
            </p>
          )}

          <h1 className="text-display font-display text-ink mt-5 uppercase">
            All of Roboxing.
            <br />
            <span className="text-volt">One subscription.</span>
          </h1>

          <p className="text-ink-muted mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            Every event live. The full archive on demand. League standings,
            team rosters and every fight on record — the sport, covered like a
            sport.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt inline-flex h-12 w-full max-w-xs items-center justify-center rounded-md px-8 text-sm font-semibold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0f] focus-visible:outline-none sm:w-auto"
            >
              Start watching
            </Link>
            <p className="text-ink-dim text-sm">
              {PLAN.trialDays} days free, then ${PLAN.monthlyPriceUsd} a month.
              Cancel any time.
            </p>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* The hook: a real event with a real date, or an honest silence. */}
          {live ? (
            <div className="border-line bg-surface/70 mx-auto mt-14 max-w-2xl rounded-lg border p-6 backdrop-blur-sm sm:p-8">
              <p className="text-eyebrow text-ink-dim uppercase">
                Broadcasting now
              </p>
              <p className="font-display text-hero text-ink mt-3 uppercase">
                {live.eventName}
              </p>
              <p className="text-ink-muted mt-4 text-sm">
                Sign in to watch.
              </p>
            </div>
          ) : next ? (
            <div className="border-line bg-surface/70 mx-auto mt-14 max-w-2xl rounded-lg border p-6 backdrop-blur-sm sm:p-8">
              <p className="text-eyebrow text-ink-dim uppercase">
                Next event · {next.competitionName}
              </p>
              <p className="font-display text-hero text-ink mt-3 uppercase">
                {next.event.name}
              </p>
              <Countdown
                startsAt={next.event.startsAt.toISOString()}
                className="font-display text-volt mt-5 block text-3xl font-bold sm:text-4xl"
              />
              <p className="text-ink-muted mt-4 text-sm">
                <EventTime
                  startsAt={next.event.startsAt.toISOString()}
                  timeZone={next.event.timezone}
                  city={next.event.city}
                />
                {next.event.venue ? (
                  <span className="text-ink-dim"> · {next.event.venue}</span>
                ) : null}
              </p>
            </div>
          ) : null}
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-line mx-auto max-w-5xl border-t py-16">
          <h2 className="font-display text-title text-ink text-center uppercase">
            What a subscription includes
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Every event, live",
                body: "The full broadcast on the Roboxing player, on any device.",
              },
              {
                title: "The whole archive",
                body: "Every recording, for as long as you subscribe — including the ones from before you joined.",
              },
              {
                title: "Standings and records",
                body: "League tables computed from every result, not typed in by hand.",
              },
              {
                title: "Teams and robots",
                body: "Rosters, specifications and a bout-by-bout history for every competitor.",
              },
            ].map((item) => (
              <li key={item.title}>
                <span aria-hidden className="bg-volt block h-px w-8" />
                <h3 className="font-display text-ink mt-4 text-base font-semibold uppercase">
                  {item.title}
                </h3>
                <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Named teams, no results. This is the ESPN+ trick: show WHO, keep
            WHAT HAPPENED behind the wall. A league table on this page would
            answer the question that the subscription is meant to answer. */}
        {primary && teamNames.length > 0 ? (
          <section className="border-line mx-auto max-w-5xl border-t py-16 text-center">
            <p className="text-eyebrow text-volt font-semibold uppercase">
              {primary.name}
            </p>
            <h2 className="font-display text-title text-ink mt-3 uppercase">
              {teamNames.length} teams on the card
            </h2>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {teamNames.map((name) => (
                <li
                  key={name}
                  className="font-display text-ink-muted text-lg font-semibold uppercase sm:text-xl"
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="text-ink-dim mt-8 text-sm">
              Standings, results and full fight history are inside.
            </p>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        <section className="border-line mx-auto max-w-5xl border-t py-20 text-center">
          <h2 className="font-display text-hero text-ink uppercase">
            ${PLAN.monthlyPriceUsd}
            <span className="text-ink-muted text-2xl"> / month</span>
          </h2>
          <p className="text-ink-muted mt-4">
            {PLAN.trialDays} days free. Cancel any time — access runs to the
            end of the period you paid for.
          </p>
          <Link
            href="/sign-up"
            className="bg-volt text-volt-ink hover:bg-volt-dim focus-visible:ring-volt mt-8 inline-flex h-12 items-center justify-center rounded-md px-10 text-sm font-semibold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0f] focus-visible:outline-none"
          >
            Create an account
          </Link>
          <p className="text-ink-dim mt-5 text-sm">
            Already have one?{" "}
            <Link
              href="/sign-in"
              className="text-volt underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </section>
      </main>

      {/* This page is public and indexable, and it names teams and events. It
          has to say plainly that they are invented, or it is a public claim
          about a competition that does not exist. */}
      <footer className="border-line text-ink-dim relative z-10 border-t px-5 py-8 text-center text-xs sm:px-10">
        <p className="mx-auto max-w-2xl leading-relaxed">
          Roboxing is a demonstration build. The competition, teams, robots and
          events named on this page are placeholders created for testing — not
          a record of any real event or organisation.
        </p>
      </footer>
    </div>
  );
}
