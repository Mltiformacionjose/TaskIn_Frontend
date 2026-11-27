"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { errorMessage } from "@/services/errors";
import { Button } from "./button";

type ToastAction = {
  label: string;
  /** Si falla, el aviso muestra el error en su lugar. */
  run: () => Promise<void>;
};

type ToastInput = { message: string; action?: ToastAction };
type Toast = ToastInput & { id: number; tone: "info" | "danger" };

type ToastApi = { show: (toast: ToastInput) => void };

/** Segundos que el aviso sigue visible (WCAG 2.2.1: hay margen y se puede cerrar). */
const DURATION_MS = 10_000;

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return api;
}

/**
 * Aviso flotante abajo a la derecha, con una acción opcional («Deshacer»).
 * Vive en el marco con sesión, así sigue visible tras cambiar de pantalla.
 * Uno cada vez: uno nuevo sustituye al anterior.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const hovered = useRef(false);

  const show = useCallback((input: ToastInput) => {
    setPending(false);
    setToast({ ...input, id: nextId.current++, tone: "info" });
  }, []);
  const close = useCallback(() => setToast(null), []);

  // Se cierra solo, salvo mientras el puntero está encima o la acción está en curso.
  useEffect(() => {
    if (!toast || pending) return;
    const timer = window.setTimeout(() => {
      if (!hovered.current) setToast((current) => (current?.id === toast.id ? null : current));
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, pending]);

  const runAction = async () => {
    if (!toast?.action) return;
    setPending(true);
    try {
      await toast.action.run();
      setToast((current) => (current?.id === toast.id ? null : current));
    } catch (error) {
      setToast({ id: nextId.current++, tone: "danger", message: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end md:inset-x-auto md:right-6 md:bottom-6"
      >
        {toast && (
          <div
            key={toast.id}
            onMouseEnter={() => {
              hovered.current = true;
            }}
            onMouseLeave={() => {
              hovered.current = false;
            }}
            className={
              "pointer-events-auto flex w-full max-w-[460px] items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-[0_22px_75px_var(--shadow)] " +
              (toast.tone === "danger" ? "border-danger/40 bg-danger-soft text-danger-text" : "border-line bg-panel-2 text-fg")
            }
          >
            <p className="min-w-0 flex-1 leading-normal">{toast.message}</p>
            {toast.action && (
              <Button variant="secondary" className="px-3 py-2" onClick={runAction} disabled={pending}>
                {pending ? "Un momento…" : toast.action.label}
              </Button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar aviso"
              className="cursor-pointer rounded-md px-1.5 text-lg leading-none text-muted hover:text-fg"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
