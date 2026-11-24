"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useSession } from "@/features/auth/session-provider";
import { LIST_TYPE_LABEL, plural } from "@/features/lists/list-summary";
import { TASK_STATUS } from "@/features/tasks/status";
import { useLoad } from "@/hooks/use-load";
import { formatShortDate } from "@/lib/dates";
import { getDashboard } from "@/services/dashboard";
import { getLists } from "@/services/lists";
import type { Dashboard, DashboardTask, ListSummary, StatusCounts } from "@/types/api";

type Data = { dashboard: Dashboard; lists: ListSummary[] };

function StatCard({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={tone === "danger" && value > 0 ? "mt-2 text-3xl font-bold text-danger-text" : "mt-2 text-3xl font-bold"}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function TaskRows({ tasks, empty, overdue }: { tasks: DashboardTask[]; empty: string; overdue?: boolean }) {
  if (tasks.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-[13px] border-b border-line py-3 last:border-b-0">
          <span
            className={
              overdue
                ? "w-[58px] shrink-0 rounded-lg bg-danger-soft py-1.5 text-center text-xs font-bold text-danger-text uppercase"
                : "w-[58px] shrink-0 rounded-lg bg-panel-2 py-1.5 text-center text-xs font-bold text-accent-text uppercase"
            }
          >
            {formatShortDate(task.due_date)}
          </span>
          <div className="min-w-0 flex-1">
            <Link href={`/lists/${task.list_id}/tasks/${task.id}`} className="block truncate text-sm font-semibold hover:underline">
              {task.title}
            </Link>
            <small className="text-xs text-muted">{task.list_name}</small>
          </div>
          <Pill tone={TASK_STATUS[task.status].tone}>{TASK_STATUS[task.status].label}</Pill>
        </li>
      ))}
    </ul>
  );
}

function Summary({ label, counts }: { label: string; counts: StatusCounts }) {
  return (
    <tr className="border-b border-line last:border-b-0">
      <th scope="row" className="py-2.5 text-left font-semibold">
        {label}
      </th>
      <td className="py-2.5 text-right">{counts.total}</td>
      <td className="py-2.5 text-right">{counts.todo + counts.in_progress}</td>
      <td className="py-2.5 text-right">{counts.done}</td>
    </tr>
  );
}

/**
 * WF-001 Dashboard (RF-26, RF-37, RF-38): totales de mis tareas (asignadas a
 * mí y las de mis listas personales), próximas (2 días) y vencidas, y el
 * resumen de creadas y asignadas. Sin periodo (P-10).
 */
export function DashboardScreen() {
  const { user } = useSession();
  const { load, reload } = useLoad<Data>(() =>
    Promise.all([getDashboard(), getLists()]).then(([dashboard, lists]) => ({ dashboard, lists })),
  );

  const defaultList = load.status === "ready" ? load.data.lists.find((l) => l.is_default) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Espacio personal"
        title={`Hola, ${user.username}`}
        description="Este es el resumen de tus tareas."
        actions={
          defaultList && <ButtonLink href={`/lists/${defaultList.id}/tasks/new`}>＋ Crear tarea</ButtonLink>
        }
      />
      <LoadState load={load} loading="Cargando resumen…" onRetry={reload}>
        {({ dashboard, lists }) => (
          <div className="flex flex-col gap-5">
            <section aria-label="Totales de mis tareas" className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Por hacer" value={dashboard.assigned.todo} hint="Tareas pendientes" />
              <StatCard label="En progreso" value={dashboard.assigned.in_progress} hint="Tareas en curso" />
              <StatCard label="Hechas" value={dashboard.assigned.done} hint="Tareas completadas" />
              <StatCard label="Vencidas" value={dashboard.overdue.length} hint="Requieren atención" tone="danger" />
            </section>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
              <Panel title="Próximas tareas" description="Vencen hoy o en los próximos 2 días.">
                <TaskRows tasks={dashboard.upcoming} empty="No tienes tareas que venzan en los próximos días." />
              </Panel>
              <Panel title="Vencidas" description="Con fecha anterior a hoy y sin terminar.">
                <TaskRows tasks={dashboard.overdue} empty="No tienes tareas vencidas." overdue />
              </Panel>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
              <Panel title="Creadas y asignadas" description="Mis tareas incluyen las de tus listas personales.">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted">
                    <tr className="border-b border-line">
                      <th scope="col" className="pb-2 text-left font-normal">
                        Tareas
                      </th>
                      <th scope="col" className="pb-2 text-right font-normal">
                        Total
                      </th>
                      <th scope="col" className="pb-2 text-right font-normal">
                        Pendientes
                      </th>
                      <th scope="col" className="pb-2 text-right font-normal">
                        Hechas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <Summary label="Mis tareas" counts={dashboard.assigned} />
                    <Summary label="Creadas por mí" counts={dashboard.created} />
                  </tbody>
                </table>
              </Panel>
              <Panel
                title="Mis listas"
                actions={
                  <Link href="/lists" className="text-sm text-accent-text hover:underline">
                    Ver todas →
                  </Link>
                }
              >
                <ul className="flex flex-col">
                  {lists.slice(0, 4).map((list) => (
                    <li key={list.id} className="flex items-center gap-[13px] border-b border-line py-3 last:border-b-0">
                      <span
                        aria-hidden="true"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-panel-2 text-accent-text"
                      >
                        ▤
                      </span>
                      <div className="min-w-0">
                        <Link href={`/lists/${list.id}`} className="block truncate text-sm font-semibold hover:underline">
                          {list.name}
                        </Link>
                        <small className="text-xs text-muted">
                          {LIST_TYPE_LABEL[list.list_type]} · {plural(list.task_count, "tarea")}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </LoadState>
    </>
  );
}
