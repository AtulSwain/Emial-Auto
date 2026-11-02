import type { Invite } from "@/db/schema";
import { formatLongDate } from "@/lib/dates";
import { env } from "@/lib/env";
import { canCreatorResendAccess } from "@/lib/invite-state";
import { testLinkFor } from "@/lib/invites";
import {
  AccessPanel,
  Actions,
  Body,
  Flash,
  Headline,
  LinkButton,
  Note,
  Pill,
  PostButton,
  SecondaryLink,
  SecondaryPost,
  Shell,
  Signature,
} from "./Public";

export function ConfirmState({ invite, token }: { invite: Invite; token: string }) {
  return (
    <Shell>
      <Pill>PRIVATE INVITATION · 招待状</Pill>
      <Headline>Hi {invite.name}, ready to start your 3-day early access?</Headline>
      <Body>
        The moment you confirm, I&apos;ll send your personal testing link to <strong>{invite.email}</strong>. Your three
        days start then, so pick a time when you can really dig in.
      </Body>
      <Actions>
        <PostButton action={`/i/${token}/accept`} label="Yes, send my access link" />
        <SecondaryLink href={`/i/${token}/decline`}>Not right now</SecondaryLink>
      </Actions>
      <Signature />
    </Shell>
  );
}

export type ResendFlash = "sent" | "failed" | "limit" | undefined;

function ResendBlock({ invite, token, flash }: { invite: Invite; token: string; flash: ResendFlash }) {
  return (
    <>
      {flash === "sent" && <Flash>Done — I&apos;ve sent it again. Check your inbox (and Promotions or Spam, just in case).</Flash>}
      {flash === "failed" && <Flash>That didn&apos;t go through. Use the button above, or reply to my invite and I&apos;ll sort it.</Flash>}
      {flash === "limit" && <Flash>I&apos;ve resent it a few times already. Use the button above, or reply to my invite and I&apos;ll help.</Flash>}
      {canCreatorResendAccess(invite) && flash !== "limit" && (
        <Actions>
          <SecondaryPost action={`/i/${token}/resend`} label="Resend my access email" />
        </Actions>
      )}
    </>
  );
}

/** Shown straight after accepting. */
export function WelcomeState({ invite, token, flash }: { invite: Invite; token: string; flash: ResendFlash }) {
  const e = env();
  const emailOk = invite.accessSendCount > 0;
  return (
    <Shell>
      <Pill>ACCESS GRANTED · ようこそ</Pill>
      <Headline>You&apos;re in, {invite.name}.</Headline>
      {emailOk ? (
        <Body>
          Your access link is on its way to <strong>{invite.email}</strong>. If it&apos;s taking a moment, you can jump
          straight in from here.
        </Body>
      ) : (
        <Body>
          Your access is live. The email to <strong>{invite.email}</strong> is taking longer than usual, so here&apos;s
          your link right away.
        </Body>
      )}
      <AccessPanel date={formatLongDate(invite.accessExpiresAt!, e.TIMEZONE)}>
        <Actions>
          <LinkButton href={testLinkFor(invite)}>Open Otakuva</LinkButton>
        </Actions>
        <Note>This link is unique to you — please don&apos;t share it.</Note>
      </AccessPanel>
      <ResendBlock invite={invite} token={token} flash={flash} />
      <Signature />
    </Shell>
  );
}

/** Visiting the invite link again after accepting. */
export function AlreadyAcceptedState({ invite, token, flash }: { invite: Invite; token: string; flash: ResendFlash }) {
  const e = env();
  const date = formatLongDate(invite.accessExpiresAt!, e.TIMEZONE);
  return (
    <Shell>
      <Pill>ACCESS GRANTED · ようこそ</Pill>
      <Headline>You&apos;re already in, {invite.name}.</Headline>
      <Body>
        Your early access is live until <strong>{date}</strong>. Your link is right here, and I can resend the email if
        you need it.
      </Body>
      <AccessPanel date={date}>
        <Actions>
          <LinkButton href={testLinkFor(invite)}>Open Otakuva</LinkButton>
        </Actions>
        <Note>This link is unique to you — please don&apos;t share it.</Note>
      </AccessPanel>
      <ResendBlock invite={invite} token={token} flash={flash} />
      <Signature />
    </Shell>
  );
}

export function AccessEndedState({ invite }: { invite: Invite }) {
  const feedback = env().FEEDBACK_URL;
  return (
    <Shell>
      <Pill>EARLY ACCESS · ありがとう</Pill>
      <Headline>Thank you, {invite.name}.</Headline>
      <Body>
        Your three days of early access have ended. I&apos;d love your unfiltered thoughts: what felt great, what felt
        off, and what&apos;s missing.
      </Body>
      {feedback ? (
        <Actions>
          <LinkButton href={feedback}>Share feedback</LinkButton>
        </Actions>
      ) : (
        <Body>Just reply to my email — it comes straight to me.</Body>
      )}
      <Signature />
    </Shell>
  );
}

export function DeclineConfirmState({ invite, token, action }: { invite: Invite; token: string; action: (fd: FormData) => Promise<void> }) {
  return (
    <Shell>
      <Pill>PRIVATE INVITATION · 招待状</Pill>
      <Headline>Not the right time, {invite.name}?</Headline>
      <Body>That&apos;s completely fine. Confirm below and I&apos;ll let this invite go — no hard feelings at all.</Body>
      <Actions>
        <PostButton formAction={action} label="Yes, decline the invite" />
        <SecondaryLink href={`/i/${token}`}>Actually, I&apos;d like to join</SecondaryLink>
      </Actions>
      <Signature />
    </Shell>
  );
}

export function DeclinedState({ name }: { name: string }) {
  return (
    <Shell>
      <Pill>THANK YOU · ありがとう</Pill>
      <Headline>No problem at all, {name}.</Headline>
      <Body>Thanks for letting me know. I&apos;ll keep you posted when Otakuva launches.</Body>
      <Signature />
    </Shell>
  );
}

export function ExpiredState({ name }: { name?: string }) {
  return (
    <Shell>
      <Pill>PRIVATE INVITATION</Pill>
      <Headline>{name ? `Sorry, ${name} — this invite has expired.` : "This invite has expired."}</Headline>
      <Body>
        Invites stay open for {env().INVITE_VALID_DAYS} days, and this one has run out. If you&apos;d still like to try
        Otakuva early, just reply to my email and I&apos;ll send you a fresh one.
      </Body>
      <Signature />
    </Shell>
  );
}

export function RevokedState() {
  return (
    <Shell>
      <Pill>PRIVATE INVITATION</Pill>
      <Headline>This invite is no longer active.</Headline>
      <Body>This invitation has been withdrawn. If you think that&apos;s a mistake, reply to my email and I&apos;ll sort it out.</Body>
      <Signature />
    </Shell>
  );
}

export function InvalidState() {
  return (
    <Shell>
      <Pill>PRIVATE INVITATION</Pill>
      <Headline>This link doesn&apos;t look right.</Headline>
      <Body>
        It may be incomplete, or I may have sent you a newer invite since. Please open the link in my most recent email
        — or just reply to it and I&apos;ll help.
      </Body>
      <Signature />
    </Shell>
  );
}
