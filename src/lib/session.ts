// Admin session cookie, signed with HMAC-SHA256 via Web Crypto so it works in
// both the edge middleware and Node route handlers.

export const SESSION_COOKIE = "otk_admin";
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionValue(secret: string, now = Date.now()): Promise<string> {
  const exp = now + SESSION_MAX_AGE_S * 1000;
  return `${exp}.${await hmac(secret, `admin.${exp}`)}`;
}

export async function verifySessionValue(value: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!value || !secret) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp <= now) return false;
  return safeEqual(sig, await hmac(secret, `admin.${exp}`));
}

export function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  };
}
