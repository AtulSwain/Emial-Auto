import { formatLongDate } from "@/lib/dates";
import { loadTemplate, renderTemplate } from "./render";

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
  feedbackUrl?: string;
};

export function renderAccessEmail(input: AccessEmailInput): RenderedEmail {
  const subject = `Your Otakuva access is open, ${input.name}`;
  const values = {
    SUBJECT: subject,
    PREHEADER: `Welcome in, ${input.name}. Your 3-day early access to Otakuva starts now.`,
    APP_URL: input.appUrl,
    NAME: input.name,
    EMAIL: input.email,
    TEST_LINK: input.testLink,
    ACCESS_ENDS: formatLongDate(input.accessExpiresAt, input.timeZone),
    FEEDBACK_URL: input.feedbackUrl ?? "",
  };
  const sections = { FEEDBACK: Boolean(input.feedbackUrl) };
  return {
    subject,
    html: renderTemplate(loadTemplate("access.html"), values, { mode: "html", sections }),
    text: tidyText(renderTemplate(loadTemplate("access.txt"), values, { mode: "text", sections })),
  };
}
