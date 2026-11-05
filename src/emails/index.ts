import { readFileSync } from "node:fs";
import path from "node:path";
import { formatLongDate } from "@/lib/dates";
import { loadTemplate, renderTemplate } from "./render";

/** "7 days", "1 day" — the testing window in words, from ACCESS_DAYS. */
export function windowText(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export const GUIDE_PATH = "/otakuva-tester-guide.pdf";

let guidePdf: Buffer | undefined;

/** The tester guide PDF, attached to every invite. */
export function guideAttachment() {
  guidePdf ??= readFileSync(path.join(process.cwd(), "public", "otakuva-tester-guide.pdf"));
  return { filename: "Otakuva-Tester-Guide.pdf", content: guidePdf, contentType: "application/pdf" };
}

export type RenderedEmail = { subject: string; html: string; text: string };

/** Collapse whitespace the plain-text sections leave behind. */
function tidyText(s: string): string {
  return s.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export type InviteEmailInput = {
  appUrl: string;
  name: string;
  email: string;
  token: string;
  accessDays: number;
};

export function inviteUrls(appUrl: string, token: string) {
  return {
    acceptUrl: `${appUrl}/i/${token}`,
    declineUrl: `${appUrl}/i/${token}/decline`,
  };
}

export function renderInviteEmail(input: InviteEmailInput): RenderedEmail {
  const { acceptUrl, declineUrl } = inviteUrls(input.appUrl, input.token);
  const subject = `${input.name}, you're invited to test Otakuva first`;
  const values = {
    SUBJECT: subject,
    PREHEADER: `${input.name}, you're one of the first creators personally invited to test Otakuva before anyone else.`,
    APP_URL: input.appUrl,
    NAME: input.name,
    EMAIL: input.email,
    ACCEPT_URL: acceptUrl,
    DECLINE_URL: declineUrl,
    WINDOW: windowText(input.accessDays),
  };
  return {
    subject,
    html: renderTemplate(loadTemplate("invite.html"), values, { mode: "html" }),
    text: tidyText(renderTemplate(loadTemplate("invite.txt"), values, { mode: "text" })),
  };
}

export type AccessEmailInput = {
  appUrl: string;
  name: string;
  email: string;
  testLink: string;
  accessExpiresAt: Date;
  timeZone: string;
  accessDays: number;
  feedbackUrl?: string;
};

export function renderAccessEmail(input: AccessEmailInput): RenderedEmail {
  const subject = `Your Otakuva access is open, ${input.name}`;
  const values = {
    SUBJECT: subject,
    PREHEADER: `Welcome in, ${input.name}. Your ${input.accessDays}-day pre-launch access to Otakuva starts now.`,
    APP_URL: input.appUrl,
    NAME: input.name,
    EMAIL: input.email,
    TEST_LINK: input.testLink,
    ACCESS_ENDS: formatLongDate(input.accessExpiresAt, input.timeZone),
    FEEDBACK_URL: input.feedbackUrl ?? "",
    WINDOW: windowText(input.accessDays),
    GUIDE_URL: `${input.appUrl}${GUIDE_PATH}`,
  };
  const sections = { FEEDBACK: Boolean(input.feedbackUrl) };
  return {
    subject,
    html: renderTemplate(loadTemplate("access.html"), values, { mode: "html", sections }),
    text: tidyText(renderTemplate(loadTemplate("access.txt"), values, { mode: "text", sections })),
  };
}
