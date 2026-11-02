import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Same-origin check for state-changing requests (CSRF defence alongside SameSite=Lax). */
function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const unsafe = !SAFE_METHODS.has(req.method);

  // ── Public invite pages ─────────────────────────────────────────────
  if (pathname.startsWith("/i/")) {
    if (unsafe) {
      const { ok, retryAfterS } = rateLimit(`i:${clientIp(req.headers)}`, 20, 60_000);
      if (!ok) {
        return new NextResponse("Too many requests — please wait a minute and try again.", {
          status: 429,
          headers: { "Retry-After": String(retryAfterS), "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }
    return NextResponse.next();
  }

  // ── Admin ───────────────────────────────────────────────────────────
  const isApi = pathname.startsWith("/api/admin");
  if (unsafe && !sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  const isLogin = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isLogin) return NextResponse.next();

  const authed = await verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? "");
  if (authed) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*", "/i/:path*"],
};
