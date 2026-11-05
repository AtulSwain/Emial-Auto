import { env } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html?: string;
  text: string;
  /** Defaults to EMAIL_REPLY_TO. */
  replyTo?: string;
  attachments?: Attachment[];
};

export type Attachment = { filename: string; content: Buffer; contentType: string };

export type SendResult = { id: string };

type Provider = (msg: Required<Pick<OutgoingEmail, "to" | "subject" | "text" | "replyTo">> & { html?: string; from: string; attachments?: Attachment[] }) => Promise<SendResult>;

let resendClient: import("resend").Resend | undefined;
let gmailTransport: import("nodemailer").Transporter | undefined;

const resendProvider: Provider = async (msg) => {
  if (!resendClient) {
    const { Resend } = await import("resend");
    resendClient = new Resend(env().RESEND_API_KEY);
  }
  const { data, error } = await resendClient.emails.send({
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo,
    attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
  if (error || !data) throw new Error(`Resend: ${error?.message ?? "no message id returned"}`);
  return { id: data.id };
};

const gmailProvider: Provider = async (msg) => {
  if (!gmailTransport) {
    const nodemailer = (await import("nodemailer")).default;
    gmailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env().GMAIL_USER, pass: env().GMAIL_APP_PASSWORD?.replace(/\s+/g, "") },
    });
  }
  const info = await gmailTransport.sendMail({
    // Gmail only sends as the signed-in account, so keep EMAIL_FROM's display name
    // ("Atul from Otakuva") with the Gmail address.
    from: { name: displayName(msg.from), address: env().GMAIL_USER! },
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo,
    attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
  return { id: info.messageId };
};

export function displayName(from: string): string {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/);
  return m?.[1]?.trim() || "Otakuva";
}

// Local development: write each email to ./.outbox instead of sending it.
const outboxProvider: Provider = async (msg) => {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { randomUUID } = await import("node:crypto");
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}_${randomUUID().slice(0, 8)}`;
  await mkdir(".outbox", { recursive: true });
  await writeFile(`.outbox/${id}.json`, JSON.stringify({ from: msg.from, to: msg.to, replyTo: msg.replyTo, subject: msg.subject }, null, 2));
  await writeFile(`.outbox/${id}.txt`, msg.text);
  if (msg.html) await writeFile(`.outbox/${id}.html`, msg.html);
  for (const a of msg.attachments ?? []) await writeFile(`.outbox/${id}__${a.filename}`, a.content);
  return { id: `outbox:${id}` };
};

/** Mask "riya@example.com" → "ri***@example.com" for logs. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain ?? ""}`;
}

/**
 * Send one email through the configured provider (EMAIL_PROVIDER).
 * Logs only the masked recipient, subject length and provider id — never bodies or links.
 */
export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const e = env();
  const provider = { resend: resendProvider, gmail: gmailProvider, outbox: outboxProvider }[e.EMAIL_PROVIDER];
  try {
    const result = await provider({
      from: e.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo ?? e.EMAIL_REPLY_TO,
      attachments: msg.attachments,
    });
    console.info(`[email] sent via ${e.EMAIL_PROVIDER} to ${maskEmail(msg.to)} id=${result.id}`);
    return result;
  } catch (err) {
    const message = errorMessage(err);
    console.error(`[email] failed via ${e.EMAIL_PROVIDER} to ${maskEmail(msg.to)}: ${message}`);
    throw new Error(message);
  }
}

export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.slice(0, 500);
}
