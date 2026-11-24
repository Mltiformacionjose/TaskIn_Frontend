"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { useInboxCounts } from "@/features/inbox/inbox-counts";
import { plural } from "@/features/lists/list-summary";
import { useLoad } from "@/hooks/use-load";
import { cn } from "@/lib/cn";
import { formatMoment } from "@/lib/dates";
import { errorMessage } from "@/services/errors";
import { getNotifications, markNotification } from "@/services/notifications";
import type { Notification } from "@/types/api";

type Filter = "all" | "unread";

/** Texto de cada tipo de aviso (NEX-DOC-001 §7, alcance del MVP). */
function describe(n: Notification): { glyph: string; title: string; text: string; kind: string; href?: string; cta?: string } {
  const task = `«${n.task_title ?? "una tarea"}»`;
  const list = n.list_name ? `«${n.list_name}»` : "una lista";
  switch (n.notification_type) {
    case "task_assigned":
      return {
        glyph: "✓",
        title: "Te han asignado una tarea",
        text: `Tienes asignada ${task} en ${list}.`,
        kind: "Tarea asignada",
        href: n.list_id && n.task_id ? `/lists/${n.list_id}/tasks/${n.task_id}` : undefined,
        cta: "Ver tarea",
      };
    case "task_overdue":
      return {
        glyph: "◷",
        title: "Tienes una tarea vencida",
        text: `${task} ha superado su fecha de vencimiento.`,
        kind: "Tarea vencida",
        href: n.list_id && n.task_id ? `/lists/${n.list_id}/tasks/${n.task_id}` : undefined,
        cta: "Ver tarea",
      };
    case "invitation_received":
      return {
        glyph: "✉",
        title: "Nueva invitación",
        text: `Has recibido una invitación para participar en ${list}.`,
        kind: "Invitación recibida",
        href: "/invitations",
        cta: "Ver invitación",
      };
  }
}

function NotificationItem({ notification, onToggle }: { notification: Notification; onToggle: (read: boolean) => void }) {
  const info = describe(notification);
  const unread = !notification.read_at;
  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-[13px] rounded-xl border p-4",
        unread ? "border-accent-border bg-accent-tint" : "border-line bg-panel-2",
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-panel text-lg text-accent-text"
      >
        {info.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm">
          {info.title}
          {unread && <span className="sr-only"> (sin leer)</span>}
        </strong>
        <p className="mt-1 text-sm text-fg">{info.text}</p>
        <small className="mt-1 block text-xs text-muted">
          {formatMoment(notification.created_at)} · {info.kind}
        </small>
      </div>
      <div className="flex flex-wrap gap-2">
        {info.href && (
          <Link href={info.href} className="rounded-[9px] px-3 py-2 text-xs font-bold text-accent-text hover:underline">
            {info.cta}
          </Link>
        )}
        <Button variant="ghost" className="px-3 py-2" onClick={() => onToggle(unread)}>
          {unread ? "Marcar como leída" : "Marcar como no leída"}
        </Button>
      </div>
    </li>
  );
}

/**
 * WF-006 Notificaciones (RF-33): avisos de los últimos 30 días, del más
 * reciente al más antiguo, con marca de leído. Al abrir la pantalla el backend
 * crea los avisos de vencimiento que falten (ADR-0010).
 */
export function NotificationsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { refresh: refreshCounts } = useInboxCounts();
  const { load, reload } = useLoad(getNotifications);

  const notifications = load.status === "ready" ? load.data : [];
  const unread = notifications.filter((n) => !n.read_at);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
      reload();
      refreshCounts();
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Actividad"
        title="Notificaciones"
        description="Consulta avisos sobre tus tareas y listas compartidas."
        actions={
          <Button
            variant="secondary"
            disabled={pending || unread.length === 0}
            onClick={() => run(() => Promise.all(unread.map((n) => markNotification(n.id, true))))}
          >
            Marcar todas como leídas
          </Button>
        }
      />
      {error && <Alert>{error}</Alert>}
      <LoadState load={load} loading="Cargando notificaciones…" onRetry={reload}>
        {(all) => {
          const visible = filter === "unread" ? all.filter((n) => !n.read_at) : all;
          return (
            <Panel
              title={
                <Segmented
                  label="Filtrar notificaciones"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "unread", label: `No leídas · ${unread.length}` },
                  ]}
                />
              }
              actions={<span className="text-sm text-muted">{plural(visible.length, "notificación", "notificaciones")}</span>}
            >
              {visible.length === 0 ? (
                <p className="rounded-panel border border-dashed border-line p-6 text-center text-sm text-muted">
                  {filter === "unread" ? "No tienes avisos sin leer." : "No tienes avisos de los últimos 30 días."}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {visible.map((n) => (
                    <NotificationItem key={n.id} notification={n} onToggle={(read) => run(() => markNotification(n.id, read))} />
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs leading-normal text-muted">
                Las notificaciones se generan según tus preferencias generales. Al desactivarlas en{" "}
                <Link href="/settings" className="text-accent-text hover:underline">
                  Ajustes
                </Link>
                , no se generan avisos nuevos. La recuperación de contraseña seguirá funcionando.
              </p>
            </Panel>
          );
        }}
      </LoadState>
    </>
  );
}
