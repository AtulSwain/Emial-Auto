import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE, cookieOptions, createSessionValue } from "@/lib/session";

export const dynamic = "force-dynamic";

function passwordMatches(input: string, expected: string): boolean {
  // Hash both sides so lengths match and comparison time doesn't leak anything.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const key = `login:${ip}`;
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);

  const { ok } = rateLimit(key, 5, 15 * 60_000);
  if (!ok) return back("rate");

  const form = await req.formData().catch(() => null);
  const password = typeof form?.get("password") === "string" ? (form!.get("password") as string) : "";
  if (!password || !passwordMatches(password, env().ADMIN_PASSWORD)) return back("invalid");

  resetRateLimit(key);
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  const secure = new URL(req.url).protocol === "https:" || env().APP_URL.startsWith("https://");
  res.cookies.set(SESSION_COOKIE, await createSessionValue(env().SESSION_SECRET), cookieOptions(secure));
  return res;
}
