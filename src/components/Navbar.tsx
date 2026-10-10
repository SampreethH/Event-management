"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnnouncementTicker } from "@/components/landing/AnnouncementTicker";
import { useHydrated } from "@/lib/client/use-hydrated";
import { cn } from "@/lib/cn";
import { useCart } from "@/stores/cart";

const LINKS = [
  { href: "/build", label: "Build a box", featured: true },
  { href: "/sos", label: "SOS express" },
  { href: "/plan", label: "Party calculator" },
  { href: "/decor", label: "Decor" },
  { href: "/dashboard", label: "My celebrations" },
];

/**
 * Gold announcement marquee + floating glass navigation capsule.
 * Total height ≈ 100px (32 ticker + 8 gap + 60 capsule); pages pad with pt-28.
 */
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const shown = hydrated ? count : 0;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <AnnouncementTicker />

      <div className="px-2 pt-2 sm:px-3">
        <nav
          aria-label="Main"
          className="glass-navbar mx-auto flex h-[60px] max-w-[1400px] items-center gap-2 rounded-[1.25rem] border border-white/10 pr-3 pl-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_20px_40px_-20px_rgba(0,0,0,0.8)] sm:pl-10"
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="mr-auto font-sans text-[1.35rem] font-medium tracking-tight text-mist"
          >
            fest<span className="text-celebration-gold">oo</span>n
          </Link>

          <ul className="hidden items-center gap-1 font-sans text-[15px] lg:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 transition-colors",
                      active || l.featured
                        ? "bg-white/10 text-mist shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                        : "text-mist-muted hover:text-mist",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/checkout"
            aria-label={`Cart, ${shown} boxes`}
            className="relative ml-3 grid size-10 place-items-center rounded-full bg-gradient-to-b from-[#F9E29A] to-celebration-gold text-dark-bg shadow-[0_6px_20px_-6px_rgba(245,208,97,0.7)] transition-transform hover:-translate-y-0.5 hover:scale-105"
          >
            <ShoppingBag className="size-4" strokeWidth={2.2} aria-hidden />
            {shown > 0 && (
              <motion.span
                key={shown}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-celebration-coral px-1 font-mono text-[9px] font-bold text-white ring-2 ring-[#12131C]"
              >
                {shown > 99 ? "99+" : shown}
              </motion.span>
            )}
          </Link>

          <button type="button" className="grid size-11 place-items-center rounded-full lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="glass-panel mx-auto mt-2 max-w-6xl space-y-1 rounded-3xl p-3 lg:hidden"
            >
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-sub text-base hover:bg-white/5">
                    {l.label}
                  </Link>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
