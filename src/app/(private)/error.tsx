"use client"; // Los límites de error son componentes de cliente.

import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

/**
 * Fallo inesperado en una pantalla con sesión. La barra lateral sigue
 * disponible; «Reintentar» vuelve a pintar la pantalla. Los errores de la
 * API ya los muestra cada pantalla (LoadState): esto cubre el resto.
 */
export default function PrivateError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <>
      <PageHeader eyebrow="Error" title="Algo ha fallado" description="No se pudo mostrar esta pantalla." />
      <Panel className="max-w-[640px]">
        <Alert>Ha ocurrido un error inesperado. Tus datos no se han perdido.</Alert>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => retry()}>Reintentar</Button>
          <ButtonLink href="/" variant="secondary">
            Ir al inicio
          </ButtonLink>
        </div>
        {digest && <p className="mt-4 text-xs text-muted">Código del error: {digest}</p>}
      </Panel>
    </>
  );
}
