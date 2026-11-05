import { and, count, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { invites, type Invite, type InviteStatus } from "@/db/schema";
import { guideAttachment, renderAccessEmail, renderInviteEmail, inviteUrls } from "@/emails";
import { addDays, formatLongDate } from "./dates";
import { errorMessage, sendEmail } from "./email";
import { env } from "./env";
import { decideAccept, decideDecline, canCreatorResendAccess } from "./invite-state";
import { generateToken, hashToken, isWellFormedToken } from "./tokens";
import type { NewInviteInput } from "./validation";

export function testLinkFor(invite: Pick<Invite, "testLink">): string {
  return invite.testLink ?? env().DEFAULT_TEST_LINK;
}

export function acceptLink(token: string): string {
  return inviteUrls(env().APP_URL, token).acceptUrl;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// ── Lookups ────────────────────────────────────────────────────────────

export async function findByToken(token: string): Promise<Invite | null> {
  if (!isWellFormedToken(token)) return null;
  const [row] = await db().select().from(invites).where(eq(invites.tokenHash, hashToken(token))).limit(1);
  return row ?? null;
}

export async function findById(id: string): Promise<Invite | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db().select().from(invites).where(eq(invites.id, id)).limit(1);
  return row ?? null;
}

export async function findByEmail(email: string): Promise<Invite | null> {
  const [row] = await db().select().from(invites).where(eq(invites.email, email)).limit(1);
  return row ?? null;
}

export async function listInvites(status: InviteStatus | "all"): Promise<Invite[]> {
  const q = db().select().from(invites);
  return (status === "all" ? q : q.where(eq(invites.status, status))).orderBy(desc(invites.createdAt));
}

export async function inviteCounts(): Promise<Record<InviteStatus | "total", number>> {
  const rows = await db().select({ status: invites.status, n: count() }).from(invites).groupBy(invites.status);
  const out = { total: 0, pending: 0, accepted: 0, declined: 0, revoked: 0, expired: 0 };
  for (const r of rows) {
    out[r.status] = Number(r.n);
    out.total += Number(r.n);
  }
  return out;
}

// ── Sending ────────────────────────────────────────────────────────────

export type SendOutcome = { invite: Invite; sent: boolean; error?: string };

async function sendInviteEmailFor(invite: Invite, token: string): Promise<SendOutcome> {
  const e = env();
  const email = renderInviteEmail({ appUrl: e.APP_URL, name: invite.name, email: invite.email, token, accessDays: e.ACCESS_DAYS });
  try {
    const { id } = await sendEmail({
      to: invite.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [guideAttachment()],
    });
    const [row] = await db()
      .update(invites)
      .set({ inviteEmailId: id, inviteSendCount: sql`${invites.inviteSendCount} + 1`, lastError: null })
      .where(eq(invites.id, invite.id))
      .returning();
    return { invite: row, sent: true };
  } catch (err) {
    const msg = `Invite email failed: ${errorMessage(err)}`;
    const [row] = await db().update(invites).set({ lastError: msg }).where(eq(invites.id, invite.id)).returning();
    return { invite: row, sent: false, error: msg };
  }
}

export async function sendAccessEmailFor(invite: Invite): Promise<SendOutcome> {
  const e = env();
  if (invite.status !== "accepted" || !invite.accessExpiresAt) {
    return { invite, sent: false, error: "Invite is not accepted" };
  }
  const email = renderAccessEmail({
    appUrl: e.APP_URL,
    name: invite.name,
    email: invite.email,
    testLink: testLinkFor(invite),
    accessExpiresAt: invite.accessExpiresAt,
    timeZone: e.TIMEZONE,
    accessDays: e.ACCESS_DAYS,
    feedbackUrl: e.FEEDBACK_URL,
  });
  try {
    const { id } = await sendEmail({ to: invite.email, subject: email.subject, html: email.html, text: email.text });
    const [row] = await db()
      .update(invites)
      .set({ accessEmailId: id, accessSendCount: sql`${invites.accessSendCount} + 1`, lastError: null })
      .where(eq(invites.id, invite.id))
      .returning();
    return { invite: row, sent: true };
  } catch (err) {
    const msg = `Access email failed: ${errorMessage(err)}`;
    const [row] = await db().update(invites).set({ lastError: msg }).where(eq(invites.id, invite.id)).returning();
    return { invite: row, sent: false, error: msg };
  }
}

/** Short plain-text ping to ADMIN_NOTIFY_EMAIL. Best effort: never blocks the creator. */
async function notifyAdmin(subject: string): Promise<void> {
  try {
    await sendEmail({ to: env().ADMIN_NOTIFY_EMAIL, subject, text: `${subject}\n\n${env().APP_URL}/admin\n` });
  } catch {
    // Already logged by sendEmail.
  }
}

// ── Admin actions ──────────────────────────────────────────────────────

export type CreateResult =
  | ({ kind: "created" } & SendOutcome)
  | { kind: "exists"; invite: Invite };

export async function createInvite(input: NewInviteInput, now = new Date()): Promise<CreateResult> {
  const existing = await findByEmail(input.email);
  if (existing) return { kind: "exists", invite: existing };

  const token = generateToken();
  let row: Invite;
  try {
    [row] = await db()
      .insert(invites)
      .values({
        name: input.name,
        email: input.email,
        testLink: input.testLink,
        tokenHash: hashToken(token),
        status: "pending",
        invitedAt: now,
        inviteExpiresAt: addDays(now, env().INVITE_VALID_DAYS),
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      const dup = await findByEmail(input.email);
      if (dup) return { kind: "exists", invite: dup };
    }
    throw err;
  }
  return { kind: "created", ...(await sendInviteEmailFor(row, token)) };
}

/**
 * Issue a fresh token and reset the invite to pending with a new expiry.
 * Only the hash is stored, so any older link for this invite stops working.
 */
async function rotateToken(invite: Invite, now: Date): Promise<{ invite: Invite; token: string }> {
  const token = generateToken();
  const [row] = await db()
    .update(invites)
    .set({
      tokenHash: hashToken(token),
      status: "pending",
      declinedAt: null,
      invitedAt: now,
      inviteExpiresAt: addDays(now, env().INVITE_VALID_DAYS),
    })
    .where(eq(invites.id, invite.id))
    .returning();
  return { invite: row, token };
}

export async function resendInvite(id: string, now = new Date()): Promise<SendOutcome | { error: string }> {
  const invite = await findById(id);
  if (!invite) return { error: "Invite not found" };
  if (invite.status === "accepted") return { error: "Already accepted — use “Resend access email” instead" };
  const { invite: fresh, token } = await rotateToken(invite, now);
  return sendInviteEmailFor(fresh, token);
}

export async function freshAcceptLink(id: string, now = new Date()): Promise<{ url: string } | { error: string }> {
  const invite = await findById(id);
  if (!invite) return { error: "Invite not found" };
  if (invite.status === "accepted") return { error: "Already accepted" };
  const { token } = await rotateToken(invite, now);
  return { url: acceptLink(token) };
}

export async function resendAccess(id: string): Promise<SendOutcome | { error: string }> {
  const invite = await findById(id);
  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "accepted") return { error: "Only accepted invites have an access email" };
  return sendAccessEmailFor(invite);
}

export async function revokeInvite(id: string): Promise<Invite | null> {
  const [row] = await db().update(invites).set({ status: "revoked" }).where(eq(invites.id, id)).returning();
  return row ?? null;
}

/** Cron: pending invites past their expiry become expired. Accepted rows are left alone. */
export async function expireStaleInvites(now = new Date()): Promise<number> {
  const rows = await db()
    .update(invites)
    .set({ status: "expired" })
    .where(and(eq(invites.status, "pending"), lte(invites.inviteExpiresAt, now)))
    .returning({ id: invites.id });
  return rows.length;
}

// ── Creator actions ────────────────────────────────────────────────────

export type AcceptResult =
  | { outcome: "invalid" | "revoked" | "declined" | "expired" }
  | { outcome: "accepted" | "already_accepted"; invite: Invite; emailSent: boolean };

export async function acceptInvite(token: string, now = new Date()): Promise<AcceptResult> {
  const e = env();
  const invite = await findByToken(token);
  const decision = decideAccept(invite, now, e.ACCESS_DAYS);

  if (decision.action === "reject") return { outcome: decision.reason };
  if (decision.action === "already_accepted") {
    return { outcome: "already_accepted", invite: invite!, emailSent: false };
  }

  // Guarded update inside a transaction: only a still-pending, unexpired row flips.
  // A double-click or concurrent POST finds nothing to update and falls through
  // to the idempotent "already accepted" path, so the access window never resets.
  const updated = await db().transaction(async (tx) => {
    const [row] = await tx
      .update(invites)
      .set({ status: "accepted", acceptedAt: decision.acceptedAt, accessExpiresAt: decision.accessExpiresAt })
      .where(and(eq(invites.id, invite!.id), eq(invites.status, "pending"), gt(invites.inviteExpiresAt, now)))
      .returning();
    return row;
  });

  if (!updated) {
    const again = await findById(invite!.id);
    const second = decideAccept(again, now, e.ACCESS_DAYS);
    if (second.action === "already_accepted") return { outcome: "already_accepted", invite: again!, emailSent: false };
    return { outcome: second.action === "reject" ? second.reason : "invalid" };
  }

  const sent = await sendAccessEmailFor(updated);
  await notifyAdmin(
    `✅ ${updated.name} (${updated.email}) accepted, access until ${formatLongDate(updated.accessExpiresAt!, e.TIMEZONE)}`,
  );
  return { outcome: "accepted", invite: sent.invite, emailSent: sent.sent };
}

export type ResendAccessResult = "sent" | "failed" | "limit" | "not_accepted";

export async function creatorResendAccess(token: string): Promise<ResendAccessResult> {
  const invite = await findByToken(token);
  if (!invite || invite.status !== "accepted") return "not_accepted";
  if (!canCreatorResendAccess(invite)) return "limit";
  const r = await sendAccessEmailFor(invite);
  return r.sent ? "sent" : "failed";
}

export type DeclineResult = "declined" | "already_declined" | "invalid" | "revoked" | "expired" | "accepted";

export async function declineInvite(token: string, now = new Date()): Promise<DeclineResult> {
  const invite = await findByToken(token);
  const decision = decideDecline(invite, now);
  if (decision.action === "reject") return decision.reason;
  if (decision.action === "already_declined") return "already_declined";

  const [row] = await db()
    .update(invites)
    .set({ status: "declined", declinedAt: now })
    .where(and(eq(invites.id, invite!.id), eq(invites.status, "pending")))
    .returning();
  if (!row) return "already_declined";

  await notifyAdmin(`❌ ${row.name} (${row.email}) declined the invite`);
  return "declined";
}
