import type { ReactNode } from "react";
import type { Load } from "@/hooks/use-load";
import { Alert } from "./alert";
import { Button } from "./button";

type LoadStateProps<T> = {
  load: Load<T>;
  /** Texto mientras carga, p. ej. «Cargando listas…». */
  loading: string;
  onRetry: () => void;
  children: (data: T) => ReactNode;
};

/** Muestra «cargando», el error con «Reintentar» o el contenido. */
export function LoadState<T>({ load, loading, onRetry, children }: LoadStateProps<T>) {
  if (load.status === "loading") {
    return (
      <p role="status" className="text-muted">
        {loading}
      </p>
    );
  }
  if (load.status === "error") {
    return (
      <Alert>
        {load.message}{" "}
        <Button variant="ghost" className="ml-2 px-2.5 py-1.5" onClick={onRetry}>
          Reintentar
        </Button>
      </Alert>
    );
  }
  return <>{children(load.data)}</>;
}
