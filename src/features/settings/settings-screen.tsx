"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/features/auth/session-provider";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { getSettings, updateSettings } from "@/services/auth";
import { PasswordForm, ProfileForm } from "./account-forms";
import { errorMessage } from "@/services/errors";
import type { Settings } from "@/types/api";

function NotificationsSwitch({ initial }: { initial: Settings }) {
  const [enabled, setEnabled] = useState(initial.notifications_enabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);

  const toggle = async () => {
    const next = !enabled;
    setPending(true);
    setMessage(null);
    try {
      const saved = await updateSettings({ notifications_enabled: next });
      setEnabled(saved.notifications_enabled);
      setMessage({ tone: "success", text: saved.notifications_enabled ? "Notificaciones activadas." : "Notificaciones desactivadas." });
    } catch (error) {
      setMessage({ tone: "danger", text: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex items-start justify-between gap-5">
        <div>
          <p id="notifications-label" className="text-sm font-semibold">
            Activar notificaciones
          </p>
          <p id="notifications-hint" className="mt-1 text-xs leading-normal text-muted">
            Control general para los avisos internos y los correos de asignación.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="notifications-label"
          aria-describedby="notifications-hint"
          disabled={pending}
          onClick={toggle}
          className={cn(
            "relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60",
            enabled ? "bg-accent" : "bg-chip",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("absolute top-1 h-5 w-5 rounded-full bg-fg transition-all", enabled ? "left-6" : "left-1")}
          />
        </button>
      </div>
      <p className="mt-4 text-xs leading-normal text-muted">
        La recuperación de contraseña siempre se enviará, aunque desactives las notificaciones. Al volver a activarlas
        no se generarán avisos retroactivos.
      </p>
    </>
  );
}

/** WF-010 Ajustes (RF-02, RF-04, RF-05, RF-36): avisos, datos de la cuenta, contraseña y sesión. */
export function SettingsScreen() {
  const { logout } = useSession();
  const { load, reload } = useLoad(getSettings);

  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Ajustes" description="Configura tus preferencias de TaskIn." />
      <div className="grid max-w-3xl gap-5">
        <Panel title="Notificaciones" description="Controla cómo recibes avisos relacionados con tus listas y tareas.">
          <LoadState load={load} loading="Cargando ajustes…" onRetry={reload}>
            {(settings) => <NotificationsSwitch initial={settings} />}
          </LoadState>
        </Panel>
        <Panel title="Cuenta" description="Tu nombre de usuario y el correo con el que entras.">
          <ProfileForm />
        </Panel>
        <Panel title="Contraseña" description="Al cambiarla se cierran tus sesiones en otros dispositivos.">
          <PasswordForm />
        </Panel>
        <Panel title="Sesión" description="Protege el acceso a tu cuenta.">
          <div className="flex items-center justify-between gap-5 border-b border-line pb-4">
            <div>
              <p className="text-sm font-semibold">Duración de sesión</p>
              <p className="mt-1 text-xs text-muted">Las sesiones caducan siete días después del inicio de sesión.</p>
            </div>
            <span className="text-sm text-muted">7 días</span>
          </div>
          <div className="flex items-center justify-between gap-5 pt-4">
            <div>
              <p className="text-sm font-semibold">Cerrar sesión</p>
              <p className="mt-1 text-xs text-muted">Finaliza la sesión en este dispositivo.</p>
            </div>
            <Button variant="secondary" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
