# Otakuva Creator Invites

A private invite system for Otakuva's pre-launch creator test. Type a creator's name and email in `/admin`, click **Send invite**, and they get a personal invitation. When they click **Accept** and confirm, they get a second email with their testing link right away, valid for 7 days (`ACCESS_DAYS`). After accepting they see two options: download the PDF tester guide, or open Otakuva.

Stack: Next.js 15 (App Router) · TypeScript · Neon Postgres + Drizzle · Resend (or Gmail SMTP) · Zod · Vitest. Deploys on Vercel.

![Invite email](docs/screenshots/email-invite-desktop.png)

---

## How it works

| Step | What happens |
|---|---|
| `/admin` → Send invite | Row created with a fresh token (only its SHA-256 hash is stored), invitation email sent. |
| Creator clicks **Accept invitation** | `GET /i/{token}` shows a confirm page. **A GET never accepts**, so Gmail/Outlook link scanners can't accept for them. |
| Creator clicks **I accept, let me in** | `POST /i/{token}/accept` sets `accepted`, `access_expires_at = now + ACCESS_DAYS`, sends the access email, pings you. |
| Accept clicked twice | Idempotent: the access window is never reset. The page offers "Resend my access email" (max 3). |
| **Not right now** | `/i/{token}/decline` confirm page → POST sets `declined` and pings you. |
| Daily cron | `/api/cron/expire` marks unaccepted invites past `INVITE_VALID_DAYS` as `expired`. |

Email templates are plain HTML in `src/emails/templates/` (`invite.html`, `access.html`, plus `.txt` plain-text twins). `{{PLACEHOLDER}}` values are HTML-escaped, and rendering fails if any placeholder is left over.

---

## Setup

### 1. Run it locally

```bash
pnpm install
cp .env.example .env.local      # then fill it in (see below)
pnpm db:migrate
pnpm dev                        # http://localhost:3000/admin
```

For local work without sending real email, set `EMAIL_PROVIDER=outbox`: every email is written to `./.outbox/` as `.html` + `.txt` so you can open it in a browser. (It refuses to run on Vercel.) `APP_URL=http://localhost:3000` is allowed locally; everywhere else it must be `https://`.

Any Postgres works locally, e.g. `DATABASE_URL=postgres://postgres:postgres@localhost:5432/otakuva`.

### 2. Create the Vercel project and add Neon

1. Push this repo to GitHub, then on [vercel.com/new](https://vercel.com/new) import it. Framework: Next.js (auto-detected). Vercel uses pnpm automatically.
2. In the project, open **Storage → Create Database → Neon (Marketplace)** and connect it to the project. Vercel adds `DATABASE_URL` (pooled) for you.
3. Run the migrations once against Neon from your machine:
   ```bash
   vercel env pull .env.local   # or paste DATABASE_URL into .env.local
   pnpm db:migrate
   ```
   Re-run `pnpm db:migrate` after any future schema change (`pnpm db:generate` creates new migration files in `drizzle/`).

### 3. Email: Resend (recommended)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add Domain** → enter your domain (e.g. `otakuva.com`, or a subdomain such as `mail.otakuva.com`).
3. Add the DNS records Resend shows at your DNS provider: one **MX** + one **TXT (SPF)** record on the `send` subdomain, and a **TXT (DKIM)** record `resend._domainkey`. Adding a **DMARC** TXT record at `_dmarc` (e.g. `v=DMARC1; p=none;`) helps Gmail inbox placement. Click **Verify**; it usually takes minutes, sometimes a few hours.
4. **API Keys → Create API Key** (Sending access) → set `RESEND_API_KEY`.
5. Set `EMAIL_FROM` to an address on the verified domain, e.g. `"Atul from Otakuva <atul@otakuva.com>"`.

> **Without a verified domain, Resend only delivers to your own Resend account email.** Creators won't receive anything. Use Gmail (below) until the domain is verified.

### 3b. Email: Gmail SMTP (until your domain is verified)

1. Turn on **2-Step Verification** for the Google account: <https://myaccount.google.com/security>.
2. Create an **App Password**: <https://myaccount.google.com/apppasswords> → name it "Otakuva invites" → copy the 16-character password.
3. Set:
   ```
   EMAIL_PROVIDER=gmail
   GMAIL_USER=dev.swainatul@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```
   Gmail always sends from `GMAIL_USER`; the display name from `EMAIL_FROM` ("Atul from Otakuva") is kept. A personal Gmail account can send roughly **500 emails/day**, plenty for a creator test.

Switch back to Resend later by changing `EMAIL_PROVIDER=resend`; nothing else changes.

### 4. Logo

Put the logo at **`public/logo.png`**: silver brushstroke ensō-mountain emblem on black, **144×144 PNG** (displayed at 72×72). It's loaded from `${APP_URL}/logo.png` in emails (PNG, not SVG, because Gmail blocks SVG), so deploy it before sending invites.

### 5. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in `.env.local` for local dev). The app refuses to boot and lists every missing or invalid variable.

| Variable | Required | Description |
|---|---|---|
| `APP_URL` | ✓ | Public base URL of this app, no trailing slash, e.g. `https://invites.otakuva.com`. Used in email links and the logo URL. |
| `DATABASE_URL` | ✓ | Neon Postgres (pooled) connection string. Added by the Neon integration. |
| `ADMIN_PASSWORD` | ✓ | Password for `/admin`. |
| `SESSION_SECRET` | ✓ | 32+ random characters; signs the admin cookie. `openssl rand -base64 32` |
| `CRON_SECRET` | ✓ | 16+ random characters. Vercel Cron sends it automatically as `Authorization: Bearer …`. |
| `EMAIL_PROVIDER` | | `resend` (default) or `gmail`. (`outbox` for local dev only.) |
| `RESEND_API_KEY` | if resend | Resend API key. |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | if gmail | Gmail address and App Password. |
| `EMAIL_FROM` | ✓ | `"Atul from Otakuva <atul@otakuva.com>"` |
| `EMAIL_REPLY_TO` | ✓ | Where creator replies go. |
| `ADMIN_NOTIFY_EMAIL` | ✓ | Gets a ping on every accept / decline. |
| `DEFAULT_TEST_LINK` | ✓ | https testing link used when an invite has none. |
| `FEEDBACK_URL` | | Google Form / Tally link. If empty, the "Share feedback →" line is hidden. |
| `ACCESS_DAYS` | | Testing window in days, default `7`. All email and page copy follows it. |
| `INVITE_VALID_DAYS` | | How long an unaccepted invite stays valid, default `14`. |
| `TIMEZONE` | | Time zone for every date shown, default `Asia/Kolkata`. |

### 6. Send yourself test emails

```bash
pnpm send-test          # renders both emails for "Riya" and sends them to ADMIN_NOTIFY_EMAIL
pnpm send-test --dry    # writes .preview/*.html and *.txt instead of sending
```

Subjects are prefixed with `[TEST]`. Links in test emails don't point at a real invite. Open them on your phone and desktop Gmail to check rendering.

### 7. Deploy and check

Deploy on Vercel, then:
1. Open `https://<APP_URL>/admin`, sign in, enter **Riya** and your own email, click **Send invite**.
2. Open the invite, click **Accept invitation**, then **Yes, send my access link**.
3. The access email arrives within seconds with the IST expiry date and your testing link; you also get a "✅ Riya … accepted" notification; the admin table shows Riya as **Accepted**.

---

## Admin dashboard (`/admin`)

- **Send invite**: Name, Email, optional Testing link. **Preview** opens the exact invite email in a new tab without sending.
- **Bulk**: one `Name, email` or `Name, email, link` per line → **Preview list** shows a checked table → **Send all** sends ~600 ms apart with a live progress list.
- **Invites table**: newest first, IST dates, status filter, counters, and the last send error in red.
  - *Resend invite* and *Copy accept link* issue a **new** link. Only token hashes are stored, so an old link can't be shown again; earlier invite links for that person stop working (the dashboard asks before doing this).
  - *Resend access email* (accepted only), *Revoke*.
- Duplicate emails are never created; you'll see the existing status with a **Resend invite** button.

## Security

- Raw tokens are never stored or logged; lookups go through the SHA-256 hash.
- Accept/decline are POST-only. Admin is protected in middleware: an HttpOnly, Secure, SameSite=Lax HMAC-signed cookie (7 days), constant-time password check, 5 login attempts per 15 min per IP, and an Origin check on every admin POST.
- `/i/*` POSTs are rate-limited per IP (in-memory, per instance).
- Public pages send `noindex` (meta + `X-Robots-Tag`).
- Logs contain only masked recipients and provider message ids, never bodies, links or keys.

## Tester guide (PDF)

The guide creators download after accepting lives at `public/otakuva-tester-guide.pdf`. Edit `guide/tester-guide.html`, then rebuild it with:

```bash
node scripts/build-guide.cjs
```

(It uses Playwright's Chromium to print the HTML to an A4 PDF.)

## Scripts

| Command | |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | Vitest: templates, IST dates, tokens, state machine, validation, session, env |
| `pnpm lint` | TypeScript check |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |
| `pnpm send-test` | Send both sample emails to `ADMIN_NOTIFY_EMAIL` |

## Screenshots

`docs/screenshots/` contains both emails, the confirm, success, already-accepted, decline, declined and invalid pages at 375px and 1280px, plus the admin dashboard.
