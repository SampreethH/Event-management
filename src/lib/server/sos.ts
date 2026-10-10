import "server-only";
import { CATALOG_BY_ID } from "@/lib/domain/catalog";
import { SOS_WINDOW_MINUTES } from "@/lib/domain/sos";
import type { CartLine } from "@/lib/booking/schema";
import type { Tx } from "./db";

const TZ = "Asia/Kolkata";

export interface SosAvailability {
  ok: boolean;
  reason?: "no-zone" | "closed" | "past-cutoff" | "not-express" | "stock";
  zone?: { id: string; name: string };
  etaFrom?: string;
  etaTo?: string;
  /** Last moment an order placed now can still make today's final dispatch. */
  cutoffAt?: string;
  shortages?: { itemId: string; name: string; needed: number; available: number }[];
}

function localHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/** Units of each catalog item a set of box lines consumes. */
export function demand(lines: Pick<CartLine, "spec" | "quantity">[]): Map<string, number> {
  const need = new Map<string, number>();
  for (const { spec, quantity } of lines) {
    for (const [id, per] of Object.entries(spec.items)) need.set(id, (need.get(id) ?? 0) + per * quantity);
  }
  return need;
}

/**
 * Geofenced express check: the PIN code must belong to an SOS-enabled hub that
 * is open long enough to deliver, and the hub must hold every item in stock.
 */
export async function checkSos(tx: Tx, pincode: string, lines: Pick<CartLine, "spec" | "quantity">[], now = new Date()): Promise<SosAvailability> {
  const zone = await tx.serviceZone.findFirst({ where: { sosEnabled: true, pincodes: { has: pincode } } });
  if (!zone) return { ok: false, reason: "no-zone" };

  const hour = localHour(now);
  const lastOrderHour = zone.closesAt - SOS_WINDOW_MINUTES.max / 60;
  const cutoffAt = new Date(now.getTime() + (lastOrderHour - hour) * 3_600_000).toISOString();
  const base = { zone: { id: zone.id, name: zone.name }, cutoffAt };
  if (hour < zone.opensAt) return { ...base, ok: false, reason: "closed" };
  if (hour > lastOrderHour) return { ...base, ok: false, reason: "past-cutoff" };

  const need = demand(lines);
  for (const id of need.keys()) {
    if (!CATALOG_BY_ID.get(id)?.express) return { ...base, ok: false, reason: "not-express" };
  }

  const stock = await tx.zoneStock.findMany({
    where: { zoneId: zone.id, inventory: { catalogItemId: { in: [...need.keys()] } } },
    select: { available: true, inventory: { select: { catalogItemId: true } } },
  });
  const available = new Map(stock.map((s) => [s.inventory.catalogItemId!, s.available]));
  const shortages = [...need.entries()]
    .filter(([id, n]) => (available.get(id) ?? 0) < n)
    .map(([id, n]) => ({ itemId: id, name: CATALOG_BY_ID.get(id)!.name, needed: n, available: available.get(id) ?? 0 }));
  if (shortages.length) return { ...base, ok: false, reason: "stock", shortages };

  return {
    ...base,
    ok: true,
    etaFrom: new Date(now.getTime() + SOS_WINDOW_MINUTES.min * 60_000).toISOString(),
    etaTo: new Date(now.getTime() + SOS_WINDOW_MINUTES.max * 60_000).toISOString(),
  };
}

/**
 * Atomically decrements hub stock. Each update is conditional on enough units
 * remaining, so two concurrent SOS orders can't both take the last box.
 */
export async function reserveSosStock(tx: Tx, zoneId: string, lines: Pick<CartLine, "spec" | "quantity">[]): Promise<boolean> {
  for (const [itemId, n] of demand(lines)) {
    const res = await tx.zoneStock.updateMany({
      where: { zoneId, available: { gte: n }, inventory: { catalogItemId: itemId } },
      data: { available: { decrement: n } },
    });
    if (res.count !== 1) return false;
  }
  return true;
}
