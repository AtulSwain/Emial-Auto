// Renders both emails with sample data and sends them to ADMIN_NOTIFY_EMAIL so
// you can check them in Gmail on phone and desktop.
// Usage: pnpm send-test            (sends)
//        pnpm send-test --dry      (writes .preview/*.html and *.txt only)
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { mkdirSync, writeFileSync } from "node:fs";
import { renderAccessEmail, renderInviteEmail } from "../src/emails";
import { addDays } from "../src/lib/dates";
import { sendEmail } from "../src/lib/email";
import { loadEnv } from "../src/lib/env";
import { generateToken } from "../src/lib/tokens";

const dry = process.argv.includes("--dry");
const e = loadEnv();
const sample = { name: "Riya", email: "riya@example.com" };

const invite = renderInviteEmail({ appUrl: e.APP_URL, ...sample, token: generateToken() });
const access = renderAccessEmail({
  appUrl: e.APP_URL,
  ...sample,
  testLink: e.DEFAULT_TEST_LINK,
  accessExpiresAt: addDays(new Date(), e.ACCESS_DAYS),
  timeZone: e.TIMEZONE,
  feedbackUrl: e.FEEDBACK_URL,
});

for (const [label, m] of [["invite", invite], ["access", access]] as const) {
  const kb = (Buffer.byteLength(m.html, "utf8") / 1024).toFixed(1);
  console.log(`${label}: "${m.subject}" — HTML ${kb} KB`);
}

if (dry) {
  mkdirSync(".preview", { recursive: true });
  writeFileSync(".preview/invite.html", invite.html);
  writeFileSync(".preview/invite.txt", invite.text);
  writeFileSync(".preview/access.html", access.html);
  writeFileSync(".preview/access.txt", access.text);
  console.log("✓ Wrote .preview/ (nothing sent)");
} else {
  // Note: the links in these test emails don't point at a real invite.
  for (const m of [invite, access]) {
    const { id } = await sendEmail({ to: e.ADMIN_NOTIFY_EMAIL, subject: `[TEST] ${m.subject}`, html: m.html, text: m.text });
    console.log(`✓ Sent "${m.subject}" (${id})`);
  }
}
