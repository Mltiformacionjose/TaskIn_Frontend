import type { Dashboard, Stats, StatsQuery } from "@/types/api";
import { request } from "./http";

/** GET /dashboard — RF-26, RF-37, RF-38. */
export function getDashboard(): Promise<Dashboard> {
  return request<Dashboard>("/dashboard");
}

/** GET /dashboard/stats — RF-39: periodo (por defecto 8 semanas), lista y alcance. */
export function getStats(query: StatsQuery = {}): Promise<Stats> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  const qs = params.toString();
  return request<Stats>(`/dashboard/stats${qs ? `?${qs}` : ""}`);
}
