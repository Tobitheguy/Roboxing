import * as React from "react";

import { toRichParagraphs, type InlineNode } from "@/lib/embeds";

/**
 * Renders a post body: paragraphs of plain text, with inline links.
 *
 * Every run is a React child, so it is escaped by React, and the only tag
 * this component can emit is `<a>` with an href that `toInlineNodes` has
 * already restricted to http(s). There is still no HTML path into a body —
 * see the note on `posts.body` and the parser in `lib/embeds`.
 */
function InlineRun({ node }: { node: InlineNode }) {
  if (node.kind === "text") return <>{node.text}</>;

  const external = !node.href.startsWith("/");
  return (
    <a
      href={node.href}
      // noreferrer alongside noopener: we are sending readers to
      // manufacturers and league sites, and there is no reason to hand them
      // our article URL in the referer header.
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="text-ink decoration-line-strong hover:decoration-ink underline decoration-1 underline-offset-2 transition-colors"
    >
      {node.text}
    </a>
  );
}

export function RichText({
  body,
  className,
  paragraphClassName = "text-ink leading-relaxed",
}: {
  body: string | null | undefined;
  className?: string;
  paragraphClassName?: string;
}) {
  const paragraphs = toRichParagraphs(body);
  if (paragraphs.length === 0) return null;

  return (
    <div className={className}>
      {paragraphs.map((nodes, i) => (
        <p key={i} className={paragraphClassName}>
          {nodes.map((node, j) => (
            <InlineRun key={j} node={node} />
          ))}
        </p>
      ))}
    </div>
  );
}
