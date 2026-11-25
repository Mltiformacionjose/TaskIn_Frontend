import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/auth-card";
import { VerifyEmailScreen } from "@/features/auth/verify-email-screen";

export const metadata: Metadata = { title: "Confirmar correo · TaskIn" };

/** RF-06: destino del enlace de verificación del correo. */
export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  return (
    <AuthCard
      eyebrow="Tu cuenta"
      title="Confirmar el correo"
      description="El enlace sirve una sola vez y caduca a las 24 horas."
      footer={
        <Link href="/login" className="text-accent-text hover:underline">
          ← Ir al inicio de sesión
        </Link>
      }
      note="Puedes usar TaskIn mientras tanto; confirmar el correo te asegura poder recuperar la cuenta."
    >
      {/* Con Cache Components la consulta es un dato de la petición: se lee dentro de Suspense. */}
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
        <VerifyForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function VerifyForm({ searchParams }: Pick<PageProps<"/verify-email">, "searchParams">) {
  const { token } = await searchParams;
  return <VerifyEmailScreen token={typeof token === "string" ? token : ""} />;
}
