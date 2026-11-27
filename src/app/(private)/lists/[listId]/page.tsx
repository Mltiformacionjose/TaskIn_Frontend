import type { Metadata } from "next";
import { Suspense } from "react";
import { ListDetailScreen } from "@/features/lists/list-detail-screen";

export const metadata: Metadata = { title: "Lista · TaskIn" };

// La sesión se comprueba en el navegador (SessionProvider, ADR-0008): el servidor no pinta esta
// página, así que Next.js no puede validar su navegación instantánea. Se excluye a propósito.
// Ponerlo en el layout de (private) no basta: la exclusión no se hereda a las páginas.
export const instant = false;

/** WF-003 Detalle de lista. */
export default function ListPage({ params }: PageProps<"/lists/[listId]">) {
  // Con Cache Components los parámetros son datos de la petición: se leen dentro de Suspense.
  return (
    <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
      <ListDetail params={params} />
    </Suspense>
  );
}

async function ListDetail({ params }: Pick<PageProps<"/lists/[listId]">, "params">) {
  const { listId } = await params;
  // Un identificador no numérico se trata como lista inexistente (id 0).
  const id = /^\d+$/.test(listId) ? Number(listId) : 0;
  return <ListDetailScreen listId={id} />;
}
