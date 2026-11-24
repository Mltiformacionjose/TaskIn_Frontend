"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { LIMITS, hasErrors, validateTaskCreate, type FieldErrors } from "@/lib/validation";
import { ApiError, errorMessage } from "@/services/errors";
import { createTask, updateTask } from "@/services/tasks";
import type { ListMember, Task, TaskCreateInput, TaskList, TaskStatus } from "@/types/api";
import { STATUS_ORDER, TASK_STATUS } from "./status";

type TaskValues = TaskCreateInput & { status: TaskStatus };

type TaskFormState = {
  values: TaskValues;
  errors: FieldErrors<TaskValues>;
  formError?: string;
};

const emptyValues: TaskValues = { title: "", description: null, due_date: null, assignee_ids: [], status: "todo" };

const FIELDS: (keyof TaskValues)[] = ["title", "description", "due_date", "assignee_ids", "status"];

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && value in TASK_STATUS;
}

type TaskFormProps = {
  list: TaskList;
  members: ListMember[];
  currentUserId: number;
  /** Con `task`, el formulario edita esa tarea (WF-004 modo edición). */
  task?: Task;
  onSaved: (task: Task) => void;
};

/**
 * Formulario de WF-004, para crear y para editar. Al crear, el estado inicial
 * lo fija el backend («Por hacer», CA-20); al editar se puede cambiar
 * libremente (RF-22). Los responsables solo aparecen en listas compartidas y
 * solo se puede elegir a miembros de la lista (CA-08, CA-17, CA-18).
 */
export function TaskForm({ list, members, currentUserId, task, onSaved }: TaskFormProps) {
  const shared = list.list_type === "shared";
  const editing = task !== undefined;
  const initialValues: TaskValues = task
    ? {
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        assignee_ids: task.assignee_ids,
        status: task.status,
      }
    : emptyValues;

  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    async (_prev, formData) => {
      const status = formData.get("status");
      const values: TaskValues = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        due_date: String(formData.get("due_date") ?? "") || null,
        assignee_ids: shared ? formData.getAll("assignee_ids").map(Number) : [],
        status: isStatus(status) ? status : initialValues.status,
      };
      const errors = validateTaskCreate(values);
      if (hasErrors(errors)) return { values, errors };
      try {
        const { status: newStatus, ...fields } = values;
        const saved = task
          ? await updateTask(task.id, { ...fields, status: newStatus })
          : await createTask(list.id, fields);
        onSaved(saved);
        return { values: task ? values : emptyValues, errors: {} };
      } catch (error) {
        const field = error instanceof ApiError ? FIELDS.find((f) => error.fields.includes(f)) : undefined;
        if (field) return { values, errors: { [field]: errorMessage(error) } };
        return { values, errors: {}, formError: errorMessage(error) };
      }
    },
    { values: initialValues, errors: {} },
  );

  const initial = TASK_STATUS.todo;

  return (
    <form action={formAction} noValidate>
      {state.formError && <Alert>{state.formError}</Alert>}
      <TextField
        label="Título *"
        name="title"
        placeholder="Ej. Preparar presentación del proyecto"
        maxLength={LIMITS.taskTitleMax}
        defaultValue={state.values.title}
        error={state.errors.title}
        required
      />
      <TextAreaField
        label="Descripción"
        optional
        name="description"
        placeholder="Añade detalles, instrucciones o información útil..."
        maxLength={LIMITS.taskDescriptionMax}
        defaultValue={state.values.description ?? ""}
        error={state.errors.description}
      />
      <div className="grid gap-[18px] md:grid-cols-2">
        <TextField
          label="Fecha de vencimiento"
          optional
          name="due_date"
          type="date"
          defaultValue={state.values.due_date ?? ""}
          hint={editing ? "Déjala vacía para quitar la fecha." : "Puedes crear tareas sin fecha y añadirla más adelante."}
          error={state.errors.due_date}
        />
        {editing ? (
          <div className="mb-[19px]">
            <label htmlFor="task-status" className="mb-2 block text-sm font-semibold">
              Estado
            </label>
            <select
              id="task-status"
              name="status"
              defaultValue={state.values.status}
              className="w-full rounded-lg border border-line bg-panel-2 px-3.5 py-[13px] text-fg outline-none focus-visible:border-accent"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS[s].label}
                </option>
              ))}
            </select>
            <small className="mt-[7px] block text-xs text-muted">Puedes pasar de un estado a otro libremente.</small>
          </div>
        ) : (
          <div className="mb-[19px]">
            <p className="mb-2 text-sm font-semibold">Estado inicial</p>
            <Pill tone={initial.tone} className="w-full rounded-lg px-3.5 py-[13px]">
              {initial.label}
            </Pill>
            <small className="mt-[7px] block text-xs text-muted">Al crear, la tarea comienza en este estado.</small>
          </div>
        )}
      </div>

      {shared && (
        <fieldset className="mb-[19px]" aria-describedby="assignees-hint">
          <legend className="mb-2 flex w-full justify-between text-sm font-semibold">
            Responsables <span className="font-normal text-muted">Opcional</span>
          </legend>
          <div className="flex flex-wrap gap-2 rounded-[9px] border border-line bg-panel-2 p-[13px]">
            {members.map((member) => (
              <label key={member.user_id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="assignee_ids"
                  value={member.user_id}
                  defaultChecked={state.values.assignee_ids.includes(member.user_id)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-muted",
                    "peer-checked:border-accent peer-checked:bg-accent-tint peer-checked:text-accent-text",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                  )}
                >
                  {member.username}
                  {member.user_id === currentUserId && " · Tú"}
                </span>
              </label>
            ))}
          </div>
          <small id="assignees-hint" className="mt-[7px] block text-xs text-muted">
            Solo puedes asignar miembros que pertenezcan a esta lista compartida.
          </small>
          {state.errors.assignee_ids && (
            <p role="alert" className="mt-[7px] text-xs text-danger-text">
              {state.errors.assignee_ids}
            </p>
          )}
        </fieldset>
      )}

      <div className="mt-2.5 flex justify-end gap-2.5 border-t border-line pt-[18px]">
        <ButtonLink href={`/lists/${list.id}`} variant="ghost">
          Cancelar
        </ButtonLink>
        <Button type="submit" disabled={pending}>
          {editing ? (pending ? "Guardando…" : "Guardar cambios") : pending ? "Creando tarea…" : "Crear tarea"}
        </Button>
      </div>
    </form>
  );
}
