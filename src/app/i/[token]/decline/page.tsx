import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeclineConfirmState } from "@/components/InviteStates";
import { viewFor } from "@/lib/invite-state";
import { declineInvite, findByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Not right now · Otakuva", robots: { index: false, follow: false } };

export default async function DeclinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findByToken(token);
  const view = viewFor(invite, new Date());
  // Only a live pending invite can be declined; every other state has its own page.
  if (view.kind === "declined") redirect(`/i/${token}/declined`);
  if (view.kind !== "pending") redirect(`/i/${token}`);

  // POST /i/[token]/decline (Next.js server action on this page).
  async function confirmDecline() {
    "use server";
    const result = await declineInvite(token);
    redirect(result === "declined" || result === "already_declined" ? `/i/${token}/declined` : `/i/${token}`);
  }

  return <DeclineConfirmState invite={invite!} token={token} action={confirmDecline} />;
}
