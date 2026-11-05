import type { Invite } from "@/db/schema";
import { formatLongDate } from "@/lib/dates";
import { env } from "@/lib/env";
import { canCreatorResendAccess } from "@/lib/invite-state";
import { testLinkFor } from "@/lib/invites";
import { GUIDE_PATH, windowText } from "@/emails";
import {
  AccessPanel,
  Actions,
  Body,
  Flash,
  Headline,
  LinkButton,
  Note,
  Options,
  Pill,
  PostButton,
  SecondaryLink,
  SecondaryPost,
  Shell,
  Signature,
} from "./Public";

export function ConfirmState({ invite, token }: { invite: Invite; token: string }) {
  const days = windowText(env().ACCESS_DAYS);
  return (
    <Shell>
      <Pill>PRE-LAUNCH ACCESS · 先行公開</Pill>
      <Headline>Welcome to Otakuva pre-launch access, {invite.name}.</Headline>
      <Body>
        You&apos;re one of the first creators to step inside Otakuva before the world does. For{" "}
        <strong>{days}</strong>, the whole site is yours to explore, push and shape.
      </Body>
      <Body>
        Agree below and you&apos;ll get your tester guide and your personal Otakuva link right away. A copy also goes to{" "}
        <strong>{invite.email}</strong>.
      </Body>
      <Actions>
        <PostButton action={`/i/${token}/accept`} label="I agree" />
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
      {flash === "failed" && <Flash>That didn&apos;t go through. Use the buttons above, or reply to my invite and I&apos;ll sort it.</Flash>}
      {flash === "limit" && <Flash>I&apos;ve resent it a few times already. Use the buttons above, or reply to my invite and I&apos;ll help.</Flash>}
      {canCreatorResendAccess(invite) && flash !== "limit" && (
        <Actions>
          <SecondaryPost action={`/i/${token}/resend`} label="Resend my access email" />
        </Actions>
      )}
    </>
  );
}

/** The two things a tester needs: the guide and the site. */
function StartOptions({ invite }: { invite: Invite }) {
  return (
    <Options
      items={[
        {
          num: "01",
          title: "Tester guide",
          body: "Step-by-step: signing in with Google, your one-time code, setting a password, and what to try first.",
          cta: "Download PDF ↓",
          href: GUIDE_PATH,
          download: true,
        },
        {
          num: "02",
          title: "Go to Otakuva",
          body: "Go straight to the Otakuva welcome page and start exploring.",
          cta: "Go to Otakuva →",
          href: testLinkFor(invite),
          primary: true,
        },
      ]}
    />
  );
}

function AccessEnds({ invite }: { invite: Invite }) {
  return (
    <AccessPanel date={formatLongDate(invite.accessExpiresAt!, env().TIMEZONE)}>
      <Note>Your Otakuva link is unique to you — please don&apos;t share it.</Note>
    </AccessPanel>
  );
}

/** Shown straight after accepting. */
export function WelcomeState({ invite, token, flash }: { invite: Invite; token: string; flash: ResendFlash }) {
  const emailOk = invite.accessSendCount > 0;
  return (
    <Shell>
      <Pill>ACCESS GRANTED · ようこそ</Pill>
      <Headline>You&apos;re in, {invite.name}.</Headline>
      <Body>
        Welcome to pre-launch access. Start with the tester guide if it&apos;s your first time, or jump straight into Otakuva.{" "}
        {emailOk ? (
          <>
            Both are also on their way to <strong>{invite.email}</strong>.
          </>
        ) : (
          <>The email to {invite.email} is taking a little longer, so everything you need is right here.</>
        )}
      </Body>
      <StartOptions invite={invite} />
      <AccessEnds invite={invite} />
      <ResendBlock invite={invite} token={token} flash={flash} />
      <Signature />
    </Shell>
  );
}

/** Visiting the invite link again after accepting. */
export function AlreadyAcceptedState({ invite, token, flash }: { invite: Invite; token: string; flash: ResendFlash }) {
  const date = formatLongDate(invite.accessExpiresAt!, env().TIMEZONE);
  return (
    <Shell>
      <Pill>ACCESS GRANTED · ようこそ</Pill>
      <Headline>Welcome back, {invite.name}.</Headline>
      <Body>
        Your pre-launch access is live until <strong>{date}</strong>. Your tester guide and Otakuva link are right here.
      </Body>
      <StartOptions invite={invite} />
      <AccessEnds invite={invite} />
      <ResendBlock invite={invite} token={token} flash={flash} />
      <Signature />
    </Shell>
  );
}

export function AccessEndedState({ invite }: { invite: Invite }) {
  const feedback = env().FEEDBACK_URL;
  return (
    <Shell>
      <Pill>PRE-LAUNCH ACCESS · ありがとう</Pill>
      <Headline>Thank you, {invite.name}.</Headline>
      <Body>
        Your {windowText(env().ACCESS_DAYS)} of pre-launch access have ended. I&apos;d love your unfiltered thoughts: what felt
        great, what felt off, and what&apos;s missing.
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
