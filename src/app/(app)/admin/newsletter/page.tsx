import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { MailWarning } from "lucide-react";

import { NewsletterTestForm } from "@/components/admin/newsletter-test-form";
import { Card, CardBodyFlush, CardHeader } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { newsletterSends, subscribers } from "@/db/schema";
import { getAppUrl } from "@/lib/app-url";
import { gatherDigest, hasNews, renderDigest } from "@/lib/digest";
import { isEmailConfigured } from "@/lib/email";
import { formatDateLong } from "@/lib/format";
import { getViewer } from "@/lib/auth";
import { unsubscribeUrl } from "@/lib/newsletter";

export const metadata: Metadata = {
  title: "Newsletter",
  robots: { index: false, follow: false },
};

/**
 * The newsletter console.
 *
 * Answers the three questions worth asking before a mailing goes out: can we
 * send at all, who would receive it, and what exactly would land in their
 * inbox. The preview is the real rendered HTML in an iframe rather than a
 * description of it — a mail you have only read as source is a mail you have
 * not checked.
 */
export default async function NewsletterAdminPage() {
  const viewer = await getViewer();
  const base = getAppUrl();

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(${subscribers.confirmedAt})::int`,
      unsubscribed: sql<number>`count(${subscribers.unsubscribedAt})::int`,
    })
    .from(subscribers);

  // Confirmed AND not unsubscribed — the same both-halves rule getRecipients()
  // applies. Showing "confirmed" alone would overstate the list.
  const [{ reachable }] = await db
    .select({
      reachable: sql<number>`count(*) filter (where ${subscribers.confirmedAt} is not null and ${subscribers.unsubscribedAt} is null)::int`,
    })
    .from(subscribers);

  const data = await gatherDigest();
  const preview = renderDigest(data, {
    baseUrl: base,
    unsubscribeUrl: unsubscribeUrl("preview-token", base),
  });
  const newsworthy = hasNews(data);

  const sends = await db
    .select()
    .from(newsletterSends)
    .orderBy(desc(newsletterSends.createdAt))
    .limit(10);

  const configured = isEmailConfigured();

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Newsletter"
        description="What would go out, who would get it, and a way to send it to yourself first."
      />

      <div className="space-y-6">
        {!configured ? (
          <Card>
            <EmptyState
              icon={<MailWarning />}
              title="RESEND_API_KEY is not set here"
              description="Nothing can be sent from this environment. The digest below still renders, so the wording and layout can be checked without a key — only delivery is blocked."
            />
          </Card>
        ) : null}

        <Card>
          <CardHeader title="The list" />
          <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4 sm:px-6">
            <Stat label="Reachable" value={reachable} />
            <Stat label="Confirmed" value={counts.confirmed} />
            <Stat label="Total" value={counts.total} />
            <Stat label="Unsubscribed" value={counts.unsubscribed} />
          </div>
          <p className="text-ink-dim border-line/60 border-t px-4 py-3 text-xs sm:px-6">
            Reachable is confirmed AND not unsubscribed — the only number that
            predicts how many mails actually go. An address that never clicked
            the confirmation link counts in Total and never receives anything.
          </p>
        </Card>

        <Card>
          <CardHeader
            title="This week's digest"
            action={
              <span className="text-ink-dim text-xs">
                {data.results.length} results · {data.posts.length} posts ·{" "}
                {data.events.length} upcoming
              </span>
            }
          />
          {newsworthy ? (
            <>
              <div className="border-line/60 border-b px-4 py-3 sm:px-6">
                <p className="text-ink-dim text-xs">Subject</p>
                <p className="text-sm font-medium">{preview.subject}</p>
              </div>
              <div className="p-4 sm:p-6">
                {/*
                 * An iframe, not dangerouslySetInnerHTML. The digest is our own
                 * markup, but it carries inline styles written for an email
                 * client and dropping it into the page would leak them into the
                 * admin's own layout. The iframe also shows it at the width a
                 * reader gets.
                 */}
                <iframe
                  title="Digest preview"
                  srcDoc={preview.html}
                  sandbox=""
                  className="border-line h-[560px] w-full rounded border bg-white"
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<MailWarning />}
              title="Nothing to send this week"
              description="No results recorded and no posts published in the last seven days. Upcoming events alone never trigger a send — a weekly mail that only repeats the schedule is what teaches a list to ignore you."
            />
          )}
        </Card>

        {viewer ? (
          <Card>
            <CardHeader
              title="Send a test"
              action={
                <span className="text-ink-dim text-xs">
                  claims no send slot
                </span>
              }
            />
            <NewsletterTestForm defaultEmail={viewer.email} />
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Sent"
            action={
              <span className="text-ink-dim text-xs">
                weekly cron: Thursdays 14:00 UTC
              </span>
            }
          />
          {sends.length === 0 ? (
            <EmptyState
              icon={<MailWarning />}
              title="Nothing has been sent yet"
              description="Every mailing claims a unique key before it sends, so a cron that fires twice still mails once. Those claims appear here."
            />
          ) : (
            <CardBodyFlush>
              <ul>
                {sends.map((send) => (
                  <li
                    key={send.id}
                    className="border-line/60 flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {send.subject}
                      </p>
                      <p className="text-ink-dim text-xs">
                        {send.key} ·{" "}
                        {send.sentAt
                          ? `${send.recipientCount} sent, ${formatDateLong(send.sentAt, "UTC")}`
                          : "claimed but never finished"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBodyFlush>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-ink-dim text-xs tracking-wide uppercase">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
