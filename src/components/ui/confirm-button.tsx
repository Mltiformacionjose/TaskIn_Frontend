"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/services/errors";
import { Alert } from "./alert";
import { Button, type ButtonVariant } from "./button";

type ConfirmButtonProps = {
  /** Texto del botón que abre la confirmación. */
  label: string;
  variant?: ButtonVariant;
  className?: string;
  title: string;
  children: ReactNode;
  /** Texto del botón que confirma, p. ej. «Eliminar lista». */
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => Promise<void>;
};

/**
 * Botón que pide confirmación en un diálogo modal antes de una acción
 * definitiva (eliminar, expulsar, cancelar una invitación). Si la API
 * responde con error, el mensaje se muestra dentro del diálogo.
 */
export function ConfirmButton({
  label,
  variant = "danger",
  className,
  title,
  children,
  confirmLabel,
  pendingLabel = "Un momento…",
  onConfirm,
}: ConfirmButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button variant={variant} className={className} onClick={open}>
        {label}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(440px,calc(100%-32px))] rounded-[17px] border border-line bg-panel p-[30px] text-fg shadow-[0_22px_75px_var(--shadow)] backdrop:bg-black/60"
      >
        <h2 id={titleId} className="mb-3 text-xl font-bold">
          {title}
        </h2>
        <div className="mb-6 text-sm leading-normal text-muted">{children}</div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
