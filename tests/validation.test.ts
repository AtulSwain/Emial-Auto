import { describe, expect, it } from "vitest";
import { parseBulk } from "@/lib/bulk";
import { loadEnv } from "@/lib/env";
import { newInviteSchema } from "@/lib/validation";
import { createSessionValue, verifySessionValue } from "@/lib/session";

describe("invite input", () => {
  it("trims the name and lower-cases the email", () => {
    const r = newInviteSchema.parse({ name: "  Riya  ", email: " Riya@Example.COM ", testLink: "" });
    expect(r).toEqual({ name: "Riya", email: "riya@example.com", testLink: null });
  });

  it("rejects bad input", () => {
    expect(newInviteSchema.safeParse({ name: "", email: "a@b.co" }).success).toBe(false);
    expect(newInviteSchema.safeParse({ name: "x".repeat(61), email: "a@b.co" }).success).toBe(false);
    expect(newInviteSchema.safeParse({ name: "Riya", email: "nope" }).success).toBe(false);
    expect(newInviteSchema.safeParse({ name: "Riya", email: "a@b.co", testLink: "http://x.com" }).success).toBe(false);
    expect(newInviteSchema.safeParse({ name: "Riya", email: "a@b.co", testLink: "javascript:alert(1)" }).success).toBe(false);
    expect(newInviteSchema.safeParse({ name: "Ri\u0007ya", email: "a@b.co" }).success).toBe(false);
    // Newlines can't reach email headers: whitespace runs collapse to one space.
    expect(newInviteSchema.parse({ name: "Ri\r\nya", email: "a@b.co" }).name).toBe("Ri ya");
  });

  it("accepts an https link", () => {
    expect(newInviteSchema.parse({ name: "Riya", email: "a@b.co", testLink: "https://x.com/?a=1" }).testLink).toBe("https://x.com/?a=1");
  });
});

describe("bulk parser", () => {
  it("parses good lines and flags bad ones", () => {
    const r = parseBulk("Riya, riya@example.com\n\nKabir, KABIR@example.com, https://x.com\nbad line\nDup, riya@example.com");
    expect(r.map((l) => l.ok)).toEqual([true, true, false, false]);
    expect(r[1]).toMatchObject({ ok: true, value: { email: "kabir@example.com", testLink: "https://x.com" } });
    expect(r[3]).toMatchObject({ ok: false, error: "Duplicate email in this list" });
  });
});

describe("admin session", () => {
  const secret = "s".repeat(32);
  it("verifies a fresh cookie and rejects tampering or expiry", async () => {
    const v = await createSessionValue(secret, 1_000);
    expect(await verifySessionValue(v, secret, 2_000)).toBe(true);
    expect(await verifySessionValue(v, "t".repeat(32), 2_000)).toBe(false);
    expect(await verifySessionValue(v.replace(/^\d+/, "9999999999999"), secret, 2_000)).toBe(false);
    expect(await verifySessionValue(v, secret, 1_000 + 8 * 24 * 3600 * 1000)).toBe(false);
  });
});

describe("env", () => {
  const good = {
    APP_URL: "https://invites.otakuva.example/",
    DATABASE_URL: "postgres://x",
    ADMIN_PASSWORD: "pw",
    SESSION_SECRET: "s".repeat(32),
    CRON_SECRET: "c".repeat(16),
    RESEND_API_KEY: "re_x",
    EMAIL_FROM: "Atul <a@b.co>",
    EMAIL_REPLY_TO: "a@b.co",
    ADMIN_NOTIFY_EMAIL: "a@b.co",
    DEFAULT_TEST_LINK: "https://otakuva.vercel.app",
  };
  it("parses defaults and strips the trailing slash", () => {
    const e = loadEnv(good);
    expect(e.APP_URL).toBe("https://invites.otakuva.example");
    expect(e.ACCESS_DAYS).toBe(7);
    expect(e.INVITE_VALID_DAYS).toBe(14);
    expect(e.TIMEZONE).toBe("Asia/Kolkata");
    expect(e.FEEDBACK_URL).toBeUndefined();
  });
  it("fails with a clear message listing missing vars", () => {
    expect(() => loadEnv({ ...good, DATABASE_URL: "", RESEND_API_KEY: undefined })).toThrow(/DATABASE_URL[\s\S]*RESEND_API_KEY/);
  });
  it("requires Gmail credentials for EMAIL_PROVIDER=gmail", () => {
    expect(() => loadEnv({ ...good, EMAIL_PROVIDER: "gmail" })).toThrow(/GMAIL_USER/);
  });
});
