import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, base64url (43 chars, URL-safe, no padding). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest. Only this is stored; the raw token lives in the email link. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cheap shape check so junk URLs never hit the database. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
