import { NextResponse } from "next/server";
import { clientIp, getCurrentUser } from "@/lib/auth/session";
import { contribute, contributeSchema, getSplitLink } from "@/lib/booking/split";
import { lookupHash } from "@/lib/server/crypto";
import { HttpError, handle, readJson } from "@/lib/server/http";
import { enforce } from "@/lib/server/rate-limit";

type Ctx = { params: Promise<{ token: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const link = await getSplitLink((await params).token);
  if (!link) throw new HttpError(404, "Link not found");
  return NextResponse.json(link, { headers: { "Cache-Control": "no-store" } });
});

/** Guests can chip in without an account; the token is the capability. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { token } = await params;
  await enforce(["splitPay", lookupHash(`${await clientIp()}:${token}`)]);
  const input = await readJson(req, contributeSchema);
  const user = await getCurrentUser();
  const payment = await contribute(token, input, user?.id);
  return NextResponse.json({ payment }, { status: 201 });
});
