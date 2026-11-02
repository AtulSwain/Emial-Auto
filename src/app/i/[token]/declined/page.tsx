import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeclinedState } from "@/components/InviteStates";
import { findByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thank you · Otakuva", robots: { index: false, follow: false } };

export default async function DeclinedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findByToken(token);
  if (!invite || invite.status !== "declined") redirect(`/i/${token}`);
  return <DeclinedState name={invite.name} />;
}
