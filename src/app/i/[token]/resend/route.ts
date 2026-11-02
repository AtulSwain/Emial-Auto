import { NextResponse, type NextRequest } from "next/server";
import { creatorResendAccess } from "@/lib/invites";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/i/${token}`, req.url), 303);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await creatorResendAccess(token);
  // Return to whichever page the button was on.
  const from = req.headers.get("referer") ?? "";
  const base = /\/welcome(\?|$)/.test(from) ? `/i/${token}/welcome` : `/i/${token}`;
  const dest = result === "not_accepted" ? `/i/${token}` : `${base}?resent=${result}`;
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
