import type { Invite } from "@/db/schema";

type StateFields = Pick<Invite, "status" | "inviteExpiresAt" | "accessExpiresAt">;

/** What the creator should see / what an accept POST should do. Pure — no I/O. */
export type InviteView =
  | { kind: "invalid" }
  | { kind: "revoked" }
  | { kind: "declined" }
  | { kind: "expired" }
  | { kind: "accepted"; accessEnded: boolean }
  | { kind: "pending" };

export function viewFor(invite: StateFields | null | undefined, now: Date): InviteView {
  if (!invite) return { kind: "invalid" };
  switch (invite.status) {
    case "revoked":
      return { kind: "revoked" };
    case "declined":
      return { kind: "declined" };
    case "expired":
      return { kind: "expired" };
    case "accepted":
      return {
        kind: "accepted",
        accessEnded: Boolean(invite.accessExpiresAt && invite.accessExpiresAt <= now),
      };
    case "pending":
      // The cron flips the status daily; treat a lapsed pending invite as expired right away.
      return invite.inviteExpiresAt <= now ? { kind: "expired" } : { kind: "pending" };
  }
}

export type AcceptDecision =
  | { action: "reject"; reason: "invalid" | "revoked" | "declined" | "expired" }
  | { action: "already_accepted" }
  | { action: "accept"; acceptedAt: Date; accessExpiresAt: Date };

/** The accept state machine. pending → accepted; accepted stays put; everything else is rejected. */
export function decideAccept(
  invite: StateFields | null | undefined,
  now: Date,
  accessDays: number,
): AcceptDecision {
  const v = viewFor(invite, now);
  switch (v.kind) {
    case "pending":
      return {
        action: "accept",
        acceptedAt: now,
        accessExpiresAt: new Date(now.getTime() + accessDays * 24 * 60 * 60 * 1000),
      };
    case "accepted":
      return { action: "already_accepted" };
    default:
      return { action: "reject", reason: v.kind };
  }
}

export type DeclineDecision =
  | { action: "decline" }
  | { action: "already_declined" }
  | { action: "reject"; reason: "invalid" | "revoked" | "expired" | "accepted" };

export function decideDecline(invite: StateFields | null | undefined, now: Date): DeclineDecision {
  const v = viewFor(invite, now);
  switch (v.kind) {
    case "pending":
      return { action: "decline" };
    case "declined":
      return { action: "already_declined" };
    default:
      return { action: "reject", reason: v.kind };
  }
}

/** Creator-initiated resends of the access email: 1 initial send + 3 resends. */
export const MAX_CREATOR_ACCESS_RESENDS = 3;
export function canCreatorResendAccess(invite: Pick<Invite, "status" | "accessSendCount">): boolean {
  return invite.status === "accepted" && invite.accessSendCount < 1 + MAX_CREATOR_ACCESS_RESENDS;
}
