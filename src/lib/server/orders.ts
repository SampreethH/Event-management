import "server-only";
import type { OrderLine } from "@prisma/client";
import { boxSpecSchema } from "@/lib/domain/box";
import type { CartLine } from "@/lib/booking/schema";

/** Rebuilds cart lines from frozen order specs, dropping any that reference retired items. */
export function reorderLines(lines: Pick<OrderLine, "kind" | "label" | "spec" | "quantity">[]): CartLine[] {
  return lines.flatMap((l) => {
    if (l.kind !== "box") return [];
    const spec = boxSpecSchema.safeParse(l.spec);
    return spec.success ? [{ label: l.label, spec: spec.data, quantity: l.quantity }] : [];
  });
}
