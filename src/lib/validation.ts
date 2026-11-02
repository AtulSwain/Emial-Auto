import { z } from "zod";

// Control characters (incl. CR/LF) would break email headers and layouts.
const noControlChars = (s: string) => !/[\u0000-\u001f\u007f]/.test(s);

export const nameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Name is required")
      .max(60, "Name must be 60 characters or fewer")
      .refine(noControlChars, "Name contains invalid characters"),
  );

export const emailSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().max(254).email("Enter a valid email address"));

export const httpsUrlSchema = z
  .string()
  .trim()
  .max(2000, "Link is too long")
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" && Boolean(u.hostname);
    } catch {
      return false;
    }
  }, "Link must be a valid https:// URL");

/** Optional testing link: blank → null (use DEFAULT_TEST_LINK). */
export const optionalTestLinkSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null))
  .pipe(httpsUrlSchema.nullable());

export const newInviteSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  testLink: optionalTestLinkSchema,
});

export type NewInviteInput = z.infer<typeof newInviteSchema>;

export const statusFilterSchema = z
  .enum(["all", "pending", "accepted", "declined", "revoked", "expired"])
  .default("all");

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
