"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/services/errors";

export type Load<T> =
  | { status: "loading" }
  | { status: "error"; message: string; error: unknown }
  | { status: "ready"; data: T };

/**
 * Carga datos de la API al montar y cada vez que cambia `key` (p. ej. el id
 * de la lista o el filtro). `reload()` vuelve a pedirlos sin pasar por
 * «cargando»: los datos visibles se mantienen hasta que llegan los nuevos.
 */
export function useLoad<T>(fetcher: () => Promise<T>, key: string | number = "") {
  const [load, setLoad] = useState<Load<T>>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;
    fetcherRef
      .current()
      .then((data) => active && setLoad({ status: "ready", data }))
      .catch((error: unknown) => active && setLoad({ status: "error", message: errorMessage(error), error }));
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { load, reload };
}
