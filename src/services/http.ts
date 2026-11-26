import type { ApiErrorBody } from "@/types/api";
import { API_URL } from "./config";
import { ApiError } from "./errors";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

/** Un 401 fuera de /auth/* y sin campo de formulario implicado es una sesión caducada o cerrada. */
function isSessionExpired(path: string, data: unknown): boolean {
  if (path.startsWith("/auth/")) return false;
  return !(isApiErrorBody(data) && data.error.fields?.length);
}

/** Navegación completa (no `router`) para descartar el estado de la sesión anterior. */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") window.location.replace("/login");
}

/**
 * Única función que habla con la API real.
 * La sesión viaja en una cookie HttpOnly del backend (`credentials: "include"`);
 * el frontend nunca guarda tokens.
 */
export async function request<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "No se pudo conectar con el servidor. Comprueba tu conexión.");
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && isSessionExpired(path, data)) redirectToLogin();
    if (isApiErrorBody(data)) {
      const { code, message, fields } = data.error;
      throw new ApiError(response.status, code, message, fields);
    }
    throw new ApiError(response.status, "unknown_error", "Ha ocurrido un error inesperado. Inténtalo de nuevo.");
  }
  return data as T;
}
