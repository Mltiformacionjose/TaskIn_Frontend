import type { Metadata } from "next";
import { InvitationsScreen } from "@/features/invitations/invitations-screen";

export const metadata: Metadata = { title: "Invitaciones · TaskIn" };

/** WF-013 Invitaciones recibidas. */
export default function InvitationsPage() {
  return <InvitationsScreen />;
}
