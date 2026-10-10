"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70svh] place-items-center px-4 pt-28 text-center">
      <div>
        <p className="font-display text-4xl font-bold">Something popped.</p>
        <p className="mt-3 text-mist-muted">We&apos;ve logged it. Try again, or message the concierge — we&apos;re still here.</p>
        <Button className="mt-8" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
