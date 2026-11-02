import { describe, expect, it } from "vitest";
import { addDays, formatLongDate, formatShortDateTime } from "@/lib/dates";

const IST = "Asia/Kolkata";

describe("IST date formatting", () => {
  it("formats like 'Thursday, 5 November 2026'", () => {
    expect(formatLongDate(new Date("2026-11-05T06:30:00Z"), IST)).toBe("Thursday, 5 November 2026");
  });

  it("uses the IST calendar day, not UTC", () => {
    // 20:00 UTC on the 4th is 01:30 IST on the 5th.
    expect(formatLongDate(new Date("2026-11-04T20:00:00Z"), IST)).toBe("Thursday, 5 November 2026");
    // 18:00 UTC on the 4th is 23:30 IST, still the 4th.
    expect(formatLongDate(new Date("2026-11-04T18:00:00Z"), IST)).toBe("Wednesday, 4 November 2026");
  });

  it("accepting on 2 Nov gives access until 5 Nov (3 days)", () => {
    const accepted = new Date("2026-11-02T10:00:00+05:30");
    expect(formatLongDate(addDays(accepted, 3), IST)).toBe("Thursday, 5 November 2026");
  });

  it("formats admin timestamps in IST, 24h", () => {
    expect(formatShortDateTime(new Date("2026-11-02T08:35:00Z"), IST)).toBe("2 Nov 2026, 14:05");
    expect(formatShortDateTime(new Date("2026-11-02T18:45:00Z"), IST)).toBe("3 Nov 2026, 00:15");
  });
});
