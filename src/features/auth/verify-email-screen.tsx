"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { verifyEmail } from "@/services/auth";
import { errorMessage } from "@/services/errors";

type State = { status: "pending" } | { status: "done" } | { status: "error"; message: string };

/**
 * RF-06: destino del enlace de verificación (`/verify-email?token=…`).
 * Envía el token una sola vez al abrir la página (el enlace sirve una vez).
 */
export function VerifyEmailScreen({ token }: { token: string }) {
  const [state, setState] = useState<State>(
    token ? { status: "pending" } : { status: "error", message: "El enlace no es válido." },
  );
  // En desarrollo React ejecuta los efectos dos veces: el segundo envío gastaría el enlace.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token)
      .then(() => setState({ status: "done" }))
      .catch((error: unknown) => setState({ status: "error", message: errorMessage(error) }));
  }, [token]);

  if (state.status === "pending") {
    return (
      <p role="status" className="text-muted">
        Confirmando tu correo…
      </p>
    );
  }
  if (state.status === "done") {
    return (
      <>
        <Alert tone="success">Correo confirmado. ¡Gracias!</Alert>
        <ButtonLink href="/" className="w-full">
          Ir a TaskIn
        </ButtonLink>
      </>
    );
  }
  return (
    <>
      <Alert>{state.message}</Alert>
      <ButtonLink href="/settings" variant="secondary" className="w-full">
        Pedir otro enlace en Ajustes
      </ButtonLink>
    </>
  );
}
