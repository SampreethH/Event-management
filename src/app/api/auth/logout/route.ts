import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { handle } from "@/lib/server/http";

export const POST = handle(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
