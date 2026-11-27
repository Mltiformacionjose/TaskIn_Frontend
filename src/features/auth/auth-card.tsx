import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  /** Enlace inferior («¿Ya tienes cuenta?…»). */
  footer?: ReactNode;
  /** Texto legal o aclaración final. */
  note: string;
  children: ReactNode;
};

/** Tarjeta común de WF-007, WF-008 y WF-009. */
export function AuthCard({ eyebrow, title, description, footer, note, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[440px] rounded-[17px] border border-line bg-panel p-[25px] shadow-[0_22px_75px_var(--shadow)] sm:p-[38px]">
      <p className="mb-[35px] text-2xl font-extrabold tracking-[0.04em]">TASKIN</p>
      <p className="mb-2.5 text-xs font-extrabold tracking-[0.09em] text-accent-text uppercase">{eyebrow}</p>
      <h1 className="mb-[9px] text-[25px] font-bold">{title}</h1>
      <p className="mb-[26px] text-sm leading-normal text-muted">{description}</p>
      {children}
      {footer && <div className="mt-[21px] text-center text-sm text-muted">{footer}</div>}
      <p className="mt-7 text-xs text-muted">{note}</p>
    </div>
  );
}
