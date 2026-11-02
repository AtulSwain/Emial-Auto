const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function parts(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone, ...opts }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** "Thursday, 5 November 2026" — used in the access email and public pages. */
export function formatLongDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "2 Nov 2026, 14:05" — compact admin format. */
export function formatShortDateTime(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}
