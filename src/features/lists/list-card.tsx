import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pill } from "@/components/ui/pill";
import type { ListSummary } from "@/types/api";
import { LIST_TYPE_LABEL, listDescription, plural, progress } from "./list-summary";

function ListIcon() {
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] bg-panel-2 text-lg text-accent-text"
    >
      ▤
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  // Decorativa: el mismo dato se lee en el texto de recuentos.
  return (
    <div aria-hidden="true" className="h-[5px] overflow-hidden rounded-[9px] bg-chip">
      <span className="block h-full rounded-[9px] bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

function Counts({ list }: { list: ListSummary }) {
  const pending = list.task_count - list.done_count;
  return (
    <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
      <span>{plural(list.task_count, "tarea")}</span>
      <span>{plural(list.done_count, "completada")}</span>
      <span>{plural(pending, "pendiente")}</span>
    </p>
  );
}

function Tags({ list }: { list: ListSummary }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge>{LIST_TYPE_LABEL[list.list_type]}</Badge>
      {list.is_default && <Pill className="py-1">Por defecto</Pill>}
    </span>
  );
}

/**
 * Tarjeta de WF-002 (vista Cuadrícula). Toda la tarjeta abre el detalle: el
 * enlace está en el título y se extiende a la tarjeta con un pseudoelemento,
 * así el lector de pantalla anuncia solo el nombre de la lista.
 */
export function ListCard({ list }: { list: ListSummary }) {
  return (
    <article className="relative flex min-h-[210px] flex-col rounded-xl border border-line bg-panel p-5 transition-colors hover:border-accent-border">
      <ListIcon />
      <h3 className="mt-4 mb-2.5 text-[15px] font-bold">
        <Link href={`/lists/${list.id}`} className="after:absolute after:inset-0 after:rounded-xl">
          {list.name}
        </Link>
      </h3>
      <Tags list={list} />
      <p className="mt-3 mb-3.5 text-sm leading-normal text-fg">{listDescription(list)}</p>
      <div className="mt-auto flex flex-col gap-2">
        <ProgressBar value={progress(list)} />
        <Counts list={list} />
        {list.list_type === "shared" && (
          <p className="text-xs text-muted">{plural(list.member_count, "participante")}</p>
        )}
      </div>
    </article>
  );
}

/** Fila de WF-002 (vista Lista): la misma información, en una línea. */
export function ListRow({ list }: { list: ListSummary }) {
  return (
    <li className="relative grid items-center gap-x-4 gap-y-2 border-b border-line px-2 py-4 transition-colors hover:bg-panel-2 md:grid-cols-[minmax(200px,1.6fr)_minmax(150px,0.8fr)_minmax(220px,1.2fr)]">
      <div className="flex min-w-0 items-center gap-[13px]">
        <ListIcon />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">
            <Link href={`/lists/${list.id}`} className="after:absolute after:inset-0">
              {list.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-muted">{listDescription(list)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tags list={list} />
        {list.list_type === "shared" && (
          <span className="text-xs text-muted">{plural(list.member_count, "participante")}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <ProgressBar value={progress(list)} />
        <Counts list={list} />
      </div>
    </li>
  );
}
