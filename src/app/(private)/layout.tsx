import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/features/auth/session-provider";
import { InboxCountsProvider } from "@/features/inbox/inbox-counts";

/** Marco de las pantallas con sesión: barra lateral y área principal. */
export default function PrivateLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <InboxCountsProvider>
        <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:pt-10 md:pb-[26px]">
            {children}
            <p className="mt-7 text-xs text-muted">TaskIn · El uso de la aplicación está sujeto a sus términos de uso.</p>
          </main>
        </div>
      </InboxCountsProvider>
    </SessionProvider>
  );
}
