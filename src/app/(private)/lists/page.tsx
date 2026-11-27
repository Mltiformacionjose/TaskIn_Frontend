import type { Metadata } from "next";
import { ListsScreen } from "@/features/lists/lists-screen";

export const metadata: Metadata = { title: "Mis listas · TaskIn" };

// La sesión se comprueba en el navegador (SessionProvider, ADR-0008): el servidor no pinta esta
// página, así que Next.js no puede validar su navegación instantánea. Se excluye a propósito.
// Ponerlo en el layout de (private) no basta: la exclusión no se hereda a las páginas.
export const instant = false;

/** WF-002 Mis listas. */
export default function ListsPage() {
  return <ListsScreen />;
}
