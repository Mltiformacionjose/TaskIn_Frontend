"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/features/auth/session-provider";
import { useLoad } from "@/hooks/use-load";
import { formatDate } from "@/lib/dates";
import { ApiError } from "@/services/errors";
import { getActivity, getList, getMembers } from "@/services/lists";
import { deleteTask, getTask } from "@/services/tasks";
import { ActivityList } from "@/features/lists/activity-panel";
import type { Activity, ListMember, Task, TaskList } from "@/types/api";
import { TaskForm } from "./task-form";

type Data = { list: TaskList; members: ListMember[]; task: Task; history: Activity[] };

/**
 * WF-004 en modo edición (RF-19, RF-22, RF-24): el mismo formulario, con los
 * datos de la tarea y el estado editable. Cualquier miembro de la lista puede
 * editarla y enviarla a la papelera (RF-25, RF-30). Si otra persona la cambia mientras tanto, al
 * guardar se avisa y se ofrece cargar la versión actual (RF-29).
 */
export function EditTaskScreen({ listId, taskId }: { listId: number; taskId: number }) {
  const { user } = useSession();
  const router = useRouter();
  const { load, reload } = useLoad<Data>(
    () =>
      Promise.all([
        getList(listId),
        getMembers(listId),
        getTask(taskId),
        getActivity(listId, { taskId, limit: 50 }),
      ]).then(([list, members, task, history]) => {
        // La dirección mezcla una lista y una tarea de otra lista: se trata como inexistente.
        if (task.list_id !== list.id) throw new ApiError(404, "not_found", "La tarea no existe o no tienes acceso a ella.");
        return { list, members, task, history };
      }),
    `${listId}/${taskId}`,
  );

  const backToList = () => router.push(`/lists/${listId}`);

  return (
    <LoadState load={load} loading="Cargando tarea…" onRetry={reload}>
      {({ list, members, task, history }) => {
        const creator = members.find((m) => m.user_id === task.creator_id);
        const creatorName = creator
          ? creator.user_id === user.id
            ? "Ti"
            : creator.username
          : task.creator_id === null
            ? "Usuario eliminado"
            : "Una persona que ya no participa";
        return (
          <>
            <PageHeader
              eyebrow={
                <>
                  <Link href="/lists" className="hover:underline">
                    Mis listas
                  </Link>{" "}
                  /{" "}
                  <Link href={`/lists/${list.id}`} className="hover:underline">
                    {list.name}
                  </Link>{" "}
                  / Tareas
                </>
              }
              title="Editar tarea"
              description={`Modifica la tarea «${task.title}».`}
              actions={
                <ConfirmButton
                  label="Eliminar tarea"
                  title="¿Eliminar esta tarea?"
                  confirmLabel="Eliminar tarea"
                  pendingLabel="Eliminando…"
                  onConfirm={async () => {
                    await deleteTask(task.id);
                    backToList();
                  }}
                >
                  «{task.title}» irá a la papelera. Cualquier participante de la lista podrá recuperarla durante 30
                  días; después se borrará definitivamente.
                </ConfirmButton>
              }
            />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
              <Panel title="Información de la tarea" description="Cambia lo que necesites y guarda.">
                {/* La clave rehace el formulario con los datos nuevos al recargar tras un conflicto (RF-29). */}
                <TaskForm
                  key={task.updated_at}
                  list={list}
                  members={members}
                  currentUserId={user.id}
                  task={task}
                  onSaved={backToList}
                  onReload={reload}
                />
              </Panel>
              <div className="flex flex-col gap-5">
                <Panel title="Datos de la tarea">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
                    <dt className="text-muted">Lista</dt>
                    <dd>{list.name}</dd>
                    <dt className="text-muted">Creada por</dt>
                    <dd>{creatorName}</dd>
                    <dt className="text-muted">Creada el</dt>
                    <dd>{formatDate(task.created_at)}</dd>
                    {task.completed_at && (
                      <>
                        <dt className="text-muted">Completada el</dt>
                        <dd>{formatDate(task.completed_at)}</dd>
                      </>
                    )}
                  </dl>
                </Panel>
                {/* RF-31 y RF-32: quién cambió la tarea y su estado, y cuándo. */}
                <Panel title="Historial" description="Cambios de esta tarea, del más reciente al más antiguo.">
                  <ActivityList entries={history} listId={list.id} empty="Sin cambios registrados." />
                </Panel>
              </div>
            </div>
          </>
        );
      }}
    </LoadState>
  );
}
