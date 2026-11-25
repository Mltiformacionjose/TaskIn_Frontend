import type { Metadata } from "next";
import { StatsScreen } from "@/features/stats/stats-screen";

export const metadata: Metadata = { title: "Estadísticas · TaskIn" };

/** RF-39: estadísticas con periodo, lista y cumplimiento. */
export default function StatsPage() {
  return <StatsScreen />;
}
