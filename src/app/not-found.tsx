import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/auth-card";

export const metadata: Metadata = { title: "Página no encontrada · TaskIn" };

/** 404 de toda la aplicación: una dirección que no existe. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_20%,var(--glow)_0,var(--canvas)_52%)] px-4 py-10">
      <AuthCard
        eyebrow="Error 404"
        title="Página no encontrada"
        description="La dirección no existe o ha cambiado."
        footer={
          <Link href="/" className="text-accent-text hover:underline">
            Volver al inicio
          </Link>
        }
        note="Si llegaste aquí desde un enlace de TaskIn, puede que la lista o la tarea ya no exista."
      >
        <p className="text-sm leading-normal text-muted">Comprueba la dirección o vuelve a tu espacio personal.</p>
      </AuthCard>
    </main>
  );
}
