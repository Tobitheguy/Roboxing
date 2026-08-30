import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="font-display text-hero text-ink uppercase">
        No such page
      </h1>
      <p className="text-ink-muted mt-4 text-sm">
        That competition, team, robot, or event doesn&apos;t exist here.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/schedule">Schedule</Link>
        </Button>
      </div>
    </div>
  );
}
