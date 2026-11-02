import type { Metadata } from "next";
import {
  AccessEndedState,
  AlreadyAcceptedState,
  ConfirmState,
  DeclinedState,
  ExpiredState,
  InvalidState,
  RevokedState,
} from "@/components/InviteStates";
import { viewFor } from "@/lib/invite-state";
import { findByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Otakuva invitation", robots: { index: false, follow: false } };

// GET never changes anything: email scanners open links automatically.
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ resent?: string }>;
}) {
  const { token } = await params;
  const { resent } = await searchParams;
  const invite = await findByToken(token);
  const view = viewFor(invite, new Date());

  switch (view.kind) {
    case "invalid":
      return <InvalidState />;
    case "revoked":
      return <RevokedState />;
    case "declined":
      return <DeclinedState name={invite!.name} />;
    case "expired":
      return <ExpiredState name={invite!.name} />;
    case "accepted":
      return view.accessEnded ? (
        <AccessEndedState invite={invite!} />
      ) : (
        <AlreadyAcceptedState invite={invite!} token={token} flash={asFlash(resent)} />
      );
    case "pending":
      return <ConfirmState invite={invite!} token={token} />;
  }
}

function asFlash(v: string | undefined) {
  return v === "sent" || v === "failed" || v === "limit" ? v : undefined;
}
