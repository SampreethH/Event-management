import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/auth/session";
import { SOS_KITS } from "@/lib/domain/sos";
import { lookupHash } from "@/lib/server/crypto";
import { withSystem } from "@/lib/server/db";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { enforce } from "@/lib/server/rate-limit";
import { checkSos } from "@/lib/server/sos";

const schema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  kitId: z.enum(SOS_KITS.map((k) => k.id) as [string, ...string[]]),
});

/** Public, rate-limited geofence + live stock check for the SOS module. */
export const POST = handle(async (req: Request) => {
  await enforce(["sosCheck", lookupHash(await clientIp())]);
  const { pincode, kitId } = await readJson(req, schema);
  const kit = SOS_KITS.find((k) => k.id === kitId);
  if (!kit) throw new HttpError(404, "Unknown kit");
  const { result, queueAhead } = await withSystem(async (tx) => {
    const result = await checkSos(tx, pincode, [{ spec: kit.spec, quantity: kit.boxes }]);
    const queueAhead = result.zone
      ? await tx.order.count({ where: { zoneId: result.zone.id, channel: "SOS_EXPRESS", status: { in: ["NEW", "PACKING"] } } })
      : 0;
    return { result, queueAhead };
  });
  // Don't disclose exact hub stock to the public.
  const { shortages, ...rest } = result;
  return NextResponse.json({ ...rest, queueAhead, lowStock: Boolean(shortages?.length) }, { headers: { "Cache-Control": "no-store" } });
});
