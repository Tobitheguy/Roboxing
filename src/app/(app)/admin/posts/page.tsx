import type { Metadata } from "next";
import { desc } from "drizzle-orm";

import { PostForm } from "@/components/admin/entity-forms";
import { Badge } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeading, PageShell } from "@/components/page-shell";
import { db } from "@/db";
import { events } from "@/db/schema";
import { formatDateLong } from "@/lib/format";
import { getAllPostsForAdmin } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Posts",
  robots: { index: false, follow: false },
};

type Row = {
  id: number;
  title: string;
  slug: string;
  kind: string;
  status: string;
  publishedAt: Date | null;
  eventName: string | null;
};

/**
 * Whether a post is actually visible on the site right now.
 *
 * Deliberately shows the three states apart rather than echoing the `status`
 * column. "Published" with a future date is not live yet, and an author who
 * sees only the word "Published" has no way to tell that from a post that
 * went out an hour ago — which is exactly the confusion scheduling creates.
 */
function liveState(row: Row): { label: string; live: boolean } {
  if (row.status !== "published") return { label: "Draft", live: false };
  if (!row.publishedAt) return { label: "Draft", live: false };
  if (row.publishedAt.getTime() > Date.now()) {
    return { label: `Scheduled ${formatDateLong(row.publishedAt, "UTC")}`, live: false };
  }
  return { label: `Live ${formatDateLong(row.publishedAt, "UTC")}`, live: true };
}

export default async function AdminPostsPage() {
  const [rows, eventRows] = await Promise.all([
    getAllPostsForAdmin(),
    db
      .select({ id: events.id, name: events.name })
      .from(events)
      .orderBy(desc(events.startsAt)),
  ]);

  const tableRows: Row[] = rows.map(({ post, eventName }) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    kind: post.kind,
    status: post.status,
    publishedAt: post.publishedAt,
    eventName,
  }));

  const columns: Column<Row>[] = [
    {
      key: "title",
      header: "Headline",
      render: (r) => <span className="text-ink font-medium">{r.title}</span>,
    },
    {
      key: "kind",
      header: "Type",
      hideOnMobile: true,
      render: (r) => (r.kind === "clip" ? "Clip" : "Analysis"),
    },
    {
      key: "event",
      header: "Event",
      hideOnMobile: true,
      render: (r) => r.eventName ?? "—",
    },
    {
      key: "state",
      header: "State",
      render: (r) => {
        const { label, live } = liveState(r);
        return <Badge variant={live ? "default" : "outline"}>{label}</Badge>;
      },
    },
  ];

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="Posts"
        description="Clips and analysis. Video is embedded from the host's own player, never re-hosted."
      />

      <Card className="mb-6">
        <CardHeader title="New post" />
        <CardBody>
          <PostForm events={eventRows} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All posts" />
        <CardBodyFlush>
          <DataTable
            columns={columns}
            rows={tableRows}
            getRowKey={(r) => String(r.id)}
            caption="Posts"
            // Links to the PUBLIC page, which for a draft is a 404. That is
            // the honest behaviour: the row is a way to check what a reader
            // sees, and a draft is not visible to one.
            rowHref={(r) => `/news/${r.slug}`}
            rowLabel={(r) => `${r.title} public page`}
            empty={
              <EmptyState
                title="Nothing written yet"
                description="A clip with one line of context counts. Most of what this sport produces is 30 seconds long."
              />
            }
          />
        </CardBodyFlush>
      </Card>
    </PageShell>
  );
}
