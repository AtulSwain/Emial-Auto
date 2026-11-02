import type { Invite } from "@/db/schema";
import { formatShortDateTime } from "./dates";
import { env } from "./env";

export type InviteDto = {
  id: string;
  name: string;
  email: string;
  testLink: string | null;
  effectiveTestLink: string;
  status: Invite["status"];
  invited: string;
  accepted: string | null;
  accessEnds: string | null;
  accessEnded: boolean;
  inviteSendCount: number;
  accessSendCount: number;
  lastError: string | null;
};

export function toDto(i: Invite, now = new Date()): InviteDto {
  const e = env();
  const fmt = (d: Date | null) => (d ? formatShortDateTime(d, e.TIMEZONE) : null);
  return {
    id: i.id,
    name: i.name,
    email: i.email,
    testLink: i.testLink,
    effectiveTestLink: i.testLink ?? e.DEFAULT_TEST_LINK,
    status: i.status,
    invited: fmt(i.invitedAt)!,
    accepted: fmt(i.acceptedAt),
    accessEnds: fmt(i.accessExpiresAt),
    accessEnded: i.status === "accepted" && Boolean(i.accessExpiresAt && i.accessExpiresAt <= now),
    inviteSendCount: i.inviteSendCount,
    accessSendCount: i.accessSendCount,
    lastError: i.lastError,
  };
}
