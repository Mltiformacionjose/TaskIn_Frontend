import type { Metadata } from "next";
import { Suspense } from "react";
import { EditTaskScreen } from "@/features/tasks/edit-task-screen";

export const metadata: Metadata = { title: "Editar tarea · TaskIn" };

/** WF-004 Editar tarea. */
export default function EditTaskPage({ params }: PageProps<"/lists/[listId]/tasks/[taskId]">) {
  // Con Cache Components los parámetros son datos de la petición: se leen dentro de Suspense.
  return (
    <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
      <EditTask params={params} />
    </Suspense>
  );
}

/** Un identificador no numérico se trata como inexistente (id 0). */
const toId = (value: string) => (/^\d+$/.test(value) ? Number(value) : 0);

async function EditTask({ params }: Pick<PageProps<"/lists/[listId]/tasks/[taskId]">, "params">) {
  const { listId, taskId } = await params;
  return <EditTaskScreen listId={toId(listId)} taskId={toId(taskId)} />;
}
