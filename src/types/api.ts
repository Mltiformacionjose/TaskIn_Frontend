/**
 * Tipos de los datos que intercambian frontend y backend.
 *
 * Copian las respuestas de la API real (API_CONTRACT v0.8, §4.1 a §4.7). Los
 * nombres van en snake_case porque así los devuelve FastAPI. Si cambia la
 * API, OpenAPI (`/docs` del backend) manda y este archivo se ajusta (ADR-0009).
 */

export type Id = number;

/** Valores de `tasks.status` (CHECK ck_tasks_status). */
export type TaskStatus = "todo" | "in_progress" | "done";

/** Valores de `task_lists.list_type` (CHECK ck_task_lists_type). */
export type ListType = "personal" | "shared";

/** Perfil público del usuario (nunca incluye la contraseña). */
export type User = {
  id: Id;
  username: string;
  email: string;
  /** RF-06: el correo actual está verificado. No bloquea el acceso. */
  email_verified: boolean;
};

/** GET /me/settings — interruptor único de avisos (RF-36). */
export type Settings = {
  notifications_enabled: boolean;
};

export type TaskList = {
  id: Id;
  name: string;
  description: string | null;
  list_type: ListType;
  owner_id: Id;
  /** Lista personal por defecto «Mis tareas», creada al registrarse (modelo v0.6). */
  is_default: boolean;
};

/** Lista con el resumen que muestra WF-002 Mis listas (GET /lists). */
export type ListSummary = TaskList & {
  task_count: number;
  done_count: number;
  /** Propietario más participantes con la invitación aceptada. */
  member_count: number;
};

/** Participante de una lista (incluye al propietario). */
export type ListMember = {
  user_id: Id;
  username: string;
  is_owner: boolean;
};

export type Task = {
  id: Id;
  list_id: Id;
  title: string;
  description: string | null;
  /** Fecha sin hora, `AAAA-MM-DD`. */
  due_date: string | null;
  status: TaskStatus;
  creator_id: Id;
  /** Sin duplicados y ordenados. */
  assignee_ids: Id[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Tarea de GET /me/tasks: incluye el nombre de su lista. */
export type MyTask = Task & { list_name: string };

/** Alcance de GET /me/tasks (panel «Mis tareas» de WF-001). */
export type MyTasksScope = "all" | "created" | "assigned";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled" | "removed";

export type Invitation = {
  id: Id;
  list_id: Id;
  list_name: string;
  owner_username: string;
  invited_user_id: Id;
  invited_username: string;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
};

export type NotificationType = "task_assigned" | "task_overdue" | "invitation_received";

export type Notification = {
  id: Id;
  notification_type: NotificationType;
  task_id: Id | null;
  task_title: string | null;
  invitation_id: Id | null;
  list_id: Id | null;
  list_name: string | null;
  created_at: string;
  read_at: string | null;
};

export type StatusCounts = {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
};

/** Tarea resumida de las secciones «Próximas» y «Vencidas» del dashboard. */
export type DashboardTask = {
  id: Id;
  list_id: Id;
  list_name: string;
  title: string;
  due_date: string;
  status: TaskStatus;
};

/** GET /dashboard — RF-37, RF-38. */
export type Dashboard = {
  /** Fecha del servidor, `AAAA-MM-DD`. */
  today: string;
  /** Mis tareas: asignadas a mí y las de mis listas personales. */
  assigned: StatusCounts;
  /** Las que he creado en listas de las que soy miembro. */
  created: StatusCounts;
  upcoming: DashboardTask[];
  overdue: DashboardTask[];
};

/** GET /dashboard/stats — RF-39. Semana de lunes a domingo. */
export type WeekStats = { week_start: string; created: number; completed: number };

export type ListStats = { list_id: Id; list_name: string; total: number; done: number };

export type Stats = {
  start: string;
  end: string;
  list_id: Id | null;
  created: number;
  completed: number;
  /** Con fecha límite en el periodo: completadas a tiempo / tarde o sin hacer tras vencer. */
  on_time: number;
  late: number;
  completion_rate: number | null;
  status: StatusCounts;
  weeks: WeekStats[];
  by_list: ListStats[];
};

export type StatsQuery = { scope?: MyTasksScope; list_id?: Id; start?: string; end?: string };

export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_deleted"
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "owner_changed"
  | "list_updated";

/** GET /lists/{list_id}/activity — RF-31. */
export type Activity = {
  id: Id;
  action: ActivityAction;
  actor_id: Id;
  actor_username: string;
  /** null si la tarea se borró (el título queda guardado). */
  task_id: Id | null;
  task_title: string | null;
  target_user_id: Id | null;
  target_username: string | null;
  /** Estado nuevo en `task_status_changed`. */
  detail: TaskStatus | null;
  created_at: string;
};

/* ---------- Cuerpos de petición ---------- */

/** POST /auth/register */
export type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

/** POST /auth/login */
export type LoginInput = {
  email: string;
  password: string;
};

/** POST /auth/password-reset/confirm */
export type PasswordResetConfirmInput = {
  token: string;
  password: string;
};

/** POST /lists — RF-08, RF-09. La lista nueva nunca es la lista por defecto. */
export type ListCreateInput = {
  name: string;
  description: string | null;
  list_type: ListType;
};

/**
 * PATCH /lists/{list_id} — RF-16. Solo el propietario; solo cambian los campos
 * enviados. `list_type` solo admite pasar de «personal» a «shared».
 */
export type ListUpdateInput = Partial<ListCreateInput>;

/** PATCH /me — RF-05. Cambiar el correo exige `current_password`. */
export type ProfileUpdateInput = {
  username?: string;
  email?: string;
  current_password?: string;
};

/** POST /me/password — RF-05. Cierra las demás sesiones. */
export type PasswordChangeInput = {
  current_password: string;
  new_password: string;
};

/** POST /lists/{list_id}/tasks. El estado inicial lo fija el backend («todo»). */
export type TaskCreateInput = {
  title: string;
  description: string | null;
  due_date: string | null;
  assignee_ids: Id[];
};

/**
 * PATCH /tasks/{task_id}. Solo cambian los campos enviados; `description` y
 * `due_date` a null se borran; `assignee_ids` sustituye a todos.
 */
export type TaskUpdateInput = Partial<TaskCreateInput & { status: TaskStatus }> & {
  /** RF-29: el `updated_at` que vio el formulario; si la tarea cambió después, 409 `edit_conflict`. */
  expected_updated_at?: string;
};

/* ---------- Errores ---------- */

/** Estructura de error única de la API (API_CONTRACT §3). */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: string[];
  };
};
