import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { expireStaleInvites } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Vercel Cron calls this daily with "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expired = await expireStaleInvites();
  return NextResponse.json({ ok: true, expired });
}
