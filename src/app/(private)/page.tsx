import type { Metadata } from "next";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "Inicio · TaskIn" };

/** WF-001 Dashboard. */
export default function HomePage() {
  return <DashboardScreen />;
}
