import type { Metadata } from "next";
import { Suspense } from "react";
import { ParticipantsScreen } from "@/features/invitations/participants-screen";

export const metadata: Metadata = { title: "Participantes · TaskIn" };

/** WF-005 Gestionar participantes. */
export default function ParticipantsPage({ params }: PageProps<"/lists/[listId]/participants">) {
  // Con Cache Components los parámetros son datos de la petición: se leen dentro de Suspense.
  return (
    <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
      <Participants params={params} />
    </Suspense>
  );
}

async function Participants({ params }: Pick<PageProps<"/lists/[listId]/participants">, "params">) {
  const { listId } = await params;
  // Un identificador no numérico se trata como lista inexistente (id 0).
  const id = /^\d+$/.test(listId) ? Number(listId) : 0;
  return <ParticipantsScreen listId={id} />;
}
