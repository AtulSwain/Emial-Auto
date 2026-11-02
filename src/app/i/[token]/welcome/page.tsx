import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeState } from "@/components/InviteStates";
import { findByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You're in · Otakuva", robots: { index: false, follow: false } };

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ resent?: string }>;
}) {
  const { token } = await params;
  const { resent } = await searchParams;
  const invite = await findByToken(token);
  // Anything other than a live, accepted invite gets the normal state page.
  if (!invite || invite.status !== "accepted" || !invite.accessExpiresAt || invite.accessExpiresAt <= new Date()) {
    redirect(`/i/${token}`);
  }
  const flash = resent === "sent" || resent === "failed" || resent === "limit" ? resent : undefined;
  return <WelcomeState invite={invite} token={token} flash={flash} />;
}
