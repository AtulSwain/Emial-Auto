import { newInviteSchema, firstIssue, type NewInviteInput } from "./validation";

export type BulkLine =
  | { line: number; raw: string; ok: true; value: NewInviteInput }
  | { line: number; raw: string; ok: false; error: string };

/** Parse "Name, email" or "Name, email, link" — one per line. Blank lines are skipped. */
export function parseBulk(text: string): BulkLine[] {
  const out: BulkLine[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const parts = raw.split(",").map((p) => p.trim());
    if (parts.length < 2 || parts.length > 3) {
      out.push({ line: i + 1, raw, ok: false, error: "Expected: Name, email[, link]" });
      return;
    }
    const parsed = newInviteSchema.safeParse({ name: parts[0], email: parts[1], testLink: parts[2] });
    if (!parsed.success) {
      out.push({ line: i + 1, raw, ok: false, error: firstIssue(parsed.error) });
      return;
    }
    if (seen.has(parsed.data.email)) {
      out.push({ line: i + 1, raw, ok: false, error: "Duplicate email in this list" });
      return;
    }
    seen.add(parsed.data.email);
    out.push({ line: i + 1, raw, ok: true, value: parsed.data });
  });
  return out;
}
