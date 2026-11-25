"use client";

import { useState } from "react";
import { useSession } from "@/features/auth/session-provider";
import { resendVerification } from "@/services/auth";
import { errorMessage } from "@/services/errors";

/**
 * RF-06: aviso mientras el correo no esté verificado. No bloquea nada; permite
 * pedir otro enlace (el anterior deja de valer).
 */
export function VerifyEmailBanner() {
  const { user } = useSession();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  if (user.email_verified) return null;

  const resend = async () => {
    setPending(true);
    setMessage(null);
    try {
      await resendVerification();
      setMessage({ ok: true, text: `Te hemos enviado un enlace nuevo a ${user.email}.` });
    } catch (error) {
      setMessage({ ok: false, text: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="Correo sin confirmar"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-panel border border-warning/40 bg-warning-soft px-4 py-3 text-sm"
    >
      <p className="min-w-0 flex-1">
        Confirma tu correo <strong>{user.email}</strong> con el enlace que te enviamos.
        {message && (
          <span role={message.ok ? "status" : "alert"} className={message.ok ? "block text-muted" : "block text-danger-text"}>
            {message.text}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="cursor-pointer rounded-[9px] border border-line bg-panel-2 px-3 py-2 text-xs font-semibold hover:bg-accent-tint disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Reenviar enlace"}
      </button>
    </section>
  );
}
