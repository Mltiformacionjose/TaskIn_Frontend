import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña · TaskIn" };

/** RF-03: destino del enlace de recuperación (`/reset-password?token=…`). */
export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <AuthCard
      eyebrow="Recuperación de acceso"
      title="Elige una nueva contraseña"
      description="El enlace sirve una sola vez y caduca a los 30 minutos."
      footer={
        <Link href="/login" className="text-accent-text hover:underline">
          ← Volver al inicio de sesión
        </Link>
      }
      note="Al cambiar la contraseña se cierran todas tus sesiones abiertas."
    >
      {/* Con Cache Components la consulta es un dato de la petición: se lee dentro de Suspense. */}
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
        <ResetForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetForm({ searchParams }: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
