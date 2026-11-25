"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { STATUS_ORDER, TASK_STATUS } from "@/features/tasks/status";
import { useLoad } from "@/hooks/use-load";
import { formatShortDate, todayIso } from "@/lib/dates";
import { getStats } from "@/services/dashboard";
import { getLists } from "@/services/lists";
import type { MyTasksScope, Stats, TaskStatus, WeekStats } from "@/types/api";

type Period = "4" | "8" | "12" | "26" | "custom";

const PERIODS: { value: Period; label: string }[] = [
  { value: "4", label: "4 semanas" },
  { value: "8", label: "8 semanas" },
  { value: "12", label: "12 semanas" },
  { value: "26", label: "6 meses" },
  { value: "custom", label: "Personalizado" },
];

const SCOPES: { value: MyTasksScope; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "created", label: "Creadas por mí" },
  { value: "assigned", label: "Asignadas a mí" },
];

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "var(--info)",
  in_progress: "var(--progress)",
  done: "var(--success)",
};
const CREATED_COLOR = "var(--info)";
const COMPLETED_COLOR = "var(--success)";

function weeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (weeks * 7 - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function percent(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)} %`;
}

function Card({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Barras por semana: creadas y completadas. Los datos también van en una tabla para lectores de pantalla. */
function WeeklyChart({ weeks }: { weeks: WeekStats[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.completed]));
  // Lienzo fijo que se escala al ancho del panel; las barras se reparten en él.
  const width = 640;
  const height = 180;
  const left = 24;
  const top = 12;
  const slot = (width - left) / Math.max(weeks.length, 1);
  const bar = Math.min(16, slot * 0.32);
  const every = Math.ceil(weeks.length / 9); // como mucho 9 etiquetas de semana
  const scale = (value: number) => (value / max) * (height - top);
  return (
    <>
      <div>
        <svg viewBox={`0 0 ${width} ${height + 24}`} aria-hidden="true" className="h-auto w-full">
          <line x1={left} x2={width} y1={top} y2={top} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={left - 6} y={top + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            {max}
          </text>
          <text x={left - 6} y={height + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            0
          </text>
          <line x1={left} x2={width} y1={height} y2={height} stroke="var(--line)" />
          {weeks.map((w, i) => {
            const x = left + i * slot + (slot - bar * 2 - 3) / 2;
            const created = scale(w.created);
            const completed = scale(w.completed);
            return (
              <g key={w.week_start}>
                <rect x={x} y={height - created} width={bar} height={created} rx="2" fill={CREATED_COLOR}>
                  <title>{`Semana del ${formatShortDate(w.week_start)}: ${w.created} creadas`}</title>
                </rect>
                <rect x={x + bar + 3} y={height - completed} width={bar} height={completed} rx="2" fill={COMPLETED_COLOR}>
                  <title>{`Semana del ${formatShortDate(w.week_start)}: ${w.completed} completadas`}</title>
                </rect>
                {i % every === 0 && (
                  <text x={left + i * slot + slot / 2} y={height + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
                    {formatShortDate(w.week_start)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>Tareas creadas y completadas por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana del</th>
            <th scope="col">Creadas</th>
            <th scope="col">Completadas</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week_start}>
              <th scope="row">{formatShortDate(w.week_start)}</th>
              <td>{w.created}</td>
              <td>{w.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function StatusBar({ stats }: { stats: Stats }) {
  const total = stats.status.total;
  if (total === 0) return <p className="text-sm text-muted">No hay tareas con estos filtros.</p>;
  return (
    <>
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-chip" aria-hidden="true">
        {STATUS_ORDER.map((s) => (
          <span key={s} style={{ width: `${(stats.status[s] / total) * 100}%`, background: STATUS_COLOR[s] }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {STATUS_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            {TASK_STATUS[s].label}: <strong>{stats.status[s]}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}

function ByList({ stats }: { stats: Stats }) {
  if (stats.by_list.length === 0) return <p className="text-sm text-muted">No hay tareas con estos filtros.</p>;
  const max = Math.max(...stats.by_list.map((l) => l.total));
  return (
    <ul className="flex flex-col gap-3">
      {stats.by_list.map((l) => (
        <li key={l.list_id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{l.list_name}</span>
            <span className="shrink-0 text-muted">
              {l.done} de {l.total} hechas
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-chip" aria-hidden="true">
            <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${(l.total / max) * 100}%` }}>
              <span style={{ width: `${(l.done / l.total) * 100}%`, background: COMPLETED_COLOR }} />
              <span className="flex-1" style={{ background: "var(--accent-border)" }} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * RF-39: estadísticas del dashboard con periodo, lista y alcance: creadas y
 * completadas por semana, cumplimiento de las fechas límite, estado actual y
 * reparto por lista. Los datos los calcula la API (GET /dashboard/stats).
 */
export function StatsScreen() {
  const [period, setPeriod] = useState<Period>("8");
  const [custom, setCustom] = useState({ start: weeksAgo(8), end: todayIso() });
  const [scope, setScope] = useState<MyTasksScope>("all");
  const [listId, setListId] = useState<string>("");

  const range = period === "custom" ? custom : { start: weeksAgo(Number(period)), end: todayIso() };
  const lists = useLoad(getLists);
  const query = { scope, list_id: listId ? Number(listId) : undefined, start: range.start, end: range.end };
  const stats = useLoad(() => getStats(query), JSON.stringify(query));

  return (
    <>
      <PageHeader
        eyebrow="Inicio"
        title="Estadísticas"
        description="Cómo evolucionan tus tareas: lo que creas, lo que completas y si llegas a tiempo."
      />

      <Panel className="mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIODS} className="flex-wrap" />
            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  Desde
                  <input
                    type="date"
                    value={custom.start}
                    max={custom.end}
                    onChange={(e) => e.target.value && setCustom((c) => ({ ...c, start: e.target.value }))}
                    className="rounded-[9px] border border-line bg-panel-2 px-2.5 py-1.5 text-fg"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Hasta
                  <input
                    type="date"
                    value={custom.end}
                    min={custom.start}
                    onChange={(e) => e.target.value && setCustom((c) => ({ ...c, end: e.target.value }))}
                    className="rounded-[9px] border border-line bg-panel-2 px-2.5 py-1.5 text-fg"
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Alcance" value={scope} onChange={setScope} options={SCOPES} className="flex-wrap" />
            <select
              aria-label="Lista"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="rounded-[9px] border border-line bg-panel-2 px-2.5 py-2 text-xs text-fg outline-none focus-visible:border-accent"
            >
              <option value="">Todas las listas</option>
              {lists.load.status === "ready" &&
                lists.load.data.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Panel>

      <LoadState load={stats.load} loading="Calculando estadísticas…" onRetry={stats.reload}>
        {(data) => (
          <>
            <p className="mb-4 text-sm text-muted">
              Del {formatShortDate(data.start)} al {formatShortDate(data.end)}
            </p>
            <section aria-label="Resumen del periodo" className="mb-5 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Creadas" value={data.created} hint="En el periodo" />
              <Card label="Completadas" value={data.completed} hint="En el periodo" />
              <Card
                label="Cumplimiento"
                value={percent(data.completion_rate)}
                hint={
                  data.on_time + data.late
                    ? `${data.on_time} de ${data.on_time + data.late} a tiempo`
                    : "Sin fechas límite vencidas en el periodo"
                }
              />
              <Card label="Tareas ahora" value={data.status.total} hint={`${data.status.done} hechas`} />
            </section>
            {data.late > 0 && data.completion_rate !== null && data.completion_rate < 0.5 && (
              <Alert>Más de la mitad de las tareas con fecha del periodo se completaron tarde o siguen sin hacer.</Alert>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
              <Panel
                title="Evolución semanal"
                description="Tareas creadas y completadas cada semana."
                actions={
                  <Legend
                    items={[
                      { label: "Creadas", color: CREATED_COLOR },
                      { label: "Completadas", color: COMPLETED_COLOR },
                    ]}
                  />
                }
              >
                <WeeklyChart weeks={data.weeks} />
              </Panel>
              <div className="flex flex-col gap-5">
                <Panel title="Estado actual">
                  <StatusBar stats={data} />
                </Panel>
                <Panel title="Por lista" description="Tareas hechas sobre el total de cada lista.">
                  <ByList stats={data} />
                </Panel>
              </div>
            </div>
          </>
        )}
      </LoadState>
    </>
  );
}
