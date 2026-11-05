import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => u.startsWith("https://"), "must be an https:// URL");

// APP_URL may be http://localhost during local development only.
const appUrl = z
  .string()
  .trim()
  .url()
  .transform((u) => u.replace(/\/+$/, ""))
  .refine(
    (u) =>
      u.startsWith("https://") ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u),
    "must be https:// (http://localhost is allowed for local dev)",
  );

const required = (name: string) =>
  z.string({ error: `${name} is required` }).trim().min(1, `${name} is required`);

const schema = z
  .object({
    APP_URL: appUrl,
    DATABASE_URL: required("DATABASE_URL"),
    ADMIN_PASSWORD: required("ADMIN_PASSWORD"),
    SESSION_SECRET: required("SESSION_SECRET").pipe(
      z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    ),
    CRON_SECRET: required("CRON_SECRET").pipe(
      z.string().min(16, "CRON_SECRET must be at least 16 characters"),
    ),

    // "outbox" is for local development only: emails are written to ./.outbox.
    EMAIL_PROVIDER: z.enum(["resend", "gmail", "outbox"]).default("resend"),
    RESEND_API_KEY: z.string().trim().optional(),
    GMAIL_USER: z.string().trim().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),

    EMAIL_FROM: required("EMAIL_FROM"),
    EMAIL_REPLY_TO: z.string().trim().email(),
    ADMIN_NOTIFY_EMAIL: z.string().trim().email(),

    DEFAULT_TEST_LINK: httpsUrl,
    FEEDBACK_URL: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(httpsUrl.optional()),
    ACCESS_DAYS: z.coerce.number().int().min(1).max(60).default(7),
    INVITE_VALID_DAYS: z.coerce.number().int().min(1).max(365).default(14),
    TIMEZONE: z
      .string()
      .trim()
      .default("Asia/Kolkata")
      .refine((tz) => {
        try {
          new Intl.DateTimeFormat("en-GB", { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, "must be a valid IANA time zone, e.g. Asia/Kolkata"),
  });

// Provider-specific requirements, checked separately so they're reported even
// when other variables are also missing.
function providerIssues(src: Record<string, string | undefined>): string[] {
  const provider = src.EMAIL_PROVIDER ?? "resend";
  const out: string[] = [];
  if (provider === "resend" && !src.RESEND_API_KEY) out.push("  • RESEND_API_KEY: RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  if (provider === "gmail") {
    if (!src.GMAIL_USER) out.push("  • GMAIL_USER: GMAIL_USER is required when EMAIL_PROVIDER=gmail");
    if (!src.GMAIL_APP_PASSWORD) out.push("  • GMAIL_APP_PASSWORD: GMAIL_APP_PASSWORD is required when EMAIL_PROVIDER=gmail");
  }
  if (provider === "outbox" && src.VERCEL) out.push("  • EMAIL_PROVIDER: outbox is for local development only — use resend or gmail on Vercel");
  return out;
}

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parse and validate process.env. Throws one clear error listing every problem. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // Treat empty strings as "not set" so `KEY=` in .env behaves like a missing key.
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const result = schema.safeParse(cleaned);
  const lines = [
    ...(result.success ? [] : result.error.issues.map((i) => `  • ${i.path.join(".") || "(env)"}: ${i.message}`)),
    ...providerIssues(cleaned),
  ];
  if (!result.success || lines.length) {
    throw new Error(
      `Otakuva invites: invalid environment configuration.\n${lines.join("\n")}\nSee .env.example for every variable.`,
    );
  }
  return result.data!;
}

export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}
