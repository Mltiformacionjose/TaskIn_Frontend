"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { Segmented } from "@/components/ui/segmented";
import { useSession } from "@/features/auth/session-provider";
import { STATUS_ORDER, TASK_STATUS } from "@/features/tasks/status";
import { TaskViews, VIEW_OPTIONS, type TaskView } from "@/features/tasks/task-views";
import { useLoad } from "@/hooks/use-load";
import { deleteList, getList, getMembers } from "@/services/lists";
import { getTasks } from "@/services/tasks";
import type { ListMember, Task, TaskList, TaskStatus } from "@/types/api";
import { LIST_TYPE_LABEL, plural } from "./list-summary";

type StatusFilter = "all" | TaskStatus;
/** Filtro por responsable: todas, sin responsable o el id de un miembro. */
type AssigneeFilter = "all" | "none" | number;
type Data = { list: TaskList; members: ListMember[]; all: Task[] };

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

/**
 * WF-003 Detalle de lista (RF-21, RF-23, RF-24): resumen, tareas filtradas por
 * estado (en la API) y por responsable (en el navegador), ordenadas por fecha
 * (P-14) y vistas como Lista, Calendario (WF-011) o Kanban (WF-012);
 * participantes y datos de la lista. El propietario puede gestionar
 * participantes y eliminar la lista (RF-17).
 */
export function ListDetailScreen({ listId }: { listId: number }) {
  const { user } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [view, setView] = useState<TaskView>("list");
  const [actionError, setActionError] = useState<string | null>(null);

  const { load, reload } = useLoad<Data>(
    () =>
      Promise.all([getList(listId), getMembers(listId), getTasks(listId)]).then(([list, members, all]) => ({
        list,
        members,
        all,
      })),
    listId,
  );
  // El filtro lo aplica la API (GET /lists/{id}/tasks?status=…).
  const filtered = useLoad<Task[]>(() => getTasks(listId, filter === "all" ? undefined : filter), `${listId}/${filter}`);

  const refresh = (error?: string) => {
    setActionError(error ?? null);
    reload();
    filtered.reload();
  };

  return (
    <LoadState load={load} loading="Cargando lista…" onRetry={reload}>
      {({ list, members, all }) => {
        const isOwner = list.owner_id === user.id;
        const shared = list.list_type === "shared";
        const done = all.filter((t) => t.status === "done").length;
        const owner = members.find((m) => m.is_owner);
        return (
          <>
            <PageHeader
              eyebrow={
                <>
                  <Link href="/lists" className="hover:underline">
                    Mis listas
                  </Link>{" "}
                  / {list.list_type === "shared" ? "Compartidas" : "Personales"}
                </>
              }
              title={list.name}
              description={list.description ?? (list.is_default ? "Tus tareas que no pertenecen a otra lista." : undefined)}
              actions={
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge>{LIST_TYPE_LABEL[list.list_type]}</Badge>
                  {shared && isOwner && (
                    <ButtonLink href={`/lists/${list.id}/participants`} variant="secondary">
                      ＋ Invitar
                    </ButtonLink>
                  )}
                  {isOwner && !list.is_default && (
                    <ConfirmButton
                      label="Eliminar lista"
                      title="¿Eliminar esta lista?"
                      confirmLabel="Eliminar lista"
                      pendingLabel="Eliminando…"
                      onConfirm={async () => {
                        await deleteList(list.id);
                        router.push("/lists");
                      }}
                    >
                      «{list.name}» se eliminará de forma definitiva, con sus {plural(all.length, "tarea")}, sus
                      invitaciones y sus avisos. No se puede deshacer.
                    </ConfirmButton>
                  )}
                </div>
              }
            />

            <section aria-label="Resumen de la lista" className="mb-5 grid gap-[18px] sm:grid-cols-3">
              <Stat label="Tareas totales" value={all.length} hint="En esta lista" />
              <Stat
                label="Completadas"
                value={done}
                hint={`${all.length ? Math.round((done / all.length) * 100) : 0} % del total`}
              />
              <Stat label="Pendientes" value={all.length - done} hint="Por hacer o en curso" />
            </section>

            {actionError && <Alert>{actionError}</Alert>}

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(250px,0.8fr)]">
              <Panel
                title="Tareas"
                description="Ordenadas por fecha de vencimiento; las que no tienen fecha, al final."
                actions={<ButtonLink href={`/lists/${list.id}/tasks/new`}>＋ Nueva tarea</ButtonLink>}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <Segmented label="Vista de las tareas" value={view} onChange={setView} options={VIEW_OPTIONS} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented
                      label="Filtrar por estado"
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: "all", label: "Todas" },
                        ...STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS[s].label })),
                      ]}
                    />
                    {shared && (
                      <select
                        aria-label="Filtrar por responsable"
                        value={String(assignee)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAssignee(v === "all" || v === "none" ? v : Number(v));
                        }}
                        className="rounded-[9px] border border-line bg-panel-2 px-2.5 py-2 text-xs text-fg outline-none focus-visible:border-accent"
                      >
                        <option value="all">Responsable: todos</option>
                        <option value="none">Sin responsable</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.user_id === user.id ? `${m.username} (tú)` : m.username}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <LoadState load={filtered.load} loading="Cargando tareas…" onRetry={filtered.reload}>
                  {(loaded) => {
                    const tasks = loaded.filter((t) =>
                      assignee === "all"
                        ? true
                        : assignee === "none"
                          ? t.assignee_ids.length === 0
                          : t.assignee_ids.includes(assignee),
                    );
                    if (tasks.length === 0 && view !== "calendar") {
                      return (
                        <p className="rounded-panel border border-dashed border-line p-6 text-center text-sm text-muted">
                          {loaded.length === 0 && filter === "all"
                            ? "Esta lista aún no tiene tareas. Crea la primera con «Nueva tarea»."
                            : "No hay tareas con estos filtros."}
                        </p>
                      );
                    }
                    return (
                      <TaskViews view={view} tasks={tasks} members={shared ? members : undefined} onChanged={refresh} />
                    );
                  }}
                </LoadState>
              </Panel>

              <div className="flex flex-col gap-5">
                <Panel
                  title="Participantes"
                  actions={
                    shared &&
                    isOwner && (
                      <Link href={`/lists/${list.id}/participants`} className="text-sm text-accent-text hover:underline">
                        Gestionar
                      </Link>
                    )
                  }
                >
                  <ul className="flex flex-col">
                    {members.map((m) => (
                      <li key={m.user_id} className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0">
                        <span
                          aria-hidden="true"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-chip text-xs font-bold"
                        >
                          {initials(m.username)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {m.username}
                          {m.user_id === user.id && <span className="font-normal text-muted"> · Tú</span>}
                        </span>
                        <Pill>{m.is_owner ? "Propietario" : "Participante"}</Pill>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Detalles de la lista">
                  <p className="text-sm leading-relaxed text-muted">
                    Propietario: {owner ? (owner.user_id === user.id ? "Tú" : owner.username) : "—"}
                    <br />
                    Tipo: {LIST_TYPE_LABEL[list.list_type]}
                  </p>
                  <p className="mt-3 text-xs leading-normal text-muted">
                    {shared
                      ? "Solo el propietario gestiona participantes. Cualquier participante puede crear, editar y eliminar tareas."
                      : list.is_default
                        ? "«Mis tareas» es tu lista personal por defecto y no se puede eliminar."
                        : "Lista personal: solo la ves tú y sus tareas no tienen responsables."}
                  </p>
                </Panel>
              </div>
            </div>
          </>
        );
      }}
    </LoadState>
  );
}
