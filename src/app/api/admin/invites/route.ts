import { NextResponse, type NextRequest } from "next/server";
import { toDto } from "@/lib/admin-dto";
import { createInvite, inviteCounts, listInvites } from "@/lib/invites";
import { firstIssue, newInviteSchema, statusFilterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const parsed = statusFilterSchema.safeParse(req.nextUrl.searchParams.get("status") ?? undefined);
  const status = parsed.success ? parsed.data : "all";
  const [rows, counts] = await Promise.all([listInvites(status), inviteCounts()]);
  const now = new Date();
  return NextResponse.json({ invites: rows.map((r) => toDto(r, now)), counts });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = newInviteSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  const result = await createInvite(parsed.data);
  if (result.kind === "exists") {
    return NextResponse.json(
      { error: "This email has already been invited.", exists: true, invite: toDto(result.invite) },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { invite: toDto(result.invite), sent: result.sent, error: result.error },
    { status: result.sent ? 201 : 502 },
  );
}
