import * as React from "react";

import { PageHeading, PageShell } from "@/components/page-shell";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

/**
 * The shell the three legal pages share.
 *
 * On paper, like the articles and /open-questions, and for the same reason: a
 * privacy policy is read top to bottom by somebody who is already slightly
 * suspicious. The void ground is built for scanning fixtures.
 *
 * There is no prose plugin in this project and this is not the place to add
 * one. `LegalSection` takes a heading and children, the children are real
 * elements, and the typography is applied here once — which also means a legal
 * page cannot accidentally render user input as markup, because nothing here
 * accepts a string of HTML.
 */
export function LegalPage({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="on-paper bg-paper text-paper-ink flex-1">
      <PageShell>
        <PageHeading eyebrow={eyebrow} title={title} description={description} />
        <p className="text-ink-dim mb-10 text-xs">
          Last updated {LEGAL_LAST_UPDATED}.
        </p>
        <div className="max-w-3xl space-y-10">{children}</div>
      </PageShell>
    </div>
  );
}

/** One numbered-feeling block: a heading and the paragraphs under it. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-title text-ink mb-3 uppercase">
        {heading}
      </h2>
      <div className="text-ink-muted space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** A definition row: what is collected / who processes it, and why. */
export function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="marker:text-ink-dim list-disc space-y-2 pl-5">{children}</ul>
  );
}
