import type { Id, Notification } from "@/types/api";
import { request } from "./http";

/** GET /notifications — RF-33. Últimos 30 días; crea antes los avisos de vencimiento que falten. */
export function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>("/notifications");
}

/** PATCH /notifications/{notification_id} — marcar como leído o no leído. */
export function markNotification(notificationId: Id, read: boolean): Promise<Notification> {
  return request<Notification>(`/notifications/${notificationId}`, { method: "PATCH", body: { read } });
}
