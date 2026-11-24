import type { Id, Invitation } from "@/types/api";
import { request } from "./http";

/** POST /lists/{list_id}/invitations — RF-11. `identifier` = correo o nombre de usuario. */
export function invite(listId: Id, identifier: string): Promise<Invitation> {
  return request<Invitation>(`/lists/${listId}/invitations`, { method: "POST", body: { identifier } });
}

/** GET /lists/{list_id}/invitations — pendientes de la lista (solo el propietario, P-31). */
export function getListInvitations(listId: Id): Promise<Invitation[]> {
  return request<Invitation[]>(`/lists/${listId}/invitations`);
}

/** DELETE /lists/{list_id}/invitations/{invitation_id} — RF-12: cancelar. */
export function cancelInvitation(listId: Id, invitationId: Id): Promise<void> {
  return request<void>(`/lists/${listId}/invitations/${invitationId}`, { method: "DELETE" });
}

/** DELETE /lists/{list_id}/members/{user_id} — RF-14: expulsar. */
export function removeMember(listId: Id, userId: Id): Promise<void> {
  return request<void>(`/lists/${listId}/members/${userId}`, { method: "DELETE" });
}

/** GET /invitations — RF-11, RF-12: pendientes recibidas. */
export function getReceivedInvitations(): Promise<Invitation[]> {
  return request<Invitation[]>("/invitations");
}

/** POST /invitations/{invitation_id}/accept — RF-12. */
export function acceptInvitation(invitationId: Id): Promise<Invitation> {
  return request<Invitation>(`/invitations/${invitationId}/accept`, { method: "POST" });
}

/** POST /invitations/{invitation_id}/reject — RF-12. */
export function rejectInvitation(invitationId: Id): Promise<Invitation> {
  return request<Invitation>(`/invitations/${invitationId}/reject`, { method: "POST" });
}
