import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/features/auth/session-provider";
import { VerifyEmailBanner } from "@/features/auth/verify-email-banner";
import { InboxCountsProvider } from "@/features/inbox/inbox-counts";
import { KeyboardShortcuts } from "@/features/shortcuts/keyboard-shortcuts";

/** Marco de las pantallas con sesión: barra lateral, área principal y avisos flotantes. */
export default function PrivateLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <InboxCountsProvider>
        <ToastProvider>
          <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
            <Sidebar />
            <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:pt-10 md:pb-[26px]">
              <VerifyEmailBanner />
              {children}
              <p className="mt-7 text-xs text-muted">
                TaskIn · El uso de la aplicación está sujeto a sus términos de uso. · Pulsa{" "}
                <kbd className="rounded border border-line px-1 font-semibold">?</kbd> para ver los atajos de teclado.
              </p>
            </main>
          </div>
          <KeyboardShortcuts />
        </ToastProvider>
      </InboxCountsProvider>
    </SessionProvider>
  );
}
