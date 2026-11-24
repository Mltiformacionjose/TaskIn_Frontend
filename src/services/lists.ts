import type { Id, ListCreateInput, ListMember, ListSummary, TaskList } from "@/types/api";
import { request } from "./http";

/** GET /lists — RF-10. Listas propias y compartidas conmigo, incluida «Mis tareas», con su resumen. */
export function getLists(): Promise<ListSummary[]> {
  return request<ListSummary[]>("/lists");
}

/** POST /lists — RF-08 (personal), RF-09 (compartida). */
export function createList(input: ListCreateInput): Promise<TaskList> {
  return request<TaskList>("/lists", { method: "POST", body: input });
}

/** GET /lists/{list_id} — RF-10. 404 si no existe o no es accesible. */
export function getList(listId: Id): Promise<TaskList> {
  return request<TaskList>(`/lists/${listId}`);
}

/** DELETE /lists/{list_id} — RF-17. Solo el propietario; «Mis tareas» no se borra (409). */
export function deleteList(listId: Id): Promise<void> {
  return request<void>(`/lists/${listId}`, { method: "DELETE" });
}

/** GET /lists/{list_id}/members — RF-24. Propietario primero. */
export function getMembers(listId: Id): Promise<ListMember[]> {
  return request<ListMember[]>(`/lists/${listId}/members`);
}
