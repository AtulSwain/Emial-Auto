import { NextResponse, type NextRequest } from "next/server";
import { toDto } from "@/lib/admin-dto";
import { findById, freshAcceptLink, resendAccess, resendInvite, revokeInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id, action } = await params;
  if (!(await findById(id))) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  switch (action) {
    case "resend-invite":
    case "resend-access": {
      const r = action === "resend-invite" ? await resendInvite(id) : await resendAccess(id);
      if (!("invite" in r)) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ invite: toDto(r.invite), sent: r.sent, error: r.error }, { status: r.sent ? 200 : 502 });
    }
    case "copy-link": {
      const r = await freshAcceptLink(id);
      if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
      const invite = await findById(id);
      return NextResponse.json({ url: r.url, invite: toDto(invite!) });
    }
    case "revoke": {
      const row = await revokeInvite(id);
      return NextResponse.json({ invite: toDto(row!) });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }
}
