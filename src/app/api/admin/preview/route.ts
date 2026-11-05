import { NextResponse, type NextRequest } from "next/server";
import { renderInviteEmail } from "@/emails";
import { env } from "@/lib/env";
import { escapeHtml } from "@/emails/render";
import { firstIssue, newInviteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Renders the exact invite email in a new tab. Nothing is stored or sent.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const parsed = newInviteSchema.safeParse({
    name: form?.get("name") ?? "",
    email: form?.get("email") ?? "",
    testLink: form?.get("testLink") ?? "",
  });
  if (!parsed.success) {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><body style="background:#000;color:#f5f5f7;font-family:sans-serif;padding:40px">Can't preview: ${escapeHtml(firstIssue(parsed.error))}</body>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
  const email = renderInviteEmail({
    appUrl: env().APP_URL,
    name: parsed.data.name,
    email: parsed.data.email,
    accessDays: env().ACCESS_DAYS,
    token: "PREVIEW-not-a-real-token-xxxxxxxxxxxxxxxxx",
  });
  return new NextResponse(email.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-Email-Subject": encodeURIComponent(email.subject),
    },
  });
}
