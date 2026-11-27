import type { Metadata } from "next";
import { TrashScreen } from "@/features/trash/trash-screen";

export const metadata: Metadata = { title: "Papelera · TaskIn" };

// La sesión se comprueba en el navegador (SessionProvider, ADR-0008): el servidor no pinta esta
// página, así que Next.js no puede validar su navegación instantánea. Se excluye a propósito.
// Ponerlo en el layout de (private) no basta: la exclusión no se hereda a las páginas.
export const instant = false;

/** RF-18 y RF-30: listas y tareas eliminadas, que se recuperan durante 30 días. */
export default function TrashPage() {
  return <TrashScreen />;
}
