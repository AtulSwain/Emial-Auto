import { sql } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    testLink: text("test_link"),
    tokenHash: text("token_hash").notNull(),
    status: inviteStatus("status").notNull().default("pending"),
    invitedAt: tz("invited_at").notNull().defaultNow(),
    inviteExpiresAt: tz("invite_expires_at").notNull(),
    acceptedAt: tz("accepted_at"),
    accessExpiresAt: tz("access_expires_at"),
    declinedAt: tz("declined_at"),
    inviteEmailId: text("invite_email_id"),
    accessEmailId: text("access_email_id"),
    inviteSendCount: integer("invite_send_count").notNull().default(0),
    accessSendCount: integer("access_send_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("invites_email_unique").on(t.email),
    uniqueIndex("invites_token_hash_unique").on(t.tokenHash),
    index("invites_status_idx").on(t.status),
    index("invites_created_at_idx").on(t.createdAt),
  ],
);

export type Invite = typeof invites.$inferSelect;
export type InviteStatus = Invite["status"];
