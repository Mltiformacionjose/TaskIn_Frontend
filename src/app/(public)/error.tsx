"use client"; // Los límites de error son componentes de cliente.

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/auth-card";

/** Fallo inesperado en una pantalla sin sesión (acceso, registro, recuperación). */
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthCard
      eyebrow="Error"
      title="Algo ha fallado"
      description="No se pudo mostrar esta pantalla."
      footer={
        <Link href="/login" className="text-accent-text hover:underline">
          Ir a iniciar sesión
        </Link>
      }
      note="Si el problema continúa, inténtalo de nuevo en unos minutos."
    >
      <Button className="w-full" onClick={() => retry()}>
        Reintentar
      </Button>
    </AuthCard>
  );
}
