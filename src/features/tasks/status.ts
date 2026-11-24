import type { PillTone } from "@/components/ui/pill";
import type { TaskStatus } from "@/types/api";

/** Texto y color de cada estado. El texto siempre acompaña al color. */
export const TASK_STATUS: Record<TaskStatus, { label: string; tone: PillTone }> = {
  todo: { label: "Por hacer", tone: "info" },
  in_progress: { label: "En progreso", tone: "progress" },
  done: { label: "Hecha", tone: "success" },
};

/** Orden en que se ofrecen los estados en filtros y selectores. */
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];
