import { describe, expect, it } from "vitest";
import { generateToken, hashToken, isWellFormedToken } from "@/lib/tokens";

describe("tokens", () => {
  it("are 32 random bytes in base64url", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(t, "base64url")).toHaveLength(32);
    expect(isWellFormedToken(t)).toBe(true);
  });

  it("are unique", () => {
    const set = new Set(Array.from({ length: 1000 }, generateToken));
    expect(set.size).toBe(1000);
  });

  it("hash to a stable SHA-256 hex digest that differs from the token", () => {
    const t = generateToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("rejects malformed tokens", () => {
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken("a".repeat(42) + "/")).toBe(false);
  });
});
