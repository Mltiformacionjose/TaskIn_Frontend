/**
 * Fechas para mostrar. `due_date` llega como `AAAA-MM-DD` (fecha sin hora):
 * se lee por partes para que la zona horaria no la mueva un día.
 */

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parts(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/** «14 nov 2026». */
export function formatDate(isoDate: string): string {
  const { year, month, day } = parts(isoDate);
  return `${day} ${MONTHS.at(month - 1)} ${year}`;
}

/** «14 nov», para listados compactos. */
export function formatShortDate(isoDate: string): string {
  const { month, day } = parts(isoDate);
  return `${day} ${MONTHS.at(month - 1)}`;
}

/** Hoy en hora local, `AAAA-MM-DD`. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Vencida = fecha anterior a hoy y no hecha (RN-13). */
export function isOverdue(dueDate: string | null, status: string, today = todayIso()): boolean {
  return dueDate !== null && status !== "done" && dueDate < today;
}

/** «Hace 5 minutos», «Ayer», «12 nov 2026»: momento de un aviso. */
export function formatMoment(isoDateTime: string, now = new Date()): string {
  const then = new Date(isoDateTime);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && then.getDate() === now.getDate()) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return "Ayer";
  return formatLocalDate(isoDateTime);
}

/** «14 nov 2026» de un instante (con hora), en la fecha local del navegador. */
export function formatLocalDate(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}
