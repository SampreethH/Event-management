import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/domain/money";
import { PIPELINE, STATUS_LABEL, TRANSITIONS, type AnyStatus } from "@/lib/domain/order-status";
import { withUser } from "@/lib/server/db";
import { adjustStock, assignDecorator, moveOrder } from "./actions";

export const metadata: Metadata = { title: "Ops portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = ["pipeline", "inventory", "calendar"] as const;
type Tab = (typeof TABS)[number];
const IST = "Asia/Kolkata";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; week?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "CUSTOMER" || !user.factors.includes("totp")) redirect("/dashboard");
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "pipeline";

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-28 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold">Ops portal</h1>
        <nav className="glass flex rounded-full p-1 text-sm" aria-label="Ops sections">
          {TABS.map((t) => (
            <Link key={t} href={`/admin?tab=${t}`} className={cn("rounded-full px-4 py-2 capitalize", tab === t ? "bg-ink/10 text-mist" : "text-mist-muted hover:text-mist")}>
              {t}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-8">
        {tab === "pipeline" && <Pipeline user={user} />}
        {tab === "inventory" && <Inventory user={user} />}
        {tab === "calendar" && <Calendar user={user} week={sp.week} />}
      </div>
    </div>
  );
}

/** Request-time cutoff for the board; kept out of the component body (server-rendered per request). */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

type U = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

async function Pipeline({ user }: { user: U }) {
  const orders = await withUser(user, (tx) =>
    tx.order.findMany({
      where: { status: { in: ["PENDING_PAYMENT", ...PIPELINE] }, slotStart: { gte: daysAgo(2) } },
      orderBy: [{ priority: "desc" }, { slotStart: "asc" }],
      take: 200,
      select: { id: true, reference: true, status: true, priority: true, slotStart: true, guestCount: true, totalPaise: true, paidPaise: true, channel: true, zone: { select: { name: true } }, _count: { select: { lines: true } } },
    }),
  );
  const columns: AnyStatus[] = ["PENDING_PAYMENT", ...PIPELINE];
  return (
    <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-6">
      {columns.map((col) => {
        const cards = orders.filter((o) => o.status === col);
        return (
          <section key={col} className="min-w-[260px]">
            <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
              {STATUS_LABEL[col]} <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-mist-faint">{cards.length}</span>
            </h2>
            <div className="space-y-2">
              {cards.map((o) => (
                <Glass key={o.id} className={cn("p-4 text-sm", o.priority > 0 && "border-tangerine/50")}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{o.reference}</span>
                    {o.channel === "SOS_EXPRESS" && <span className="rounded-full bg-tangerine px-2 py-0.5 text-[10px] font-bold text-white">SOS</span>}
                  </div>
                  <p className="mt-1 text-xs text-mist-muted">
                    {o.slotStart.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: IST })} · {o.guestCount} guests{o.zone ? ` · ${o.zone.name}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-mist-faint tabular-nums">
                    {formatPaise(o.paidPaise)} / {formatPaise(o.totalPaise)} paid
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {TRANSITIONS[o.status as AnyStatus].map((to) => (
                      <form key={to} action={moveOrder}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <input type="hidden" name="to" value={to} />
                        <button className={cn("rounded-full border px-2.5 py-1 text-xs", to === "CANCELLED" ? "border-ink/10 text-mist-faint hover:text-tangerine" : "border-champagne/40 text-champagne hover:bg-champagne/10")}>
                          → {STATUS_LABEL[to]}
                        </button>
                      </form>
                    ))}
                  </div>
                </Glass>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

async function Inventory({ user }: { user: U }) {
  const items = await withUser(user, (tx) =>
    tx.inventoryItem.findMany({
      orderBy: { sku: "asc" },
      include: { catalogItem: { select: { name: true, category: true } }, decorAsset: { select: { name: true } }, zoneStock: { include: { zone: { select: { name: true } } } } },
    }),
  );
  return (
    <Glass className="overflow-x-auto p-0">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-mist-faint">
          <tr className="border-b border-ink/10">
            <th className="p-4">SKU</th>
            <th className="p-4">Item</th>
            <th className="p-4 text-right">On hand</th>
            <th className="p-4 text-right">Reserved</th>
            <th className="p-4">Hubs</th>
            <th className="p-4">Adjust</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const low = i.onHand - i.reserved <= i.reorderAt;
            return (
              <tr key={i.id} className="border-b border-ink/5">
                <td className="p-4 font-mono text-xs text-mist-muted">{i.sku}</td>
                <td className="p-4">
                  {i.catalogItem?.name ?? i.decorAsset?.name}
                  {i.seasonal && <span className="ml-2 rounded bg-lavender/15 px-1.5 py-0.5 text-[10px] text-lavender-300">Seasonal</span>}
                </td>
                <td className={cn("p-4 text-right tabular-nums", low && "font-semibold text-tangerine-300")}>{i.onHand}</td>
                <td className="p-4 text-right tabular-nums text-mist-muted">{i.reserved}</td>
                <td className="p-4 text-xs text-mist-muted">{i.zoneStock.map((z) => `${z.zone.name}: ${z.available}`).join(" · ") || "—"}</td>
                <td className="p-4">
                  <form action={adjustStock} className="flex gap-1.5">
                    <input type="hidden" name="inventoryId" value={i.id} />
                    <input name="delta" type="number" required placeholder="±qty" className="glass h-8 w-20 rounded-lg px-2 text-xs outline-none" />
                    <select name="reason" className="glass h-8 rounded-lg px-2 text-xs outline-none">
                      <option value="restock">Restock</option>
                      <option value="damage">Damage</option>
                      <option value="count-correction">Count fix</option>
                      <option value="manual">Manual</option>
                    </select>
                    <button className="rounded-lg bg-ink/10 px-3 text-xs hover:bg-ink/15">Save</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Glass>
  );
}

function startOfWeek(param?: string): Date {
  const base = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? new Date(`${param}T00:00:00+05:30`) : new Date();
  const ist = new Date(base.toLocaleString("en-US", { timeZone: IST }));
  const diff = (ist.getDay() + 6) % 7; // Monday start
  const monday = new Date(`${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}T00:00:00+05:30`);
  return new Date(monday.getTime() - diff * 86_400_000);
}

async function Calendar({ user, week }: { user: U; week?: string }) {
  const start = startOfWeek(week);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  const { bookings, decorators } = await withUser(user, async (tx) => ({
    bookings: await tx.decorBooking.findMany({
      where: { installStart: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      orderBy: [{ installStart: "asc" }, { routeOrder: "asc" }],
      include: { kit: { select: { name: true, setupMinutes: true } }, order: { select: { reference: true, zone: { select: { name: true } } } } },
    }),
    decorators: await tx.user.findMany({ where: { role: "DECORATOR" }, select: { id: true, displayName: true } }),
  }));
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
  const shift = (n: number) => iso(new Date(start.getTime() + n * 7 * 86_400_000));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href={`/admin?tab=calendar&week=${shift(-1)}`} className="glass rounded-full px-3 py-1.5">← Prev</Link>
        <span className="px-2 text-mist-muted">Week of {start.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: IST })}</span>
        <Link href={`/admin?tab=calendar&week=${shift(1)}`} className="glass rounded-full px-3 py-1.5">Next →</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const list = bookings.filter((b) => iso(b.installStart) === iso(d));
          return (
            <Glass key={iso(d)} className="min-h-40 p-3">
              <p className="text-xs font-semibold text-mist-muted">{d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: IST })}</p>
              <div className="mt-2 space-y-2">
                {list.map((b) => (
                  <div key={b.id} className="rounded-xl border border-ink/10 bg-ink/[0.05] p-2 text-xs">
                    <p className="font-semibold">{b.kit.name}</p>
                    <p className="text-mist-faint">
                      {b.order.reference} · {b.installStart.toLocaleTimeString("en-IN", { timeStyle: "short", timeZone: IST })} · {b.kit.setupMinutes}m
                    </p>
                    <form action={assignDecorator} className="mt-1.5 flex gap-1">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <select name="decoratorId" defaultValue={b.decoratorId ?? ""} className="h-7 min-w-0 flex-1 rounded-md bg-ink/5 px-1 outline-none">
                        <option value="">Unassigned</option>
                        {decorators.map((dec) => (
                          <option key={dec.id} value={dec.id}>{dec.displayName ?? dec.id.slice(-5)}</option>
                        ))}
                      </select>
                      <input name="routeOrder" type="number" min={1} max={20} defaultValue={b.routeOrder ?? undefined} placeholder="#" className="h-7 w-9 rounded-md bg-ink/5 px-1 text-center outline-none" aria-label="Route stop" />
                      <button className="rounded-md bg-ink/10 px-2">✓</button>
                    </form>
                  </div>
                ))}
              </div>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}
