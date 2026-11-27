import type { Metadata } from "next";
import { StatsScreen } from "@/features/stats/stats-screen";

export const metadata: Metadata = { title: "Estadísticas · TaskIn" };

// La sesión se comprueba en el navegador (SessionProvider, ADR-0008): el servidor no pinta esta
// página, así que Next.js no puede validar su navegación instantánea. Se excluye a propósito.
// Ponerlo en el layout de (private) no basta: la exclusión no se hereda a las páginas.
export const instant = false;

/** RF-39: estadísticas con periodo, lista y cumplimiento. */
export default function StatsPage() {
  return <StatsScreen />;
}
