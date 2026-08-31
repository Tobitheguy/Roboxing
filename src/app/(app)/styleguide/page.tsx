import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { Badge, MethodBadge, type BoutMethod } from "@/components/badge";
import { Card, CardBody, CardBodyFlush, CardHeader } from "@/components/card";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LivePill } from "@/components/live-pill";
import { PageHeading, PageShell } from "@/components/page-shell";
import { RobotAvatar } from "@/components/robot-avatar";
import { RoboxingMark } from "@/components/roboxing-mark";
import { StatRow, StatTile } from "@/components/stat-tile";
import { TeamCrest } from "@/components/team-crest";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Styleguide",
  // Not a page for the public to find; it is an internal design surface.
  robots: { index: false, follow: false },
};

/**
 * Every design token and primitive on one page.
 *
 * This is the design review surface and the regression check — if a token
 * changes in globals.css, it changes here, because every swatch below reads the
 * live CSS variable rather than a copied hex value. The styleguide cannot drift
 * from the system it documents.
 */

const SURFACE_TOKENS = [
  ["--color-canvas", "Page background"],
  ["--color-surface", "Cards, rows, header"],
  ["--color-surface-2", "Hover, popovers, inputs"],
  ["--color-line", "Hairline border"],
  ["--color-line-strong", "Emphasised divider"],
] as const;

const INK_TOKENS = [
  ["--color-ink", "Primary text · 19.4:1"],
  ["--color-ink-muted", "Secondary text · 7.7:1"],
  ["--color-ink-dim", "Metadata · 4.6:1, clears AA"],
] as const;

const ACCENT_TOKENS = [
  ["--color-volt", "Accent — buttons, wins, active nav"],
  ["--color-volt-dim", "Accent hover / pressed"],
  ["--color-live", "LIVE ONLY — never decorative"],
  ["--color-drift", "Behind the live edge"],
  // Swatched next to --color-live deliberately: seeing the two reds side by
  // side is the only way to actually verify the "red means live" rule holds.
  ["--destructive", "Errors — a DIFFERENT red to live"],
  ["--color-loss", "A loss"],
] as const;

function Swatch({ token, note }: { token: string; note: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="border-line-strong size-10 shrink-0 rounded-md border"
        style={{ background: `var(${token})` }}
      />
      <div className="min-w-0">
        <code className="text-ink block truncate font-mono text-xs">
          {token}
        </code>
        <span className="text-ink-dim text-xs">{note}</span>
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-6">
      <CardHeader title={title} />
      <CardBody>
        {note ? <p className="text-ink-muted mb-6 text-sm">{note}</p> : null}
        {children}
      </CardBody>
    </Card>
  );
}

/** Demo rows — this page documents components, so sample data is the content. */
type DemoRow = {
  pos: number;
  team: string;
  played: number;
  won: number;
  lost: number;
  ko: number;
  points: number;
};

const DEMO_ROWS: DemoRow[] = [
  { pos: 1, team: "Sample Team A", played: 9, won: 8, lost: 1, ko: 5, points: 24 },
  { pos: 2, team: "Sample Team B", played: 9, won: 6, lost: 3, ko: 3, points: 18 },
  { pos: 3, team: "Sample Team C", played: 9, won: 5, lost: 4, ko: 2, points: 15 },
];

const DEMO_COLUMNS: Column<DemoRow>[] = [
  {
    key: "pos",
    header: "#",
    numeric: true,
    className: "w-10 text-ink-dim",
    render: (r) => r.pos,
  },
  {
    key: "team",
    header: "Team",
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <TeamCrest name={r.team} size="sm" />
        <span className="text-ink font-medium">{r.team}</span>
      </div>
    ),
  },
  { key: "p", header: "P", headerTitle: "Played", align: "right", numeric: true, hideOnMobile: true, render: (r) => r.played },
  { key: "w", header: "W", headerTitle: "Won", align: "right", numeric: true, render: (r) => r.won },
  { key: "l", header: "L", headerTitle: "Lost", align: "right", numeric: true, render: (r) => r.lost },
  { key: "ko", header: "KO", headerTitle: "Knockouts", align: "right", numeric: true, hideOnMobile: true, render: (r) => r.ko },
  {
    key: "pts",
    header: "Pts",
    headerTitle: "Points",
    align: "right",
    numeric: true,
    render: (r) => <span className="text-volt">{r.points}</span>,
  },
];

const METHODS: BoutMethod[] = ["ko", "tko", "decision", "draw", "dq", "no_contest"];

export default function StyleguidePage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Internal"
        title="Styleguide"
        description="Every token and primitive in the Roboxing design system. Swatches read the live CSS variables from globals.css, so this page cannot drift from the system it documents."
      />

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Colour"
        note="One accent (volt) and one state colour (live). Red is reserved exclusively for the live state — never a button, never an error, never decoration. Errors use destructive, which is a different red on purpose."
      >
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="eyebrow mb-4">Surfaces</p>
            <div className="space-y-3">
              {SURFACE_TOKENS.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Ink</p>
            <div className="space-y-3">
              {INK_TOKENS.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Accent &amp; state</p>
            <div className="space-y-3">
              {ACCENT_TOKENS.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Type"
        note="Oswald carries names, scores, and numbers. Inter carries prose. Geist Mono carries timecodes, stream keys, and IDs. Display sizes are fluid so a fight-card headline works on a 375px phone without breakpoint overrides."
      >
        <div className="space-y-8">
          <div>
            <p className="eyebrow mb-2">text-display · Oswald 700</p>
            <p className="text-display font-display text-ink uppercase">
              Titan-07
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">text-hero · Oswald 700</p>
            <p className="text-hero font-display text-ink uppercase">
              Round 2 · 1:14
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">text-title · Oswald 600</p>
            <p className="text-title font-display text-ink">Season standings</p>
          </div>
          <div>
            <p className="eyebrow mb-2">eyebrow utility</p>
            <p className="eyebrow">Next event · Shenzhen</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Body · Inter</p>
            <p className="text-ink-muted max-w-2xl text-sm">
              Roboxing licenses broadcast rights from combat league organizers and
              streams events on its own player, wrapped in real sports
              infrastructure: competitions, teams, robots, fixtures, results, and
              computed standings.
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">Mono · Geist Mono</p>
            <p className="text-ink font-mono text-sm">
              rtmps://live.cloudflare.com:443/live/ · 00:14:32.09
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">
              tabular utility — digits hold their lane as numbers change
            </p>
            <div className="font-display text-ink space-y-1 text-2xl font-bold">
              <p className="tabular">111 · 24</p>
              <p className="tabular">999 · 18</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Live state"
        note="LivePill is the only component allowed to use --color-live. Drift is amber because 'you are behind the live edge' is a different message from 'this is happening now'. The live dot breathes at 2s rather than blinking — a blinking red dot is exhausting to sit next to for an hour."
      >
        <div className="flex flex-wrap items-center gap-4">
          <LivePill status="live" />
          <LivePill status="drift" />
          <LivePill status="offline" />
          <LivePill status="live" label="Live · Exhibition Night 1" />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Badge"
        note="Metadata and status labels. There is deliberately no live variant — that lives in LivePill so nothing can accidentally paint a decorative label in the one colour that means broadcasting."
      >
        <div className="flex flex-wrap gap-2">
          <Badge>Heavyweight</Badge>
          <Badge variant="volt">Main event</Badge>
          <Badge variant="voltSolid">Featured</Badge>
          <Badge variant="win">Win</Badge>
          <Badge variant="loss">Loss</Badge>
          <Badge variant="warn">Unresolved</Badge>
          <Badge variant="danger">Import failed</Badge>
          <Badge variant="outline">Season 1</Badge>
        </div>

        <p className="eyebrow mt-8 mb-3">Bout methods</p>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <MethodBadge key={m} method={m} />
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Stat tiles"
        note="Records, points, spec figures. Values use the display face with tabular figures so a row stays aligned and does not jitter when a number updates mid-event."
      >
        <StatRow>
          <StatTile label="Record" value="8–1" sub="5 by KO" />
          <StatTile label="Points" value="24" emphasis />
          <StatTile label="Weight" value="62 kg" />
          <StatTile label="Height" value="138 cm" />
        </StatRow>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Card className="mt-6">
        <CardHeader
          title="Data table"
          action={<Badge variant="outline">Sample data</Badge>}
        />
        <CardBodyFlush>
          <DataTable
            columns={DEMO_COLUMNS}
            rows={DEMO_ROWS}
            getRowKey={(r) => String(r.pos)}
            caption="Example standings table showing the DataTable primitive"
          />
        </CardBodyFlush>
        <CardBody className="border-line border-t">
          <p className="text-ink-muted text-sm">
            One table primitive serves standings, fixtures, results, rosters, and
            every admin list. Server-rendered with no client JavaScript — the
            main thread belongs to the video player. Abbreviated headers carry a
            screen-reader long form, numeric columns get tabular figures, and
            low-priority columns drop below the sm breakpoint. Wide tables scroll
            inside their own container so the page body never scrolls sideways on
            a phone.
          </p>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Identity"
        note="Teams get a crest with a monogram fallback; robots get a square photo with a mono fallback. Robots are square and mono rather than circular because they are equipment with model numbers — a circular avatar reads as a person."
      >
        <div className="flex flex-wrap items-end gap-8">
          <div className="space-y-3">
            <p className="eyebrow">Team crest</p>
            <div className="flex items-end gap-3">
              <TeamCrest name="Sample Team" size="sm" />
              <TeamCrest name="Sample Team" size="md" />
              <TeamCrest name="Sample Team" size="lg" />
              <TeamCrest name="Sample Team" size="xl" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Robot avatar</p>
            <div className="flex items-end gap-3">
              <RobotAvatar name="SAMPLE-01" size="sm" />
              <RobotAvatar name="SAMPLE-01" size="md" />
              <RobotAvatar name="SAMPLE-01" size="lg" />
              <RobotAvatar name="SAMPLE-01" size="xl" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Wordmark</p>
            <div className="flex items-end gap-4">
              <RoboxingMark size="sm" />
              <RoboxingMark size="md" />
              <RoboxingMark size="lg" />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Empty state"
        note="A first-class primitive, not an afterthought: a pre-launch sports site is mostly empty by definition. An empty table that says nothing reads as a bug; one that explains itself reads as a schedule."
      >
        <div className="border-line rounded-lg border border-dashed">
          <EmptyState
            icon={<Inbox />}
            title="No results recorded"
            description="Every completed bout will show here with its winner, method, and round."
          />
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Buttons"
        note="shadcn components inherit the Roboxing palette through the semantic variables in globals.css — primary resolves to volt with near-black ink, never white."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Watch live</Button>
          <Button variant="secondary">Add to calendar</Button>
          <Button variant="outline">Fight card</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete event</Button>
          <Button variant="link">Full results</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section
        title="Focus"
        note="Tab through this page. Every interactive element takes a 2px volt outline with a 2px offset — keyboard users navigate standings tables and player controls, so a visible focus ring is not optional."
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">Tab to me</Button>
          <Button variant="outline">Then me</Button>
          <LivePill status="live" href="/styleguide" label="And me" />
        </div>
      </Section>
    </PageShell>
  );
}
