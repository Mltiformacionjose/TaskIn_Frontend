"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/services/errors";
import { getLists } from "@/services/lists";

/** «g» seguida de una tecla: ir a una pantalla. */
const GO_TO: Record<string, { href: string; label: string }> = {
  i: { href: "/", label: "Inicio" },
  l: { href: "/lists", label: "Mis listas" },
  e: { href: "/stats", label: "Estadísticas" },
  v: { href: "/invitations", label: "Invitaciones" },
  n: { href: "/notifications", label: "Notificaciones" },
  p: { href: "/trash", label: "Papelera" },
  a: { href: "/settings", label: "Ajustes" },
};

/** Tiempo para pulsar la segunda tecla tras «g». */
const SEQUENCE_MS = 1500;

/** No se interfiere con la escritura ni con los diálogos abiertos. */
function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable='true']")) return true;
  return document.querySelector("dialog[open]") !== null;
}

/**
 * Mejora 11: atajos de teclado en las pantallas con sesión.
 * `?` ayuda · `n` nueva tarea · `/` buscar · `g` + tecla para ir a una pantalla.
 */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const newTask = async () => {
      // En el detalle de una lista, la tarea va a esa lista; si no, a «Mis tareas».
      const inList = pathname.match(/^\/lists\/(\d+)$/);
      if (inList) return router.push(`/lists/${inList[1]}/tasks/new`);
      try {
        const lists = await getLists();
        const target = lists.find((l) => l.is_default) ?? lists[0];
        if (target) router.push(`/lists/${target.id}/tasks/new`);
      } catch (error) {
        toast.show({ message: errorMessage(error) });
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnore(event)) return;
      const key = event.key;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const destination = GO_TO[key.toLowerCase()];
        if (destination) {
          event.preventDefault();
          router.push(destination.href);
        }
        return;
      }

      if (key === "?") {
        event.preventDefault();
        dialogRef.current?.showModal();
      } else if (key === "g") {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, SEQUENCE_MS);
      } else if (key === "n") {
        event.preventDefault();
        void newTask();
      } else if (key === "/") {
        const search = document.querySelector<HTMLInputElement>("main input[type='search']");
        if (search) {
          event.preventDefault();
          search.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (pendingG.current !== null) window.clearTimeout(pendingG.current);
    };
  }, [pathname, router, toast]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto w-[min(480px,calc(100%-32px))] rounded-[17px] border border-line bg-panel p-[30px] text-fg shadow-[0_22px_75px_var(--shadow)] backdrop:bg-black/60"
    >
      <h2 id={titleId} className="mb-4 text-xl font-bold">
        Atajos de teclado
      </h2>
      <dl className="mb-6 grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2.5 text-sm">
        <Shortcut keys={["n"]}>Nueva tarea (en la lista abierta o en «Mis tareas»)</Shortcut>
        <Shortcut keys={["/"]}>Ir al buscador de la pantalla, si lo hay</Shortcut>
        {Object.entries(GO_TO).map(([key, { label }]) => (
          <Shortcut key={key} keys={["g", key]}>
            Ir a {label}
          </Shortcut>
        ))}
        <Shortcut keys={["?"]}>Mostrar esta ayuda</Shortcut>
        <Shortcut keys={["Esc"]}>Cerrar un diálogo</Shortcut>
      </dl>
      <p className="mb-5 text-xs text-muted">No funcionan mientras escribes en un campo.</p>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
          Cerrar
        </Button>
      </div>
    </dialog>
  );
}

function Shortcut({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <>
      <dt className="flex gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="min-w-[26px] rounded-md border border-line bg-panel-2 px-1.5 py-0.5 text-center text-xs font-semibold">
            {k}
          </kbd>
        ))}
      </dt>
      <dd className="text-muted">{children}</dd>
    </>
  );
}
