"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { LIMITS, validateNewPassword } from "@/lib/validation";
import { confirmPasswordReset } from "@/services/auth";
import { ApiError, errorMessage } from "@/services/errors";

type ResetState = { password?: string; repeat?: string; formError?: string; tokenError?: boolean; done?: boolean };

/**
 * Nueva contraseña con el enlace de recuperación (RF-03, P-09: 30 minutos y
 * un solo uso). Al cambiarla se cierran todas las sesiones de la cuenta.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    async (_prev, formData) => {
      const password = String(formData.get("password") ?? "");
      const repeat = String(formData.get("repeat") ?? "");
      const error = validateNewPassword(password);
      if (error) return { password: error };
      if (password !== repeat) return { repeat: "Las contraseñas no coinciden." };
      try {
        await confirmPasswordReset({ token, password });
        return { done: true };
      } catch (err) {
        if (err instanceof ApiError && err.code === "invalid_reset_token") return { formError: err.message, tokenError: true };
        return { formError: errorMessage(err) };
      }
    },
    {},
  );

  if (!token) {
    return (
      <Alert>
        El enlace no es válido. Pide uno nuevo desde{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          Recuperar contraseña
        </Link>
        .
      </Alert>
    );
  }

  if (state.done) {
    return (
      <>
        <Alert tone="success">Contraseña cambiada. Por seguridad, se han cerrado todas tus sesiones.</Alert>
        <ButtonLink href="/login" className="w-full">
          Ir a iniciar sesión
        </ButtonLink>
      </>
    );
  }

  return (
    <form action={formAction} noValidate>
      {state.formError && (
        <Alert>
          {state.formError}
          {state.tokenError && (
            <>
              {" "}
              <Link href="/forgot-password" className="font-semibold underline">
                Pedir otro enlace
              </Link>
            </>
          )}
        </Alert>
      )}
      <TextField
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        maxLength={LIMITS.passwordMax}
        hint={`Al menos ${LIMITS.passwordMin} caracteres.`}
        error={state.password}
        required
      />
      <TextField
        label="Repite la contraseña"
        name="repeat"
        type="password"
        autoComplete="new-password"
        maxLength={LIMITS.passwordMax}
        error={state.repeat}
        required
      />
      <Button type="submit" className="mt-[5px] w-full" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
