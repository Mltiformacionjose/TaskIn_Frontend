import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";

export const metadata: Metadata = { title: "Cuenta eliminada · TaskIn" };

/** RF-07: destino tras eliminar la cuenta. */
export default function AccountDeletedPage() {
  return (
    <AuthCard
      eyebrow="Tu cuenta"
      title="Cuenta eliminada"
      description="Hemos borrado tu cuenta, tus listas personales y tus avisos."
      footer={
        <Link href="/register" className="text-accent-text hover:underline">
          Crear una cuenta nueva
        </Link>
      }
      note="Las tareas que creaste en listas de otras personas siguen allí, como de un «usuario eliminado»."
    >
      <p className="text-sm leading-normal text-muted">
        Gracias por usar TaskIn. Puedes volver cuando quieras con el mismo correo o con otro.
      </p>
    </AuthCard>
  );
}
