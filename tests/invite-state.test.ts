import { describe, expect, it } from "vitest";
import { canCreatorResendAccess, decideAccept, decideDecline, viewFor } from "@/lib/invite-state";

const now = new Date("2026-11-02T10:00:00Z");
const future = new Date("2026-11-10T00:00:00Z");
const past = new Date("2026-11-01T00:00:00Z");
const inv = (status: "pending" | "accepted" | "declined" | "revoked" | "expired", extra = {}) => ({
  status,
  inviteExpiresAt: future,
  accessExpiresAt: null as Date | null,
  ...extra,
});

describe("accept state machine", () => {
  it("pending → accepted with a 3-day window", () => {
    const d = decideAccept(inv("pending"), now, 3);
    expect(d).toEqual({
      action: "accept",
      acceptedAt: now,
      accessExpiresAt: new Date("2026-11-05T10:00:00Z"),
    });
  });

  it("accepted stays accepted (idempotent, no new window)", () => {
    const d = decideAccept(inv("accepted", { accessExpiresAt: new Date("2026-11-04T00:00:00Z") }), now, 3);
    expect(d).toEqual({ action: "already_accepted" });
  });

  it.each(["declined", "revoked", "expired"] as const)("%s is rejected", (status) => {
    expect(decideAccept(inv(status), now, 3)).toEqual({ action: "reject", reason: status });
  });

  it("a pending invite past its expiry is rejected as expired", () => {
    expect(decideAccept(inv("pending", { inviteExpiresAt: past }), now, 3)).toEqual({ action: "reject", reason: "expired" });
  });

  it("an unknown token is rejected as invalid", () => {
    expect(decideAccept(null, now, 3)).toEqual({ action: "reject", reason: "invalid" });
  });
});

describe("decline", () => {
  it("pending → declined", () => expect(decideDecline(inv("pending"), now)).toEqual({ action: "decline" }));
  it("declined is idempotent", () => expect(decideDecline(inv("declined"), now)).toEqual({ action: "already_declined" }));
  it("accepted can't be declined", () =>
    expect(decideDecline(inv("accepted", { accessExpiresAt: future }), now)).toEqual({ action: "reject", reason: "accepted" }));
});

describe("view", () => {
  it("flags access ended after the window", () => {
    expect(viewFor(inv("accepted", { accessExpiresAt: past }), now)).toEqual({ kind: "accepted", accessEnded: true });
    expect(viewFor(inv("accepted", { accessExpiresAt: future }), now)).toEqual({ kind: "accepted", accessEnded: false });
  });

  it("creator resends are capped at 3 after the first send", () => {
    expect(canCreatorResendAccess({ status: "accepted", accessSendCount: 1 })).toBe(true);
    expect(canCreatorResendAccess({ status: "accepted", accessSendCount: 3 })).toBe(true);
    expect(canCreatorResendAccess({ status: "accepted", accessSendCount: 4 })).toBe(false);
    expect(canCreatorResendAccess({ status: "pending", accessSendCount: 0 })).toBe(false);
  });
});
