"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useSession } from "@/features/auth/session-provider";
import { LIMITS, hasErrors, validateNewPassword, validateProfile } from "@/lib/validation";
import { changePassword, updateProfile } from "@/services/auth";
import { ApiError, errorMessage } from "@/services/errors";

type ProfileState = {
  username: string;
  email: string;
  errors: { username?: string; email?: string; current_password?: string };
  formError?: string;
  saved?: boolean;
};

/**
 * RF-05: cambiar el nombre de usuario y el correo. Cambiar el correo pide la
 * contraseña actual, porque el correo es la vía para recuperar la cuenta.
 */
export function ProfileForm() {
  const { user, setUser } = useSession();
  const [email, setEmail] = useState(user.email);
  const emailChanges = email.trim().toLowerCase() !== user.email.toLowerCase();

  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    async (_prev, formData) => {
      const username = String(formData.get("username") ?? "").trim();
      const newEmail = String(formData.get("email") ?? "").trim();
      const currentPassword = String(formData.get("current_password") ?? "");
      const errors = validateProfile({ username, email: newEmail });
      if (hasErrors(errors)) return { username, email: newEmail, errors };
      const changingEmail = newEmail.toLowerCase() !== user.email.toLowerCase();
      if (changingEmail && !currentPassword)
        return { username, email: newEmail, errors: { current_password: "Escribe tu contraseña actual para cambiar el correo." } };
      try {
        const saved = await updateProfile({
          username,
          email: newEmail,
          ...(changingEmail ? { current_password: currentPassword } : {}),
        });
        setUser(saved);
        setEmail(saved.email);
        return { username: saved.username, email: saved.email, errors: {}, saved: true };
      } catch (error) {
        const field =
          error instanceof ApiError
            ? (["username", "email", "current_password"] as const).find((f) => error.fields.includes(f))
            : undefined;
        if (field) return { username, email: newEmail, errors: { [field]: errorMessage(error) } };
        return { username, email: newEmail, errors: {}, formError: errorMessage(error) };
      }
    },
    { username: user.username, email: user.email, errors: {} },
  );

  return (
    <form action={formAction} noValidate>
      {state.saved && <Alert tone="success">Datos de la cuenta guardados.</Alert>}
      {state.formError && <Alert>{state.formError}</Alert>}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Nombre de usuario"
          name="username"
          autoComplete="username"
          maxLength={LIMITS.usernameMax}
          defaultValue={state.username}
          error={state.errors.username}
          required
        />
        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={LIMITS.emailMax}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state.errors.email}
          required
        />
      </div>
      {(emailChanges || state.errors.current_password) && (
        <TextField
          label="Contraseña actual"
          name="current_password"
          type="password"
          autoComplete="current-password"
          maxLength={LIMITS.passwordMax}
          hint="Necesaria para cambiar el correo: es el que usarás para entrar y para recuperar la cuenta."
          error={state.errors.current_password}
        />
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

type PasswordState = {
  errors: { current_password?: string; new_password?: string; repeat?: string };
  formError?: string;
  done?: boolean;
  /** Cambia en cada cambio correcto para vaciar el formulario. */
  round: number;
};

/** RF-05: cambiar la contraseña. Cierra las demás sesiones; esta sigue abierta. */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(
    async (prev, formData) => {
      const current = String(formData.get("current_password") ?? "");
      const next = String(formData.get("new_password") ?? "");
      const repeat = String(formData.get("repeat") ?? "");
      const round = prev.round;
      if (!current) return { round, errors: { current_password: "Escribe tu contraseña actual." } };
      const error = validateNewPassword(next);
      if (error) return { round, errors: { new_password: error } };
      if (next !== repeat) return { round, errors: { repeat: "Las contraseñas no coinciden." } };
      try {
        await changePassword({ current_password: current, new_password: next });
        return { round: round + 1, errors: {}, done: true };
      } catch (err) {
        if (err instanceof ApiError && err.fields.includes("current_password"))
          return { round, errors: { current_password: errorMessage(err) } };
        if (err instanceof ApiError && err.fields.includes("new_password"))
          return { round, errors: { new_password: errorMessage(err) } };
        return { round, errors: {}, formError: errorMessage(err) };
      }
    },
    { round: 0, errors: {} },
  );

  return (
    <form action={formAction} noValidate key={state.round}>
      {state.done && (
        <Alert tone="success">Contraseña cambiada. Se han cerrado tus sesiones en otros dispositivos.</Alert>
      )}
      {state.formError && <Alert>{state.formError}</Alert>}
      <TextField
        label="Contraseña actual"
        name="current_password"
        type="password"
        autoComplete="current-password"
        maxLength={LIMITS.passwordMax}
        error={state.errors.current_password}
        required
      />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Nueva contraseña"
          name="new_password"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITS.passwordMax}
          hint={`Al menos ${LIMITS.passwordMin} caracteres.`}
          error={state.errors.new_password}
          required
        />
        <TextField
          label="Repite la nueva contraseña"
          name="repeat"
          type="password"
          autoComplete="new-password"
          maxLength={LIMITS.passwordMax}
          error={state.errors.repeat}
          required
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
