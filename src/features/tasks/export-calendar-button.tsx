"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildCalendar, downloadCalendar, exportableTasks, type CalendarTask } from "@/lib/ics";
import { errorMessage } from "@/services/errors";

type ExportCalendarButtonProps = {
  /** Nombre del calendario al importarlo, p. ej. «TaskIn · Mis tareas». */
  calendarName: string;
  filename: string;
  /** Pide las tareas en el momento de exportar, para llevar siempre lo último. */
  loadTasks: () => Promise<CalendarTask[]>;
};

/**
 * Mejora 10: descarga un .ics con las fechas límite de las tareas pendientes,
 * para importarlo en Google Calendar, Outlook o Calendario de Apple.
 */
export function ExportCalendarButton({ calendarName, filename, loadTasks }: ExportCalendarButtonProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const exportNow = async () => {
    setPending(true);
    try {
      const tasks = await loadTasks();
      const count = exportableTasks(tasks).length;
      if (count === 0) {
        toast.show({ message: "No hay tareas pendientes con fecha límite para exportar." });
        return;
      }
      downloadCalendar(filename, buildCalendar(calendarName, tasks, window.location.origin));
      toast.show({
        message: `${count === 1 ? "1 tarea exportada" : `${count} tareas exportadas`} a «${filename}». Ábrelo con tu calendario para importarlas.`,
      });
    } catch (error) {
      toast.show({ message: errorMessage(error) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="secondary" onClick={exportNow} disabled={pending} title="Descarga las fechas límite en un archivo .ics">
      <span aria-hidden="true">▦</span> {pending ? "Exportando…" : "Exportar a calendario"}
    </Button>
  );
}
