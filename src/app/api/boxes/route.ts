import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { boxSpecSchema } from "@/lib/domain/box";
import { withUser } from "@/lib/server/db";
import { handle, readJson } from "@/lib/server/http";

const schema = z.object({ name: z.string().trim().min(1).max(60), spec: boxSpecSchema });

/** Saving a custom box is one of the progressive-gate actions: OTP session required. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { name, spec } = await readJson(req, schema);
  const box = await withUser(user, (tx) =>
    tx.customBox.create({
      data: {
        userId: user.id,
        name,
        sleeveId: spec.sleeveId,
        ribbonText: spec.ribbonText || null,
        items: {
          create: [
            { itemId: spec.ribbonId, quantity: 1 },
            ...Object.entries(spec.items).map(([itemId, quantity]) => ({ itemId, quantity })),
          ],
        },
      },
      select: { id: true },
    }),
  );
  return NextResponse.json(box, { status: 201 });
});

export const GET = handle(async () => {
  const user = await requireUser();
  const boxes = await withUser(user, (tx) =>
    tx.customBox.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { items: true } }),
  );
  return NextResponse.json(boxes);
});
