import type { ReactNode } from "react";
import s from "./public.module.css";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className={s.page}>
      <div className={s.column}>
        <div className={s.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.logo} src="/logo.png" width={72} height={72} alt="Otakuva" />
          <div className={s.wordmark}>OTAKUVA</div>
        </div>
        <div className={s.card}>{children}</div>
        <p className={s.footer}>Otakuva · Mumbai, India</p>
      </div>
    </main>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <div className={s.pill}>{children}</div>;
}

export function Headline({ children }: { children: ReactNode }) {
  return <h1 className={s.headline}>{children}</h1>;
}

export function Body({ children }: { children: ReactNode }) {
  return <p className={s.body}>{children}</p>;
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}

export function PostButton({ action, label, formAction }: { action?: string; label: string; formAction?: (fd: FormData) => void | Promise<void> }) {
  return (
    <form className={s.form} method="post" action={formAction ?? action}>
      <button className={s.button} type="submit">
        {label}
      </button>
    </form>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={s.button} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={s.secondary} href={href}>
      {children}
    </a>
  );
}

export function SecondaryPost({ action, label }: { action: string; label: string }) {
  return (
    <form className={s.form} method="post" action={action}>
      <button className={s.secondary} type="submit">
        {label}
      </button>
    </form>
  );
}

export function AccessPanel({ date, children }: { date: string; children?: ReactNode }) {
  return (
    <div className={s.panel}>
      <div className={s.label}>Your access ends</div>
      <div className={s.date}>{date}</div>
      {children}
    </div>
  );
}

export type Option = { num: string; title: string; body: string; cta: string; href: string; download?: boolean; primary?: boolean };

/** Two side-by-side choices (stacked on phones). */
export function Options({ items }: { items: Option[] }) {
  return (
    <div className={s.options}>
      {items.map((o) => (
        <a
          key={o.num}
          className={`${s.option} ${o.primary ? s.optionPrimary : ""}`}
          href={o.href}
          {...(o.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
        >
          <span className={s.optionNum}>{o.num}</span>
          <span className={s.optionTitle}>{o.title}</span>
          <span className={s.optionBody}>{o.body}</span>
          <span className={s.optionCta}>{o.cta}</span>
        </a>
      ))}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>;
}

export function Flash({ children }: { children: ReactNode }) {
  return (
    <p className={s.flash} role="status">
      {children}
    </p>
  );
}

export function Signature() {
  return (
    <>
      <hr className={s.divider} />
      <div className={s.sigName}>Atul Swain</div>
      <div className={s.sigRole}>Founder, Otakuva</div>
    </>
  );
}

export { s as publicStyles };
