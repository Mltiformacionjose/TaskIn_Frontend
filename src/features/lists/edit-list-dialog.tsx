"use client";

import { useActionState, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { LIMITS, hasErrors, validateListCreate, type FieldErrors } from "@/lib/validation";
import { ApiError, errorMessage } from "@/services/errors";
import { updateList } from "@/services/lists";
import type { ListCreateInput, TaskList } from "@/types/api";
import { DueDateRequiredOption } from "./due-date-option";

type FormState = {
  values: ListCreateInput;
  errors: FieldErrors<ListCreateInput>;
  formError?: string;
};

const FIELDS: (keyof ListCreateInput)[] = ["name", "description", "list_type"];

function EditListForm({ list, onSaved, onCancel }: { list: TaskList; onSaved: (list: TaskList) => void; onCancel: () => void }) {
  // RF-16: una lista personal (que no sea «Mis tareas») puede pasar a compartida; no al revés.
  const canShare = list.list_type === "personal" && !list.is_default;
  const initial: ListCreateInput = {
    name: list.name,
    description: list.description,
    list_type: list.list_type,
    due_date_required: list.due_date_required,
  };

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const values: ListCreateInput = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        list_type: canShare && formData.get("make_shared") === "on" ? "shared" : list.list_type,
        due_date_required: formData.get("due_date_required") === "on",
      };
      const errors = validateListCreate(values);
      if (hasErrors(errors)) return { values, errors };
      try {
        const { list_type, ...rest } = values;
        const changes = list_type === list.list_type ? rest : values;
        onSaved(await updateList(list.id, changes));
        return { values, errors: {} };
      } catch (error) {
        const field = error instanceof ApiError ? FIELDS.find((f) => error.fields.includes(f)) : undefined;
        if (field) return { values, errors: { [field]: errorMessage(error) } };
        return { values, errors: {}, formError: errorMessage(error) };
      }
    },
    { values: initial, errors: {} },
  );

  return (
    <form action={formAction} noValidate>
      {state.formError && <Alert>{state.formError}</Alert>}
      <TextField
        label="Nombre *"
        name="name"
        maxLength={LIMITS.listNameMax}
        defaultValue={state.values.name}
        error={state.errors.name}
        required
        autoFocus
      />
      <TextAreaField
        label="Descripción"
        optional
        name="description"
        maxLength={LIMITS.listDescriptionMax}
        defaultValue={state.values.description ?? ""}
        error={state.errors.description}
      />
      {canShare && (
        <label className="mb-[19px] flex cursor-pointer items-start gap-3 rounded-[9px] border border-line bg-panel-2 p-[13px]">
          <input
            type="checkbox"
            name="make_shared"
            defaultChecked={state.values.list_type === "shared"}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span>
            <strong className="block text-sm">Convertir en lista compartida</strong>
            <small className="mt-1 block text-xs leading-normal text-muted">
              Podrás invitar a otras personas. Una lista compartida no puede volver a ser personal.
            </small>
          </span>
        </label>
      )}
      {state.errors.list_type && (
        <p role="alert" className="-mt-3 mb-4 text-xs text-danger-text">
          {state.errors.list_type}
        </p>
      )}
      <DueDateRequiredOption defaultChecked={Boolean(state.values.due_date_required)} />
      <div className="mt-2.5 flex justify-end gap-2.5 border-t border-line pt-[18px]">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Botón «Editar lista» y su diálogo (RF-16, RF-28). Solo lo ve el propietario:
 * nombre, descripción, exigir fecha límite y, en una lista personal,
 * convertirla en compartida.
 */
export function EditListDialog({ list, onSaved }: { list: TaskList; onSaved: (list: TaskList) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  const open = () => {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button variant="secondary" onClick={open}>
        Editar lista
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="edit-list-title"
        className="m-auto w-[min(480px,calc(100%-32px))] rounded-[17px] border border-line bg-panel p-[30px] text-fg shadow-[0_22px_75px_var(--shadow)] backdrop:bg-black/60"
      >
        <h2 id="edit-list-title" className="mb-1.5 text-xl font-bold">
          Editar lista
        </h2>
        <p className="mb-6 text-sm leading-normal text-muted">Cambia el nombre, la descripción, el tipo o si exige fecha límite.</p>
        <EditListForm
          key={formKey}
          list={list}
          onCancel={close}
          onSaved={(saved) => {
            close();
            onSaved(saved);
          }}
        />
      </dialog>
    </>
  );
}
