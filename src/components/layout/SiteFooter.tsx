import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-32 max-w-6xl px-4 pb-28 sm:px-6">
      <div className="hairline mb-10" />
      <div className="flex flex-col justify-between gap-8 text-sm text-mist-muted sm:flex-row">
        <div>
          <p className="font-display text-2xl font-bold text-mist">
            fest<span className="text-champagne">oo</span>n
          </p>
          <p className="mt-2 max-w-xs">Boutique celebration concierge & Party-in-a-Box, delivered.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2" aria-label="Footer">
          <Link href="/build" className="hover:text-mist">Build a box</Link>
          <Link href="/sos" className="hover:text-mist">SOS express</Link>
          <Link href="/plan" className="hover:text-mist">Party calculator</Link>
          <Link href="/decor" className="hover:text-mist">Decor visualizer</Link>
          <Link href="/dashboard" className="hover:text-mist">My celebrations</Link>
          <Link href="/login" className="hover:text-mist">Sign in</Link>
        </nav>
      </div>
    </footer>
  );
}
