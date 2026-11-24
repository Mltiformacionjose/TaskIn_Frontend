import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** URL de la API y del frontend de pruebas (las fija playwright.config.ts). */
export const API = process.env.E2E_API_URL ?? "http://localhost:8100/api/v1";
export const WEB = process.env.E2E_WEB_URL ?? "http://localhost:3100";

/** El backend exige Origin = FRONTEND_ORIGIN en POST, PATCH y DELETE (CSRF). */
const headers = { Origin: WEB };

export const PASSWORD = "contraseña-e2e-1234";

export type Person = { id: number; username: string; email: string };

/** Nombre único y corto (usuario de hasta 50 caracteres). */
export function unique(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function call<T>(request: APIRequestContext, method: "GET" | "POST" | "PATCH" | "DELETE", path: string, data?: unknown) {
  const response = await request.fetch(`${API}${path}`, { method, headers, data });
  expect(response.ok(), `${method} ${path} → ${response.status()} ${await response.text()}`).toBeTruthy();
  return (response.status() === 204 ? undefined : await response.json()) as T;
}

/** Registra una persona por la API (sin sesión). */
export async function registerPerson(request: APIRequestContext, prefix = "e2e"): Promise<Person> {
  const username = unique(prefix);
  return call<Person>(request, "POST", "/auth/register", {
    username,
    email: `${username}@example.com`,
    password: PASSWORD,
  });
}

/**
 * Registra a alguien e inicia su sesión en el navegador de `page`: la
 * petición de login comparte las cookies con la página.
 */
export async function signIn(page: Page, prefix = "e2e"): Promise<Person> {
  const person = await registerPerson(page.request, prefix);
  await call(page.request, "POST", "/auth/login", { email: person.email, password: PASSWORD });
  return person;
}

/** Atajos de la API con la sesión de `page`, para preparar datos. */
export function api(page: Page) {
  const r = page.request;
  return {
    get: <T>(path: string) => call<T>(r, "GET", path),
    post: <T>(path: string, data?: unknown) => call<T>(r, "POST", path, data),
    patch: <T>(path: string, data: unknown) => call<T>(r, "PATCH", path, data),
    delete: (path: string) => call<void>(r, "DELETE", path),
  };
}

type ListSummary = { id: number; name: string; is_default: boolean };

export async function defaultListId(page: Page): Promise<number> {
  const lists = await api(page).get<ListSummary[]>("/lists");
  return lists.find((l) => l.is_default)!.id;
}

export async function createList(page: Page, name: string, listType: "personal" | "shared" = "shared") {
  return api(page).post<{ id: number; name: string }>("/lists", { name, description: null, list_type: listType });
}

/** Fecha `AAAA-MM-DD` a `days` días de hoy (hora local). */
export function day(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
