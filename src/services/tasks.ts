import type { Id, MyTask, MyTasksScope, Task, TaskCreateInput, TaskStatus, TaskUpdateInput } from "@/types/api";
import { request } from "./http";

/**
 * GET /lists/{list_id}/tasks — RF-21, RF-23. Filtro opcional por estado;
 * ordenadas por fecha límite, las que no tienen fecha al final.
 */
export function getTasks(listId: Id, status?: TaskStatus): Promise<Task[]> {
  const query = status ? `?status=${status}` : "";
  return request<Task[]>(`/lists/${listId}/tasks${query}`);
}

/** POST /lists/{list_id}/tasks — RF-19, RF-20. */
export function createTask(listId: Id, input: TaskCreateInput): Promise<Task> {
  return request<Task>(`/lists/${listId}/tasks`, { method: "POST", body: input });
}

/** GET /tasks/{task_id} — RF-21. */
export function getTask(taskId: Id): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`);
}

/** PATCH /tasks/{task_id} — RF-19, RF-22, RF-24. */
export function updateTask(taskId: Id, input: TaskUpdateInput): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, { method: "PATCH", body: input });
}

/** DELETE /tasks/{task_id} — RF-19, RF-30. Va a la papelera 30 días. */
export function deleteTask(taskId: Id): Promise<void> {
  return request<void>(`/tasks/${taskId}`, { method: "DELETE" });
}

/** POST /tasks/{task_id}/restore — RF-30. Cualquier miembro de la lista. */
export function restoreTask(taskId: Id): Promise<Task> {
  return request<Task>(`/tasks/${taskId}/restore`, { method: "POST" });
}

/**
 * GET /me/tasks — mis tareas en todas mis listas: todas, creadas por mí o
 * asignadas a mí (las de mis listas personales cuentan como mías).
 */
export function getMyTasks(scope: MyTasksScope = "all"): Promise<MyTask[]> {
  return request<MyTask[]>(`/me/tasks?scope=${scope}`);
}
