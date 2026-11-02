import { NextResponse, type NextRequest } from "next/server";
import { acceptInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

// POST only. A GET (e.g. a link scanner) just bounces back to the confirm page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/i/${token}`, req.url), 303);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await acceptInvite(token);
  const dest =
    result.outcome === "accepted" || result.outcome === "already_accepted" ? `/i/${token}/welcome` : `/i/${token}`;
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
