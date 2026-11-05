import { describe, expect, it } from "vitest";
import { renderAccessEmail, renderInviteEmail } from "@/emails";
import { escapeHtml, renderTemplate } from "@/emails/render";

const base = { appUrl: "https://invites.otakuva.example", name: "Riya", email: "riya@example.com", accessDays: 7 };
const token = "A".repeat(43);

describe("renderTemplate", () => {
  it("escapes every value in html mode", () => {
    expect(renderTemplate("<p>{{X}}</p>", { X: `<script>"a"&'b'</script>` }, { mode: "html" })).toBe(
      "<p>&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;</p>",
    );
  });

  it("leaves values raw in text mode", () => {
    expect(renderTemplate("Hi {{X}}", { X: "R&D <x>" }, { mode: "text" })).toBe("Hi R&D <x>");
  });

  it("throws on a missing value", () => {
    expect(() => renderTemplate("{{MISSING}}", {}, { mode: "html" })).toThrow(/MISSING/);
  });

  it("handles show / hide sections", () => {
    const t = "a{{#F}}[on]{{/F}}{{^F}}[off]{{/F}}b";
    expect(renderTemplate(t, {}, { mode: "text", sections: { F: true } })).toBe("a[on]b");
    expect(renderTemplate(t, {}, { mode: "text", sections: { F: false } })).toBe("a[off]b");
  });

  it("escapeHtml covers the five special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("invite email", () => {
  const m = renderInviteEmail({ ...base, token });

  it("has no leftover tokens", () => {
    expect(m.html).not.toMatch(/\{\{|\}\}/);
    expect(m.text).not.toMatch(/\{\{|\}\}/);
  });

  it("uses the spec subject, preheader, headline and links", () => {
    expect(m.subject).toBe("Riya, you're invited to test Otakuva first");
    expect(m.html).toContain("Riya, you&#39;re one of the first creators personally invited to test Otakuva before anyone else.");
    expect(m.html).toContain("Riya, you're<br>first in line.");
    expect(m.html).toContain(`href="https://invites.otakuva.example/i/${token}"`);
    expect(m.html).toContain(`href="https://invites.otakuva.example/i/${token}/decline"`);
    expect(m.html).toContain('src="https://invites.otakuva.example/logo.png"');
    expect(m.html).toContain('alt="Otakuva"');
    expect(m.html).toContain('<meta name="color-scheme" content="dark">');
    expect(m.html).toContain("PRIVATE INVITATION &middot; 招待状");
    expect(m.html).toContain("This invitation was sent personally to riya@example.com and is not transferable.");
    expect(m.html).toContain(">7 days, from when you accept<");
    expect(m.text).toContain("WINDOW: 7 days, from when you accept");
  });

  it("plain text has the raw URLs", () => {
    expect(m.text).toContain(`https://invites.otakuva.example/i/${token}\n`);
    expect(m.text).toContain(`https://invites.otakuva.example/i/${token}/decline`);
    expect(m.text).toContain("Otakuva · Mumbai, India");
  });

  it("escapes a hostile name", () => {
    const evil = renderInviteEmail({ ...base, name: `<img src=x onerror=alert(1)>`, token });
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("stays well under Gmail's 102 KB clip limit", () => {
    expect(Buffer.byteLength(m.html)).toBeLessThan(100 * 1024);
  });

  it("contains no scripts, external CSS or SVG", () => {
    expect(m.html).not.toMatch(/<script|<link|<style|\.svg/i);
  });
});

describe("access email", () => {
  const input = {
    ...base,
    testLink: "https://otakuva.vercel.app/?ref=riya&x=1",
    accessExpiresAt: new Date("2026-11-05T06:30:00Z"),
    timeZone: "Asia/Kolkata",
  };

  it("renders spec copy with the IST date and escaped link", () => {
    const m = renderAccessEmail({ ...input, feedbackUrl: "https://tally.so/r/abc" });
    expect(m.subject).toBe("Your Otakuva access is open, Riya");
    expect(m.html).toContain("Welcome in,<br>Riya.");
    expect(m.html).toContain("Thursday, 5 November 2026");
    expect(m.html).toContain('href="https://otakuva.vercel.app/?ref=riya&amp;x=1"');
    expect(m.html).toContain("Share feedback &rarr;");
    expect(m.html).toContain("Your 7-day pre-launch access to Otakuva starts now.");
    expect(m.html).toContain("When your 7 days are up");
    expect(m.html).toContain('href="https://invites.otakuva.example/otakuva-tester-guide.pdf"');
    expect(m.text).toContain("https://invites.otakuva.example/otakuva-tester-guide.pdf");
    expect(m.html).toContain('href="https://tally.so/r/abc"');
    expect(m.html).not.toMatch(/\{\{|\}\}/);
    expect(m.text).toContain("https://otakuva.vercel.app/?ref=riya&x=1");
    expect(m.text).toContain("https://tally.so/r/abc");
    expect(m.text).not.toMatch(/\{\{|\}\}/);
    expect(Buffer.byteLength(m.html)).toBeLessThan(100 * 1024);
  });

  it("hides the feedback line when FEEDBACK_URL is empty", () => {
    const m = renderAccessEmail(input);
    expect(m.html).not.toContain("Share feedback");
    expect(m.text).not.toContain("Share feedback");
    expect(m.html).not.toMatch(/\{\{|\}\}/);
  });
});
