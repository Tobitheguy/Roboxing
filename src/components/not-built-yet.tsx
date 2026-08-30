import { Hammer } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/card";

/**
 * Honest placeholder for a route that exists in the navigation but has not
 * been built yet.
 *
 * Deliberately not "coming soon" marketing copy and deliberately not fake
 * sample data: this site is publicly reachable from step 1, and a page showing
 * invented fixtures would be indistinguishable from a real one.
 */
export function NotBuiltYet({
  page,
  step,
}: {
  page: string;
  step: string;
}) {
  return (
    <Card>
      <EmptyState
        icon={<Hammer />}
        title={`${page} is not built yet`}
        description={`This route is reserved in the navigation so the shell can be tested end to end. It gets its real content in ${step}.`}
      />
    </Card>
  );
}
