import type { Activity, Id, ListCreateInput, ListMember, ListSummary, ListUpdateInput, TaskList, Trash } from "@/types/api";
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

/** PATCH /lists/{list_id} — RF-16. Solo el propietario: nombre, descripción y pasar a compartida. */
export function updateList(listId: Id, input: ListUpdateInput): Promise<TaskList> {
  return request<TaskList>(`/lists/${listId}`, { method: "PATCH", body: input });
}

/** POST /lists/{list_id}/leave — RF-13. El propietario debe transferirla antes (409). */
export function leaveList(listId: Id): Promise<void> {
  return request<void>(`/lists/${listId}/leave`, { method: "POST" });
}

/** POST /lists/{list_id}/transfer — RF-15. Solo a un participante; el antiguo propietario sigue como participante. */
export function transferList(listId: Id, userId: Id): Promise<TaskList> {
  return request<TaskList>(`/lists/${listId}/transfer`, { method: "POST", body: { user_id: userId } });
}

/** DELETE /lists/{list_id} — RF-17, RF-18. Solo el propietario; va a la papelera 30 días. «Mis tareas» no se borra (409). */
export function deleteList(listId: Id): Promise<void> {
  return request<void>(`/lists/${listId}`, { method: "DELETE" });
}

/** POST /lists/{list_id}/restore — RF-18. Solo su propietario; vuelve con todo. */
export function restoreList(listId: Id): Promise<TaskList> {
  return request<TaskList>(`/lists/${listId}/restore`, { method: "POST" });
}

/** GET /trash — RF-18, RF-30. Mis listas borradas y las tareas borradas de mis listas. */
export function getTrash(): Promise<Trash> {
  return request<Trash>("/trash");
}

/** GET /lists/{list_id}/members — RF-24. Propietario primero. */
export function getMembers(listId: Id): Promise<ListMember[]> {
  return request<ListMember[]>(`/lists/${listId}/members`);
}

/** GET /lists/{list_id}/activity — RF-31. Del más reciente al más antiguo; con `taskId`, solo esa tarea. */
export function getActivity(listId: Id, options: { taskId?: Id; limit?: number } = {}): Promise<Activity[]> {
  const params = new URLSearchParams();
  if (options.taskId !== undefined) params.set("task_id", String(options.taskId));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  const qs = params.toString();
  return request<Activity[]>(`/lists/${listId}/activity${qs ? `?${qs}` : ""}`);
}
