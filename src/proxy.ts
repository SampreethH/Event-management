import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isStaffRole, verifySession } from "@/lib/auth/token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// /checkout stays public so guests can review a cart and send a WhatsApp brief;
// the booking API itself requires a session.
const GATED = ["/dashboard", "/admin"];

/**
 * Two cheap, optimistic checks before a request reaches the app:
 *  1. CSRF — state-changing API calls must come from our own origin. Session
 *     cookies are SameSite=Lax as a second layer; Server Actions get Next's own
 *     origin check. Signed webhooks are exempt.
 *  2. Route gating — redirect signed-out visitors to /login. Real authorization
 *     happens again in each handler against the DB session (requireUser()).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && !SAFE_METHODS.has(req.method) && !pathname.startsWith("/api/webhooks/")) {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    return NextResponse.next();
  }

  if (GATED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!claims) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && (!isStaffRole(claims.role) || !claims.f.includes("totp"))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === req.headers.get("host");
    } catch {
      return false;
    }
  }
  // Some same-origin fetches omit Origin; fall back to Fetch Metadata.
  return req.headers.get("sec-fetch-site") === "same-origin";
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/admin/:path*"],
};
