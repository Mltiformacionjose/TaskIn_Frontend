"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useSession } from "@/features/auth/session-provider";
import { errorMessage } from "@/services/errors";
import { getList, getMembers } from "@/services/lists";
import type { ListMember, Task, TaskList } from "@/types/api";
import { TaskForm } from "./task-form";

type Loaded = { list: TaskList; members: ListMember[] };

const LIST_TYPE_LABEL = { shared: "Lista compartida", personal: "Lista personal" } as const;

/** WF-004 Crear tarea: carga la lista y sus miembros y muestra el formulario. */
export function NewTaskScreen({ listId }: { listId: number }) {
  const { user } = useSession();
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [created, setCreated] = useState<Task | null>(null);
  // Cambiar la clave vacía el formulario para crear otra tarea.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getList(listId), getMembers(listId)])
      .then(([list, members]) => active && setData({ list, members }))
      .catch((error: unknown) => active && setLoadError(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [listId]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Nueva tarea" />
        <Alert>{loadError}</Alert>
        <Link href="/lists" className="text-sm text-accent-text hover:underline">
          ← Volver a Mis listas
        </Link>
      </>
    );
  }

  if (!data) {
    return (
      <p role="status" className="text-muted">
        Cargando lista…
      </p>
    );
  }

  const { list, members } = data;
  const owner = members.find((m) => m.is_owner);
  const names = (m: ListMember) => (m.user_id === user.id ? "Tú" : m.username);

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
        title="Nueva tarea"
        description={`Añade una tarea a la lista ${list.name}.`}
        actions={<Badge>{LIST_TYPE_LABEL[list.list_type]}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
        <Panel title="Información de la tarea" description="Completa los datos principales para crearla.">
          {created && (
            <Alert tone="success">
              Tarea «{created.title}» creada.{" "}
              <Button variant="ghost" className="ml-2 px-2.5 py-1.5" onClick={() => setCreated(null)}>
                Cerrar aviso
              </Button>
            </Alert>
          )}
          <TaskForm
            key={formKey}
            list={list}
            members={members}
            currentUserId={user.id}
            onSaved={(task) => {
              setCreated(task);
              setFormKey((k) => k + 1);
            }}
          />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Se añadirá a">
            <div className="flex items-center gap-[13px] border-b border-line py-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-[9px] bg-panel-2 text-lg text-accent-text"
              >
                ▤
              </span>
              <div>
                <strong className="block text-sm">{list.name}</strong>
                <small className="text-xs text-muted">{LIST_TYPE_LABEL[list.list_type]}</small>
              </div>
            </div>
            <p className="mt-3 text-sm leading-normal text-muted">
              Propietario: {owner ? names(owner) : "—"}
              {list.list_type === "shared" && <> · Participantes: {members.map(names).join(", ")}.</>}
            </p>
          </Panel>
          {list.list_type === "personal" && (
            <Panel title="Lista personal">
              <p className="text-sm leading-normal text-muted">
                Las asignaciones solo están disponibles en listas compartidas.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
