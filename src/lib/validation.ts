/**
 * Validaciones de formulario.
 *
 * Solo son ayuda de usabilidad: la validación que cuenta es la del backend y
 * las restricciones de la base de datos. Los límites copian el modelo v0.6
 * (NEX-DOC-005, definitivo) para que el usuario vea el error antes de enviar.
 */

import type { ListCreateInput, LoginInput, RegisterInput, TaskCreateInput } from "@/types/api";

/** Errores por campo: nombre del campo → mensaje para el usuario. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export const LIMITS = {
  usernameMax: 50, // users.username varchar(50)
  emailMax: 255, // users.email varchar(255)
  passwordMin: 12, // propuesta de NEX-DOC-007 (RN-01, CA-01)
  passwordMax: 128, // límite de la API (app/schemas/accounts.py)
  taskTitleMax: 150, // tasks.title varchar(150)
  taskDescriptionMax: 2000, // límite de la API (P-32); la columna es text
  listNameMax: 150, // task_lists.name varchar(150)
  listDescriptionMax: 500, // task_lists.description varchar(500)
} as const;

// Comprobación sencilla de forma; la verificación real la hace el backend.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateEmail(email: string): string | undefined {
  if (!email) return "Introduce tu correo electrónico.";
  if (email.length > LIMITS.emailMax) return `El correo no puede superar ${LIMITS.emailMax} caracteres.`;
  if (!EMAIL_PATTERN.test(email)) return "Introduce un correo electrónico válido.";
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const username = input.username.trim();
  if (!username) errors.username = "Introduce un nombre de usuario.";
  else if (username.length > LIMITS.usernameMax)
    errors.username = `El nombre de usuario no puede superar ${LIMITS.usernameMax} caracteres.`;

  const email = validateEmail(input.email.trim());
  if (email) errors.email = email;

  if (input.password.length < LIMITS.passwordMin)
    errors.password = `La contraseña debe tener al menos ${LIMITS.passwordMin} caracteres.`;
  return errors;
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  const email = validateEmail(input.email.trim());
  if (email) errors.email = email;
  if (!input.password) errors.password = "Introduce tu contraseña.";
  return errors;
}

export function validateTaskCreate(input: TaskCreateInput): FieldErrors<TaskCreateInput> {
  const errors: FieldErrors<TaskCreateInput> = {};
  const title = input.title.trim();
  if (!title) errors.title = "El título es obligatorio.";
  else if (title.length > LIMITS.taskTitleMax)
    errors.title = `El título no puede superar ${LIMITS.taskTitleMax} caracteres.`;

  if (input.description && input.description.trim().length > LIMITS.taskDescriptionMax)
    errors.description = `La descripción no puede superar ${LIMITS.taskDescriptionMax} caracteres.`;

  if (input.due_date && !DATE_PATTERN.test(input.due_date))
    errors.due_date = "Introduce una fecha válida.";
  return errors;
}

/** Contraseña nueva (registro y recuperación): de 12 a 128 caracteres. */
export function validateNewPassword(password: string): string | undefined {
  if (password.length < LIMITS.passwordMin) return `La contraseña debe tener al menos ${LIMITS.passwordMin} caracteres.`;
  if (password.length > LIMITS.passwordMax) return `La contraseña no puede superar ${LIMITS.passwordMax} caracteres.`;
}

export function validateListCreate(input: ListCreateInput): FieldErrors<ListCreateInput> {
  const errors: FieldErrors<ListCreateInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = "El nombre de la lista es obligatorio.";
  else if (name.length > LIMITS.listNameMax)
    errors.name = `El nombre no puede superar ${LIMITS.listNameMax} caracteres.`;

  if (input.description && input.description.trim().length > LIMITS.listDescriptionMax)
    errors.description = `La descripción no puede superar ${LIMITS.listDescriptionMax} caracteres.`;

  if (input.list_type !== "personal" && input.list_type !== "shared") errors.list_type = "Elige el tipo de lista.";
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
