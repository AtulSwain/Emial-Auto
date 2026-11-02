"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { InviteDto } from "@/lib/admin-dto";
import { parseBulk, type BulkLine } from "@/lib/bulk";
import s from "./admin.module.css";

type Status = InviteDto["status"];
type Filter = Status | "all";
type Counts = Record<Status | "total", number>;

type ApiResult = { invite?: InviteDto; sent?: boolean; error?: string; exists?: boolean; url?: string };

async function api(path: string, init?: RequestInit): Promise<ApiResult & { status: number }> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    return { status: 401, error: "Signed out" };
  }
  const data = (await res.json().catch(() => ({}))) as ApiResult;
  return { ...data, status: res.status };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Badge({ invite }: { invite: Pick<InviteDto, "status" | "accessEnded"> }) {
  if (invite.status === "accepted" && invite.accessEnded) {
    return <span className={`${s.badge} ${s.b_ended}`}>Access ended</span>;
  }
  const label = invite.status[0].toUpperCase() + invite.status.slice(1);
  return <span className={`${s.badge} ${s[`b_${invite.status}`]}`}>{label}</span>;
}

// ── Single invite ───────────────────────────────────────────────────────

type SingleMsg =
  | { kind: "ok"; text: string }
  | { kind: "err"; text: string; retryId?: string }
  | { kind: "exists"; invite: InviteDto };

function SingleForm({ defaultTestLink, onChange }: { defaultTestLink: string; onChange: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [testLink, setTestLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<SingleMsg | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    // The Preview button submits the form natively to a new tab — let it through.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name === "preview") return;
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api("/api/admin/invites", { method: "POST", body: JSON.stringify({ name, email, testLink }) });
    setBusy(false);
    if (r.status === 201 && r.invite) {
      setMsg({ kind: "ok", text: `Invite sent to ${r.invite.name} (${r.invite.email}).` });
      setName("");
      setEmail("");
      setTestLink("");
    } else if (r.exists && r.invite) {
      setMsg({ kind: "exists", invite: r.invite });
    } else {
      setMsg({ kind: "err", text: r.error ?? "Something went wrong.", retryId: r.invite?.id });
    }
    onChange();
  }

  async function resend(id: string) {
    setBusy(true);
    const r = await api(`/api/admin/invites/${id}/resend-invite`, { method: "POST" });
    setBusy(false);
    if (r.sent && r.invite) setMsg({ kind: "ok", text: `Invite sent to ${r.invite.name} (${r.invite.email}).` });
    else setMsg({ kind: "err", text: r.error ?? "Send failed.", retryId: id });
    onChange();
  }

  return (
    <form onSubmit={submit} method="post" action="/api/admin/preview" target="_blank">
      <div className={s.grid}>
        <label className={s.field}>
          <span className={s.fieldLabel}>Name</span>
          <input className={s.input} name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Riya" />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Email</span>
          <input className={s.input} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="riya@example.com" />
        </label>
        <label className={s.field}>
          <span className={s.fieldLabel}>Testing link (optional)</span>
          <input className={s.input} name="testLink" type="url" value={testLink} onChange={(e) => setTestLink(e.target.value)} placeholder={defaultTestLink} />
        </label>
      </div>
      <div className={s.row}>
        <button className={s.button} type="submit" name="send" disabled={busy}>
          {busy ? "Sending…" : "Send invite"}
        </button>
        <button className={s.ghost} type="submit" name="preview" formNoValidate={false}>
          Preview
        </button>
      </div>
      {msg?.kind === "ok" && <div className={s.msgOk}>✓ {msg.text}</div>}
      {msg?.kind === "err" && (
        <div className={s.msgErr}>
          <span>{msg.text}</span>
          {msg.retryId && (
            <button type="button" className={s.small} onClick={() => resend(msg.retryId!)} disabled={busy}>
              Retry
            </button>
          )}
        </div>
      )}
      {msg?.kind === "exists" && (
        <div className={s.msgInfo}>
          <span>
            {msg.invite.name} ({msg.invite.email}) is already in the list:
          </span>
          <Badge invite={msg.invite} />
          {msg.invite.status !== "accepted" && (
            <button type="button" className={s.small} onClick={() => resend(msg.invite.id)} disabled={busy}>
              Resend invite
            </button>
          )}
        </div>
      )}
    </form>
  );
}

// ── Bulk ────────────────────────────────────────────────────────────────

type Progress = { line: number; label: string; state: "wait" | "sending" | "sent" | "exists" | "failed"; note?: string };

function BulkForm({ onChange }: { onChange: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<BulkLine[] | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [running, setRunning] = useState(false);

  const valid = useMemo(() => (parsed ?? []).filter((l): l is Extract<BulkLine, { ok: true }> => l.ok), [parsed]);

  async function sendAll() {
    setRunning(true);
    const list: Progress[] = valid.map((l) => ({ line: l.line, label: `${l.value.name} <${l.value.email}>`, state: "wait" }));
    setProgress([...list]);
    for (let i = 0; i < valid.length; i++) {
      list[i] = { ...list[i], state: "sending" };
      setProgress([...list]);
      const r = await api("/api/admin/invites", { method: "POST", body: JSON.stringify(valid[i].value) });
      list[i] =
        r.status === 201
          ? { ...list[i], state: "sent" }
          : r.exists
            ? { ...list[i], state: "exists", note: `already ${r.invite?.status}` }
            : { ...list[i], state: "failed", note: r.error };
      setProgress([...list]);
      if (i < valid.length - 1) await sleep(600);
    }
    setRunning(false);
    onChange();
  }

  return (
    <div>
      <p className={s.hint}>
        One creator per line: <code>Name, email</code> or <code>Name, email, https://link</code>
      </p>
      <textarea
        className={s.textarea}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setParsed(null);
          setProgress([]);
        }}
        placeholder={"Riya, riya@example.com\nKabir, kabir@example.com, https://otakuva.vercel.app/?ref=kabir"}
      />
      <div className={s.row}>
        <button className={s.ghost} type="button" onClick={() => setParsed(parseBulk(text))} disabled={!text.trim() || running}>
          Preview list
        </button>
        {parsed && (
          <button className={s.button} type="button" onClick={sendAll} disabled={!valid.length || running || progress.length > 0}>
            {running ? "Sending…" : `Send all (${valid.length})`}
          </button>
        )}
      </div>

      {parsed && progress.length === 0 && (
        <div className={s.tableWrap} style={{ marginTop: 18 }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Line</th>
                <th>Name</th>
                <th>Email</th>
                <th>Testing link</th>
                <th>Check</th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((l) => (
                <tr key={l.line}>
                  <td>{l.line}</td>
                  {l.ok ? (
                    <>
                      <td className={s.name}>{l.value.name}</td>
                      <td>{l.value.email}</td>
                      <td>{l.value.testLink ?? <span style={{ color: "var(--label)" }}>default</span>}</td>
                      <td className={s.pSent}>OK</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={3} style={{ color: "var(--label)" }}>{l.raw}</td>
                      <td className={s.pErr}>{l.error}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {progress.length > 0 && (
        <ul className={s.progress}>
          {progress.map((p) => (
            <li key={p.line}>
              <span className={p.state === "sent" ? s.pSent : p.state === "failed" ? s.pErr : s.pWait}>
                {{ wait: "·", sending: "…", sent: "✓", exists: "=", failed: "✕" }[p.state]}
              </span>
              <span>{p.label}</span>
              {p.note && <span className={p.state === "failed" ? s.pErr : s.pWait}>{p.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────

function InviteRow({ inv, onChange }: { inv: InviteDto; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function act(action: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setNote(null);
    const r = await api(`/api/admin/invites/${inv.id}/${action}`, { method: "POST" });
    setBusy(false);
    if (action === "copy-link" && r.url) {
      try {
        await navigator.clipboard.writeText(r.url);
        setNote("Link copied");
      } catch {
        window.prompt("Copy this accept link:", r.url);
      }
    } else if (r.error) {
      setNote(r.error);
    } else if (r.sent) {
      setNote("Sent");
    }
    onChange();
  }

  const accepted = inv.status === "accepted";
  return (
    <tr>
      <td>
        <div className={s.name}>{inv.name}</div>
        {inv.testLink && <div style={{ color: "var(--label)", fontSize: 12 }}>{inv.testLink}</div>}
        {inv.lastError && <div className={s.error}>{inv.lastError}</div>}
      </td>
      <td>{inv.email}</td>
      <td>
        <Badge invite={inv} />
      </td>
      <td className={s.nowrap}>{inv.invited}</td>
      <td className={s.nowrap}>{inv.accepted ?? "—"}</td>
      <td className={s.nowrap}>{inv.accessEnds ?? "—"}</td>
      <td className={s.nowrap} title="invite emails / access emails">
        {inv.inviteSendCount} / {inv.accessSendCount}
      </td>
      <td>
        <div className={s.actions}>
          {!accepted && (
            <button className={s.small} disabled={busy} onClick={() => act("resend-invite", inv.status === "pending" ? undefined : `Re-open and resend the invite to ${inv.name}?`)}>
              Resend invite
            </button>
          )}
          {accepted && (
            <button className={s.small} disabled={busy} onClick={() => act("resend-access")}>
              Resend access email
            </button>
          )}
          {!accepted && (
            <button
              className={s.small}
              disabled={busy}
              onClick={() =>
                act(
                  "copy-link",
                  `Copy a fresh accept link for ${inv.name}?\n\nLinks are stored only as a hash, so this creates a new one — the link in earlier invite emails will stop working.`,
                )
              }
            >
              Copy accept link
            </button>
          )}
          {inv.status !== "revoked" && (
            <button className={`${s.small} ${s.danger}`} disabled={busy} onClick={() => act("revoke", `Revoke ${inv.name}'s invite? Their link will stop working.`)}>
              Revoke
            </button>
          )}
        </div>
        {note && <div style={{ fontSize: 12, marginTop: 6, color: "var(--pill-text)" }}>{note}</div>}
      </td>
    </tr>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function Dashboard({ defaultTestLink }: { defaultTestLink: string }) {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [filter, setFilter] = useState<Filter>("all");
  const [invites, setInvites] = useState<InviteDto[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/invites?status=${filter}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    if (!res.ok) {
      setLoadError("Couldn't load invites. Check the database connection.");
      return;
    }
    const data = (await res.json()) as { invites: InviteDto[]; counts: Counts };
    setInvites(data.invites);
    setCounts(data.counts);
    setLoadError(null);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <header className={s.header}>
          <div className={s.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" width={40} height={40} alt="Otakuva" />
            <div>
              <div className={s.wordmark}>OTAKUVA</div>
              <div className={s.sub}>Creator invites</div>
            </div>
          </div>
          <form method="post" action="/api/admin/logout">
            <button className={s.small} type="submit">
              Sign out
            </button>
          </form>
        </header>

        <div className={s.counters}>
          {(
            [
              ["Invited", counts?.total],
              ["Accepted", counts?.accepted],
              ["Declined", counts?.declined],
              ["Pending", counts?.pending],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className={s.counter}>
              <div className={s.counterLabel}>{label}</div>
              <div className={s.counterValue}>{n ?? "–"}</div>
            </div>
          ))}
        </div>

        <section className={s.card}>
          <div className={s.tabs} role="tablist">
            <button role="tab" aria-selected={tab === "single"} className={`${s.tab} ${tab === "single" ? s.tabActive : ""}`} onClick={() => setTab("single")}>
              Send invite
            </button>
            <button role="tab" aria-selected={tab === "bulk"} className={`${s.tab} ${tab === "bulk" ? s.tabActive : ""}`} onClick={() => setTab("bulk")}>
              Bulk
            </button>
          </div>
          {tab === "single" ? <SingleForm defaultTestLink={defaultTestLink} onChange={load} /> : <BulkForm onChange={load} />}
        </section>

        <section className={s.card}>
          <div className={s.toolbar}>
            <h2 className={s.h2}>Invites</h2>
            <select className={s.select} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          {loadError && <div className={s.msgErr}>{loadError}</div>}
          {invites && invites.length === 0 && <div className={s.empty}>No invites yet.</div>}
          {invites && invites.length > 0 && (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invited (IST)</th>
                    <th>Accepted (IST)</th>
                    <th>Access ends (IST)</th>
                    <th>Sends</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((inv) => (
                    <InviteRow key={inv.id} inv={inv} onChange={load} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
