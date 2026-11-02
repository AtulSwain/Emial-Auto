import type { Metadata } from "next";
import s from "../admin.module.css";

export const metadata: Metadata = { title: "Admin · Otakuva", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "That password isn't right.",
  rate: "Too many attempts. Wait 15 minutes and try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className={s.loginPage}>
      <div className={s.loginCol}>
        <div className={s.loginBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" width={72} height={72} alt="Otakuva" />
          <div className={s.wordmark}>OTAKUVA</div>
        </div>
        <form className={s.card} method="post" action="/api/admin/login">
          <h1 className={s.h2}>Invite admin</h1>
          <label className={s.field}>
            <span className={s.fieldLabel}>Password</span>
            <input className={s.input} type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {error && ERRORS[error] && <div className={s.msgErr}>{ERRORS[error]}</div>}
          <div className={s.row}>
            <button className={s.button} type="submit">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
