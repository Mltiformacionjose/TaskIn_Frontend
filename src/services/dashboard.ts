import type { Dashboard } from "@/types/api";
import { request } from "./http";

/** GET /dashboard — RF-26, RF-37, RF-38. */
export function getDashboard(): Promise<Dashboard> {
  return request<Dashboard>("/dashboard");
}
