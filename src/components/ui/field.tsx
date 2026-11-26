import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldMeta = {
  label: string;
  /** Muestra «Opcional» junto a la etiqueta. */
  optional?: boolean;
  hint?: string;
  /** Mensaje de error de validación; se anuncia con role="alert". */
  error?: string;
};

const controlBase =
  "w-full rounded-lg border bg-panel-2 px-3.5 py-[13px] text-fg outline-none placeholder:text-muted focus-visible:border-accent disabled:opacity-60";

function controlClasses(invalid: boolean, className?: string) {
  return cn(controlBase, invalid ? "border-danger" : "border-line", className);
}

/** Estructura común: etiqueta, control, ayuda y error unidos por `id`. */
function FieldFrame({
  id,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: FieldMeta & { id: string; className?: string; children: ReactNode }) {
  // Si el error repite la ayuda (p. ej. «Esta lista exige fecha límite»), se muestra una sola vez.
  const shownHint = visibleHint({ hint, error });
  return (
    <div className={cn("mb-[19px]", className)}>
      <label htmlFor={id} className="mb-2 flex justify-between text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted">Opcional</span>}
      </label>
      {children}
      {shownHint && (
        <small id={`${id}-hint`} className="mt-[7px] block text-xs text-muted">
          {shownHint}
        </small>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-[7px] text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

function visibleHint({ hint, error }: Pick<FieldMeta, "hint" | "error">) {
  return hint && hint !== error ? hint : undefined;
}

function describedBy(id: string, meta: Pick<FieldMeta, "hint" | "error">) {
  const ids = [visibleHint(meta) && `${id}-hint`, meta.error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

type TextFieldProps = FieldMeta & InputHTMLAttributes<HTMLInputElement>;

/** Campo de una línea (texto, correo, contraseña, fecha…). */
export function TextField({ label, optional, hint, error, className, id, ...input }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} optional={optional} hint={hint} error={error} className={className}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { hint, error })}
        className={controlClasses(Boolean(error))}
        {...input}
      />
    </FieldFrame>
  );
}

type TextAreaFieldProps = FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Campo de varias líneas. */
export function TextAreaField({ label, optional, hint, error, className, id, ...area }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} optional={optional} hint={hint} error={error} className={className}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, { hint, error })}
        className={controlClasses(Boolean(error), "h-[100px] resize-y")}
        {...area}
      />
    </FieldFrame>
  );
}
