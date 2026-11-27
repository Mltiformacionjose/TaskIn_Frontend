import type { Metadata } from "next";
import { InvitationsScreen } from "@/features/invitations/invitations-screen";

export const metadata: Metadata = { title: "Invitaciones · TaskIn" };

// La sesión se comprueba en el navegador (SessionProvider, ADR-0008): el servidor no pinta esta
// página, así que Next.js no puede validar su navegación instantánea. Se excluye a propósito.
// Ponerlo en el layout de (private) no basta: la exclusión no se hereda a las páginas.
export const instant = false;

/** WF-013 Invitaciones recibidas. */
export default function InvitationsPage() {
  return <InvitationsScreen />;
}
