"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { useSession } from "@/features/auth/session-provider";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { readThemePreference, saveThemePreference, type ThemePreference } from "@/lib/theme";
import { getSettings, updateSettings } from "@/services/auth";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./account-forms";
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

const DUE_SOON_OPTIONS = [1, 2, 3, 5, 7, 10, 14];

/** RF-27: con cuántos días de antelación una tarea cuenta como «próxima a vencer». */
function DueSoonSetting({ initial }: { initial: Settings }) {
  const [days, setDays] = useState(initial.due_soon_days);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const options = DUE_SOON_OPTIONS.includes(days) ? DUE_SOON_OPTIONS : [...DUE_SOON_OPTIONS, days].sort((a, b) => a - b);

  const change = async (next: number) => {
    const previous = days;
    setDays(next);
    setPending(true);
    setMessage(null);
    try {
      const saved = await updateSettings({ due_soon_days: next });
      setDays(saved.due_soon_days);
      setMessage({ tone: "success", text: "Antelación guardada." });
    } catch (error) {
      setDays(previous);
      setMessage({ tone: "danger", text: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-5 border-t border-line pt-5">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <label htmlFor="due-soon-days" className="text-sm font-semibold">
            Antelación de «próximas a vencer»
          </label>
          <p id="due-soon-hint" className="mt-1 text-xs leading-normal text-muted">
            Las tareas que vencen hoy o en estos días aparecen en «Próximas tareas» del inicio.
          </p>
        </div>
        <select
          id="due-soon-days"
          aria-describedby="due-soon-hint"
          value={days}
          disabled={pending}
          onChange={(e) => change(Number(e.target.value))}
          className="rounded-lg border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-fg outline-none focus-visible:border-accent disabled:opacity-60"
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {value === 1 ? "1 día" : `${value} días`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; glyph: string }[] = [
  { value: "system", label: "Sistema", glyph: "◐" },
  { value: "light", label: "Claro", glyph: "☀" },
  { value: "dark", label: "Oscuro", glyph: "☾" },
];

/** Mejora 12 (P-28): tema claro u oscuro, o el del sistema. Se guarda en este navegador. */
function AppearanceSetting() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const change = (next: ThemePreference) => {
    setTheme(next);
    saveThemePreference(next);
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-sm font-semibold">Tema</p>
        <p className="mt-1 text-xs leading-normal text-muted">
          «Sistema» sigue el modo claro u oscuro de tu dispositivo. Se guarda en este navegador.
        </p>
      </div>
      <Segmented label="Tema" options={THEME_OPTIONS} value={theme} onChange={change} />
    </div>
  );
}

/** WF-010 Ajustes (RF-02, RF-04, RF-05, RF-07, RF-27, RF-36): avisos, vencimientos, cuenta, contraseña, sesión y baja. */
export function SettingsScreen() {
  const { logout } = useSession();
  const { load, reload } = useLoad(getSettings);

  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Ajustes" description="Configura tus preferencias de TaskIn." />
      <div className="grid max-w-3xl gap-5">
        <Panel title="Notificaciones" description="Controla cómo recibes avisos relacionados con tus listas y tareas.">
          <LoadState load={load} loading="Cargando ajustes…" onRetry={reload}>
            {(settings) => (
              <>
                <NotificationsSwitch initial={settings} />
                <DueSoonSetting initial={settings} />
              </>
            )}
          </LoadState>
        </Panel>
        <Panel title="Apariencia" description="Elige cómo se ve TaskIn.">
          <AppearanceSetting />
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
        <Panel title="Eliminar la cuenta" description="Borra tu cuenta de TaskIn de forma definitiva.">
          <DeleteAccountForm />
        </Panel>
      </div>
    </>
  );
}
