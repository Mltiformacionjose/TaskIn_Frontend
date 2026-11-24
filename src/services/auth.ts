import type {
  LoginInput,
  PasswordChangeInput,
  PasswordResetConfirmInput,
  ProfileUpdateInput,
  RegisterInput,
  Settings,
  User,
} from "@/types/api";
import { request } from "./http";

/** POST /auth/register — RF-01. Crea la cuenta; no inicia sesión. */
export function register(input: RegisterInput): Promise<User> {
  return request<User>("/auth/register", { method: "POST", body: input });
}

/** POST /auth/login — RF-02. El backend responde con la cookie de sesión. */
export function login(input: LoginInput): Promise<User> {
  return request<User>("/auth/login", { method: "POST", body: input });
}

/** POST /auth/logout — RF-02. */
export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

/**
 * POST /auth/password-reset/request — RF-03.
 * Responde igual exista o no la cuenta (no revela qué correos están registrados).
 */
export function requestPasswordReset(email: string): Promise<void> {
  return request<void>("/auth/password-reset/request", { method: "POST", body: { email } });
}

/** POST /auth/password-reset/confirm — RF-03. Cierra todas las sesiones de la cuenta. */
export function confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
  return request<void>("/auth/password-reset/confirm", { method: "POST", body: input });
}

/** GET /me — usuario de la sesión actual (401 si no hay sesión). */
export function getCurrentUser(): Promise<User> {
  return request<User>("/me");
}

/** PATCH /me — RF-05: nombre de usuario o correo (el correo exige la contraseña actual). */
export function updateProfile(input: ProfileUpdateInput): Promise<User> {
  return request<User>("/me", { method: "PATCH", body: input });
}

/** POST /me/password — RF-05: cierra las demás sesiones; la actual sigue abierta. */
export function changePassword(input: PasswordChangeInput): Promise<void> {
  return request<void>("/me/password", { method: "POST", body: input });
}

/** GET /me/settings — RF-36. */
export function getSettings(): Promise<Settings> {
  return request<Settings>("/me/settings");
}

/** PATCH /me/settings — RF-36: interruptor único de avisos. */
export function updateSettings(input: Settings): Promise<Settings> {
  return request<Settings>("/me/settings", { method: "PATCH", body: input });
}
