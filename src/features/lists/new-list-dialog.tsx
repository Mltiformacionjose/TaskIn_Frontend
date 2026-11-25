"use client";

import { useActionState, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { LIMITS, hasErrors, validateListCreate, type FieldErrors } from "@/lib/validation";
import { ApiError, errorMessage } from "@/services/errors";
import { createList } from "@/services/lists";
import type { ListCreateInput, ListType, TaskList } from "@/types/api";
import { DueDateRequiredOption } from "./due-date-option";

type FormState = {
  values: ListCreateInput;
  errors: FieldErrors<ListCreateInput>;
  formError?: string;
};

const emptyValues: ListCreateInput = { name: "", description: null, list_type: "personal", due_date_required: false };
const FIELDS: (keyof ListCreateInput)[] = ["name", "description", "list_type"];

const TYPES: { value: ListType; label: string; hint: string }[] = [
  { value: "personal", label: "Personal", hint: "Solo la ves tú." },
  { value: "shared", label: "Compartida", hint: "Podrás invitar a otras personas desde el detalle de la lista." },
];

function ListForm({ onCreated, onCancel }: { onCreated: (list: TaskList) => void; onCancel: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const values: ListCreateInput = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        list_type: formData.get("list_type") === "shared" ? "shared" : "personal",
        due_date_required: formData.get("due_date_required") === "on",
      };
      const errors = validateListCreate(values);
      if (hasErrors(errors)) return { values, errors };
      try {
        onCreated(await createList(values));
        return { values: emptyValues, errors: {} };
      } catch (error) {
        const field = error instanceof ApiError ? FIELDS.find((f) => error.fields.includes(f)) : undefined;
        if (field) return { values, errors: { [field]: errorMessage(error) } };
        return { values, errors: {}, formError: errorMessage(error) };
      }
    },
    { values: emptyValues, errors: {} },
  );

  return (
    <form action={formAction} noValidate>
      {state.formError && <Alert>{state.formError}</Alert>}
      <TextField
        label="Nombre *"
        name="name"
        placeholder="Ej. Casa, Trabajo, Viaje…"
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
        placeholder="¿Para qué es esta lista?"
        maxLength={LIMITS.listDescriptionMax}
        defaultValue={state.values.description ?? ""}
        error={state.errors.description}
      />
      <fieldset className="mb-[19px]">
        <legend className="mb-2 text-sm font-semibold">Tipo de lista</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {TYPES.map((type) => (
            <label key={type.value} className="cursor-pointer">
              <input
                type="radio"
                name="list_type"
                value={type.value}
                defaultChecked={state.values.list_type === type.value}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "block h-full rounded-[9px] border border-line bg-panel-2 p-[13px]",
                  "peer-checked:border-accent peer-checked:bg-accent-tint",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                )}
              >
                <strong className="block text-sm">{type.label}</strong>
                <small className="mt-1 block text-xs leading-normal text-muted">{type.hint}</small>
              </span>
            </label>
          ))}
        </div>
        {state.errors.list_type && (
          <p role="alert" className="mt-[7px] text-xs text-danger-text">
            {state.errors.list_type}
          </p>
        )}
      </fieldset>
      <DueDateRequiredOption defaultChecked={Boolean(state.values.due_date_required)} />
      <div className="mt-2.5 flex justify-end gap-2.5 border-t border-line pt-[18px]">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creando lista…" : "Crear lista"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Botón «Nueva lista» y su formulario en un diálogo modal (RF-08, RF-09).
 * El prototipo no dibuja este formulario: los campos salen del modelo de datos
 * (nombre, descripción y tipo). Usa `<dialog>` nativo: Escape lo cierra y el
 * foco vuelve al botón.
 */
export function NewListDialog({ onCreated }: { onCreated: (list: TaskList) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Cambiar la clave vacía el formulario cada vez que se abre.
  const [formKey, setFormKey] = useState(0);

  const open = () => {
    setFormKey((k) => k + 1);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button onClick={open}>＋ Nueva lista</Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="new-list-title"
        className="m-auto w-[min(480px,calc(100%-32px))] rounded-[17px] border border-line bg-panel p-[30px] text-fg shadow-[0_22px_75px_#0008] backdrop:bg-black/60"
      >
        <h2 id="new-list-title" className="mb-1.5 text-xl font-bold">
          Nueva lista
        </h2>
        <p className="mb-6 text-sm leading-normal text-muted">Crea un espacio para organizar tus tareas.</p>
        <ListForm
          key={formKey}
          onCancel={close}
          onCreated={(list) => {
            close();
            onCreated(list);
          }}
        />
      </dialog>
    </>
  );
}
