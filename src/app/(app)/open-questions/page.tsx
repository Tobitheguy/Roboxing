import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp } from "lucide-react";

import { Badge } from "@/components/badge";
import { Card, CardBody } from "@/components/card";
import { SourceLink } from "@/components/confidence-badge";
import { PageHeading, PageShell } from "@/components/page-shell";
import { formatDateLong } from "@/lib/format";
import { getOpenQuestions } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Open questions",
  description:
    "What is not known about humanoid robot fighting: unpublished results, disputed records and unannounced fixtures.",
};

/**
 * The page that publishes what nobody knows.
 *
 * It reads as a strange thing for a record to do, and it is the most defensible
 * page here. Two World Humanoid Robot Games have now been held with fighting as
 * a scored event and NOBODY has published the medallists. EngineAI staged a
 * full-size championship in December 2025 and never released a winner.
 *
 * A site that quietly omits those looks complete and is wrong. A site that
 * lists them is the only place tracking them — and being the place that tracks
 * what is missing is how a record becomes the reference rather than another
 * aggregator.
 *
 * It doubles as this project's own work queue. Every row is a story the moment
 * it resolves, and a resolved row stays on the page: "unknown for eight months,
 * then Xinhua published it" is more useful than a silent deletion.
 */
export default async function OpenQuestionsPage() {
  const rows = await getOpenQuestions();
  const open = rows.filter((r) => !r.question.answeredAt);
  const answered = rows.filter((r) => r.question.answeredAt);

  return (
    /* Paper, like the articles — see the note in news/[slug]. These are read,
       not scanned. */
    <div className="on-paper bg-paper text-paper-ink flex-1">
      <PageShell>
      <PageHeading
        eyebrow="What we don't know"
        title="Open questions"
        description="Results that were never published, records that sources disagree on, and fixtures announced with no date. Everything on this page is a gap in the public record of this sport — not a gap in our reporting of it."
      />

      <Card className="mb-10">
        <CardBody className="text-ink-muted max-w-3xl space-y-3 text-sm leading-relaxed">
          <p>
            Most sports records can assume the result exists somewhere. This one
            cannot. Humanoid fighting is covered mainly by manufacturers
            announcing their own events, state broadcasters covering them as
            technology stories, and city newspapers writing in languages the
            promoters do not publish in. Results go missing, and nobody notices
            because nobody is keeping a list.
          </p>
          <p>
            This is the list. If you can close one of these, we would genuinely
            like to hear from you.
          </p>
        </CardBody>
      </Card>

      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-title text-ink uppercase">Open</h2>
        <span className="text-ink-dim tabular text-sm">{open.length}</span>
      </div>

      <div className="space-y-4">
        {open.map(({ question, competitionSlug, competitionName, eventSlug, eventName }) => (
          <Card key={question.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <CircleHelp className="text-ink-dim mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-ink text-base font-semibold">
                    {question.question}
                  </h3>
                  <p className="text-ink-muted mt-3 max-w-3xl text-sm leading-relaxed">
                    {question.detail}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {competitionSlug && competitionName ? (
                      <Link href={`/competitions/${competitionSlug}`}>
                        <Badge variant="outline" size="sm">
                          {competitionName}
                        </Badge>
                      </Link>
                    ) : null}
                    {eventSlug && eventName ? (
                      <Link
                        href={`/events/${eventSlug}`}
                        className="text-ink-dim hover:text-ink text-xs underline underline-offset-2"
                      >
                        {eventName}
                      </Link>
                    ) : null}
                    <SourceLink url={question.sourceUrl} />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {answered.length > 0 ? (
        <>
          <h2 className="font-display text-title text-ink mt-12 mb-2 uppercase">
            Closed
          </h2>
          <p className="text-ink-muted mb-4 max-w-2xl text-sm">
            Questions that have since been answered. They stay here because how
            long a fact took to surface is part of the record.
          </p>
          <div className="space-y-4">
            {answered.map(({ question }) => (
              <Card key={question.id}>
                <CardBody>
                  <h3 className="font-display text-ink text-base font-semibold">
                    {question.question}
                  </h3>
                  <p className="text-ink mt-3 max-w-3xl text-sm leading-relaxed">
                    {question.answer}
                  </p>
                  <p className="text-ink-dim mt-3 text-xs">
                    Answered{" "}
                    {question.answeredAt
                      ? formatDateLong(question.answeredAt, "UTC")
                      : ""}
                    . <SourceLink url={question.sourceUrl} />
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : null}
      </PageShell>
    </div>
  );
}
