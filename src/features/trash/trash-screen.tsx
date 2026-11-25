"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/features/auth/session-provider";
import { plural } from "@/features/lists/list-summary";
import { useLoad } from "@/hooks/use-load";
import { formatLocalDate, formatMoment } from "@/lib/dates";
import { errorMessage } from "@/services/errors";
import { getTrash, restoreList } from "@/services/lists";
import { restoreTask } from "@/services/tasks";
import type { TrashList, TrashTask } from "@/types/api";

type Message = { tone: "danger" | "success"; text: ReactNode };

function Row({
  title,
  details,
  badge,
  label,
  onRestore,
}: {
  title: string;
  details: ReactNode;
  badge?: string;
  /** Nombre accesible del botón, p. ej. «Recuperar la lista Club». */
  label: string;
  onRestore: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel-2 p-4">
      <div className="min-w-0 flex-1 basis-56">
        <strong className="block text-sm break-words">{title}</strong>
        <small className="text-xs leading-normal text-muted">{details}</small>
      </div>
      {badge && <Badge>{badge}</Badge>}
      <Button
        variant="secondary"
        aria-label={label}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await onRestore();
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Recuperando…" : "Recuperar"}
      </Button>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

/** «hace 5 minutos», «ayer», «el 12 nov 2026». */
function when(isoDateTime: string): string {
  const text = formatMoment(isoDateTime);
  return /^\d/.test(text) ? `el ${text}` : text.toLowerCase();
}

/**
 * Papelera (RF-18, RF-30; no diseñada en el prototipo). Mis listas eliminadas
 * (solo su propietario las recupera, con todo lo que tenían) y las tareas
 * eliminadas de mis listas (las recupera cualquier participante). A los 30
 * días se borran de forma definitiva (tarea diaria del backend).
 */
export function TrashScreen() {
  const { user } = useSession();
  const { load, reload } = useLoad(getTrash);
  const [message, setMessage] = useState<Message | null>(null);

  const restore = async (action: () => Promise<unknown>, done: ReactNode) => {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "success", text: done });
    } catch (error) {
      setMessage({ tone: "danger", text: errorMessage(error) });
    }
    reload();
  };

  const listRow = (list: TrashList) => (
    <Row
      key={list.id}
      title={list.name}
      badge={list.list_type === "shared" ? "Compartida" : "Personal"}
      label={`Recuperar la lista ${list.name}`}
      details={
        <>
          {plural(list.task_count, "tarea")} · Eliminada {when(list.deleted_at)} · Se borrará el{" "}
          {formatLocalDate(list.purge_at)}
        </>
      }
      onRestore={() =>
        restore(
          () => restoreList(list.id),
          <>
            Lista «{list.name}» recuperada.{" "}
            <Link href={`/lists/${list.id}`} className="font-semibold underline">
              Abrir la lista
            </Link>
          </>,
        )
      }
    />
  );

  const taskRow = (task: TrashTask) => {
    const who =
      task.deleted_by_id === null ? "un usuario eliminado" : task.deleted_by_id === user.id ? "ti" : task.deleted_by_username;
    return (
      <Row
        key={task.id}
        title={task.title}
        label={`Recuperar la tarea ${task.title}`}
        details={
          <>
            En{" "}
            <Link href={`/lists/${task.list_id}`} className="text-accent-text hover:underline">
              {task.list_name}
            </Link>{" "}
            · Eliminada por {who} {when(task.deleted_at)} · Se borrará el {formatLocalDate(task.purge_at)}
          </>
        }
        onRestore={() =>
          restore(
            () => restoreTask(task.id),
            <>
              Tarea «{task.title}» recuperada.{" "}
              <Link href={`/lists/${task.list_id}/tasks/${task.id}`} className="font-semibold underline">
                Abrir la tarea
              </Link>
            </>,
          )
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Papelera"
        description="Lo que eliminas se guarda aquí 30 días; después se borra de forma definitiva."
      />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <LoadState load={load} loading="Cargando papelera…" onRetry={reload}>
        {(trash) => (
          <div className="grid gap-5">
            <Panel
              title="Listas"
              description="Tus listas eliminadas. Vuelven con sus tareas y participantes."
              actions={<span className="text-sm whitespace-nowrap text-muted">{plural(trash.lists.length, "lista")}</span>}
            >
              {trash.lists.length === 0 ? (
                <Empty>No tienes listas en la papelera.</Empty>
              ) : (
                <ul className="flex flex-col gap-3">{trash.lists.map(listRow)}</ul>
              )}
            </Panel>
            <Panel
              title="Tareas"
              description="Tareas eliminadas de tus listas. Cualquier participante puede recuperarlas."
              actions={<span className="text-sm whitespace-nowrap text-muted">{plural(trash.tasks.length, "tarea")}</span>}
            >
              {trash.tasks.length === 0 ? (
                <Empty>No hay tareas en la papelera.</Empty>
              ) : (
                <ul className="flex flex-col gap-3">{trash.tasks.map(taskRow)}</ul>
              )}
              <p className="mt-4 text-xs leading-normal text-muted">
                Las tareas de una lista que está en la papelera no aparecen aquí: vuelven al recuperar la lista.
              </p>
            </Panel>
          </div>
        )}
      </LoadState>
    </>
  );
}
