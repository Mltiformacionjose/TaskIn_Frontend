"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { formatShortDate, isOverdue, todayIso } from "@/lib/dates";
import { errorMessage } from "@/services/errors";
import { updateTask } from "@/services/tasks";
import type { ListMember, Task, TaskStatus } from "@/types/api";
import { STATUS_ORDER, TASK_STATUS } from "./status";

/** Tarea mostrada en las vistas; `list_name` aparece cuando se mezclan listas (dashboard). */
export type ViewTask = Task & { list_name?: string };

export type TaskView = "list" | "calendar" | "kanban";

export const VIEW_OPTIONS: { value: TaskView; label: string; glyph: string }[] = [
  { value: "list", label: "Lista", glyph: "☷" },
  { value: "calendar", label: "Calendario", glyph: "▦" },
  { value: "kanban", label: "Kanban", glyph: "▤" },
];

type ViewProps = {
  tasks: ViewTask[];
  /** Miembros de la lista, para mostrar responsables (solo en el detalle de una lista compartida). */
  members?: ListMember[];
  /** Mostrar la columna o el dato «Lista» (dashboard). */
  showList?: boolean;
  /** Se llama tras cambiar un estado; `error` si la API lo rechazó. */
  onChanged: (error?: string) => void;
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function taskHref(task: Task) {
  return `/lists/${task.list_id}/tasks/${task.id}`;
}

async function changeStatus(task: Task, status: TaskStatus, onChanged: (error?: string) => void) {
  if (status === task.status) return;
  try {
    await updateTask(task.id, { status });
    onChanged();
  } catch (error) {
    onChanged(errorMessage(error));
  }
}

function Assignees({ task, members }: { task: Task; members: ListMember[] }) {
  const name = (id: number) => members.find((m) => m.user_id === id)?.username ?? "?";
  if (task.assignee_ids.length === 0) return <span className="text-muted">Sin responsable</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {task.assignee_ids.map((id) => (
        <span key={id} title={name(id)} className="grid h-7 min-w-7 place-items-center rounded-full bg-chip px-1.5 text-xs font-bold">
          <span aria-hidden="true">{initials(name(id))}</span>
          <span className="sr-only">{name(id)}</span>
        </span>
      ))}
    </span>
  );
}

/** Selector de estado: cambia el estado sin abrir la tarea (RF-22). */
export function StatusSelect({ task, onChanged }: { task: Task; onChanged: (error?: string) => void }) {
  const [pending, setPending] = useState(false);
  return (
    <select
      aria-label={`Estado de «${task.title}»`}
      value={task.status}
      disabled={pending}
      onChange={async (e) => {
        setPending(true);
        await changeStatus(task, e.target.value as TaskStatus, onChanged);
        setPending(false);
      }}
      className="rounded-full border border-line bg-chip px-2.5 py-1.5 text-xs text-fg outline-none focus-visible:border-accent"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS[s].label}
        </option>
      ))}
    </select>
  );
}

function DueDate({ task }: { task: Task }) {
  if (!task.due_date) return <span className="text-muted">Sin fecha</span>;
  const overdue = isOverdue(task.due_date, task.status);
  return (
    <span className={overdue ? "text-danger-text" : undefined}>
      {formatShortDate(task.due_date)}
      {overdue && " · Vencida"}
    </span>
  );
}

/* ---------------- Lista (WF-003) ---------------- */

export function TaskListView({ tasks, members, showList, onChanged }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line text-left">
            <th scope="col" className="pb-2.5 font-normal">
              TAREA
            </th>
            {showList && (
              <th scope="col" className="pb-2.5 font-normal">
                LISTA
              </th>
            )}
            {members && (
              <th scope="col" className="pb-2.5 font-normal">
                RESPONSABLES
              </th>
            )}
            <th scope="col" className="pb-2.5 font-normal">
              VENCE
            </th>
            <th scope="col" className="pb-2.5 font-normal">
              ESTADO
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-line last:border-b-0">
              <td className="py-3 pr-3">
                <Link href={taskHref(task)} className="font-semibold hover:underline">
                  {task.title}
                </Link>
              </td>
              {showList && <td className="py-3 pr-3 text-muted">{task.list_name}</td>}
              {members && (
                <td className="py-3 pr-3">
                  <Assignees task={task} members={members} />
                </td>
              )}
              <td className="py-3 pr-3 whitespace-nowrap">
                <DueDate task={task} />
              </td>
              <td className="py-3">
                <StatusSelect task={task} onChanged={onChanged} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Calendario (WF-011) ---------------- */

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Semanas del mes (lunes a domingo); `null` = hueco de otro mes. */
function monthWeeks(year: number, month: number): (number | null)[][] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export function TaskCalendarView({ tasks, showList }: ViewProps) {
  const today = todayIso();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const byDate = new Map<string, ViewTask[]>();
  for (const task of tasks) {
    if (task.due_date) byDate.set(task.due_date, [...(byDate.get(task.due_date) ?? []), task]);
  }
  const undated = tasks.filter((t) => !t.due_date);
  const title = `${MONTHS.at(cursor.month)} ${cursor.year}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold" aria-live="polite">
          {title}
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-3 py-2" onClick={() => move(-1)} aria-label="Mes anterior">
            ←
          </Button>
          <Button
            variant="ghost"
            className="px-3 py-2"
            onClick={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}
          >
            Hoy
          </Button>
          <Button variant="ghost" className="px-3 py-2" onClick={() => move(1)} aria-label="Mes siguiente">
            →
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted">Los días muestran las tareas con fecha de vencimiento.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-xs" aria-label={`Calendario de ${title}`}>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="pb-2 font-normal text-muted">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthWeeks(cursor.year, cursor.month).map((week, w) => (
              <tr key={w}>
                {week.map((day, d) => {
                  const date = day ? iso(cursor.year, cursor.month, day) : null;
                  const dayTasks = date ? (byDate.get(date) ?? []) : [];
                  return (
                    <td
                      key={d}
                      className={cn(
                        "h-24 border border-line p-1.5 align-top",
                        !day && "bg-panel-2/40",
                        date === today && "bg-accent-tint",
                      )}
                    >
                      {day && (
                        <>
                          <span className={cn("block text-right", date === today ? "font-bold text-accent-text" : "text-muted")}>
                            {day}
                            {date === today && <span className="sr-only"> (hoy)</span>}
                          </span>
                          <ul className="mt-1 flex flex-col gap-1">
                            {dayTasks.map((task) => (
                              <li key={task.id}>
                                <Link
                                  href={taskHref(task)}
                                  title={showList && task.list_name ? `${task.title} · ${task.list_name}` : task.title}
                                  className={cn(
                                    "block truncate rounded-md px-1.5 py-1 hover:underline",
                                    task.status === "done"
                                      ? "bg-chip text-muted line-through"
                                      : isOverdue(task.due_date, task.status, today)
                                        ? "bg-danger-soft text-danger-text"
                                        : "bg-chip text-fg",
                                  )}
                                >
                                  {task.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-normal text-muted">
        {undated.length === 0 ? (
          "Todas las tareas tienen fecha de vencimiento."
        ) : (
          <>
            Sin fecha de vencimiento:{" "}
            {undated.map((task, i) => (
              <span key={task.id}>
                {i > 0 && " · "}
                <Link href={taskHref(task)} className="text-fg hover:underline">
                  {task.title}
                </Link>
              </span>
            ))}
            . Siguen disponibles en las vistas Lista y Kanban.
          </>
        )}
      </p>
    </div>
  );
}

/* ---------------- Kanban (WF-012) ---------------- */

function cardDetail(task: ViewTask, showList?: boolean) {
  const where = showList && task.list_name ? `${task.list_name} · ` : "";
  if (task.status === "done") return `${where}completada`;
  if (!task.due_date) return `${where}sin fecha`;
  if (isOverdue(task.due_date, task.status)) return `${where}vencida`;
  return `${where}vence ${formatShortDate(task.due_date)}`;
}

export function TaskKanbanView({ tasks, members, showList, onChanged }: ViewProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  const drop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const task = tasks.find((t) => t.id === Number(e.dataTransfer.getData("text/plain")));
    if (task) void changeStatus(task, status, onChanged);
  };

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        Arrastra una tarjeta a otra columna o usa su selector de estado para moverla.
      </p>
      <div className="grid grid-cols-[repeat(3,minmax(220px,1fr))] gap-4 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-label={`${TASK_STATUS[status].label}: ${column.length}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={drop(status)}
              className={cn(
                "flex min-h-40 flex-col gap-2.5 rounded-xl border bg-panel-2 p-3",
                over === status && dragging !== null ? "border-accent" : "border-line",
              )}
            >
              <h3 className="flex items-center justify-between text-sm font-bold">
                <Pill tone={TASK_STATUS[status].tone}>{TASK_STATUS[status].label}</Pill>
                <span className="text-muted">{column.length}</span>
              </h3>
              {column.map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(task.id));
                    setDragging(task.id);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-line bg-panel p-3",
                    dragging === task.id && "opacity-50",
                  )}
                >
                  <Link href={taskHref(task)} className="block text-sm font-semibold hover:underline">
                    {task.title}
                  </Link>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isOverdue(task.due_date, task.status) ? "text-danger-text" : "text-muted",
                    )}
                  >
                    {cardDetail(task, showList)}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    {members ? <Assignees task={task} members={members} /> : <span />}
                    <StatusSelect task={task} onChanged={onChanged} />
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Muestra las tareas en la vista elegida. */
export function TaskViews({ view, ...props }: ViewProps & { view: TaskView }) {
  if (view === "calendar") return <TaskCalendarView {...props} />;
  if (view === "kanban") return <TaskKanbanView {...props} />;
  return <TaskListView {...props} />;
}
