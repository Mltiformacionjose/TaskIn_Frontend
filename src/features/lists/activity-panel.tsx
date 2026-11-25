"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/features/auth/session-provider";
import { TASK_STATUS } from "@/features/tasks/status";
import { useLoad } from "@/hooks/use-load";
import { formatMoment } from "@/lib/dates";
import { getActivity } from "@/services/lists";
import type { Activity } from "@/types/api";

/** Nombre de quien hizo la acción; sin nombre si eliminó su cuenta (RF-07). */
function Who({ name, me }: { name: string | null; me: boolean }) {
  return (
    <strong className="font-semibold">
      {name ?? "Usuario eliminado"}
      {me && <span className="font-normal text-muted"> (tú)</span>}
    </strong>
  );
}

/** Frase de una entrada del historial (RF-31). */
export function describeActivity(entry: Activity, listId: number, currentUserId: number): ReactNode {
  const actor = <Who name={entry.actor_username} me={entry.actor_id !== null && entry.actor_id === currentUserId} />;
  const target = <Who name={entry.target_username} me={entry.target_user_id === currentUserId} />;
  const task =
    entry.task_id !== null ? (
      <Link href={`/lists/${listId}/tasks/${entry.task_id}`} className="text-accent-text hover:underline">
        «{entry.task_title}»
      </Link>
    ) : (
      <span>«{entry.task_title}»</span>
    );
  switch (entry.action) {
    case "task_created":
      return <>{actor} creó {task}</>;
    case "task_updated":
      return <>{actor} editó {task}</>;
    case "task_status_changed":
      return (
        <>
          {actor} pasó {task} a <strong>{entry.detail ? TASK_STATUS[entry.detail].label : "otro estado"}</strong>
        </>
      );
    case "task_deleted":
      return <>{actor} envió {task} a la papelera</>;
    case "task_restored":
      return <>{actor} recuperó {task} de la papelera</>;
    case "member_joined":
      return <>{target} se unió a la lista</>;
    case "member_left":
      return <>{target} abandonó la lista</>;
    case "member_removed":
      return <>{actor} expulsó a {target}</>;
    case "owner_changed":
      return <>{actor} transfirió la lista a {target}</>;
    case "list_updated":
      return <>{actor} editó la lista</>;
    case "list_deleted":
      return <>{actor} envió la lista a la papelera</>;
    case "list_restored":
      return <>{actor} recuperó la lista de la papelera</>;
  }
}

export function ActivityList({ entries, listId, empty }: { entries: Activity[]; listId: number; empty: string }) {
  const { user } = useSession();
  if (entries.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="flex flex-col">
      {entries.map((entry) => (
        <li key={entry.id} className="border-b border-line py-2.5 text-sm leading-normal last:border-b-0">
          <p>{describeActivity(entry, listId, user.id)}</p>
          <time dateTime={entry.created_at} className="text-xs text-muted">
            {formatMoment(entry.created_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}

/**
 * Panel «Actividad reciente» del detalle de lista (RF-31): las 20 últimas
 * acciones. `refreshKey` cambia cuando la pantalla modifica algo.
 */
export function ActivityPanel({ listId, refreshKey }: { listId: number; refreshKey: number }) {
  const { load, reload } = useLoad(() => getActivity(listId, { limit: 20 }), `${listId}/${refreshKey}`);
  return (
    <Panel title="Actividad reciente">
      <LoadState load={load} loading="Cargando actividad…" onRetry={reload}>
        {(entries) => <ActivityList entries={entries} listId={listId} empty="Todavía no hay actividad en esta lista." />}
      </LoadState>
    </Panel>
  );
}
