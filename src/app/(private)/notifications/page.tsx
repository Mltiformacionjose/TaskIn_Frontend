import type { Metadata } from "next";
import { NotificationsScreen } from "@/features/notifications/notifications-screen";

export const metadata: Metadata = { title: "Notificaciones · TaskIn" };

/** WF-006 Notificaciones. */
export default function NotificationsPage() {
  return <NotificationsScreen />;
}
