import type { Metadata } from "next";
import { TrashScreen } from "@/features/trash/trash-screen";

export const metadata: Metadata = { title: "Papelera · TaskIn" };

/** RF-18 y RF-30: listas y tareas eliminadas, que se recuperan durante 30 días. */
export default function TrashPage() {
  return <TrashScreen />;
}
