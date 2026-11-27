/**
 * Calendario iCalendar (RFC 5545) con las fechas límite (mejora 10). Cada
 * tarea es un evento de día completo; el UID es estable, así que al importar
 * de nuevo el archivo el calendario actualiza los eventos en vez de duplicarlos.
 */
import { TASK_STATUS } from "@/features/tasks/status";
import type { TaskStatus } from "@/types/api";

export type CalendarTask = {
  id: number;
  list_id: number;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  list_name: string;
};

/** Texto de una propiedad: escapa \ ; , y saltos de línea. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Líneas de 75 octetos como máximo; las siguientes empiezan por un espacio. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (bytes.encode(current + char).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (iso: string) => iso.replaceAll("-", "");

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Solo las tareas pendientes con fecha: son las que tiene sentido ver en un calendario. */
export function exportableTasks<T extends CalendarTask>(tasks: T[]): (T & { due_date: string })[] {
  return tasks.filter((t): t is T & { due_date: string } => t.due_date !== null && t.status !== "done");
}

export function buildCalendar(name: string, tasks: CalendarTask[], origin: string, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskIn//Fechas límite//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const task of exportableTasks(tasks)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:taskin-task-${task.id}@taskin`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(task.due_date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(task.due_date))}`,
      `SUMMARY:${escapeText(task.title)}`,
      `DESCRIPTION:${escapeText(`Lista: ${task.list_name}\nEstado: ${TASK_STATUS[task.status].label}`)}`,
      `URL:${origin}/lists/${task.list_id}/tasks/${task.id}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Descarga el archivo en el navegador. */
export function downloadCalendar(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
