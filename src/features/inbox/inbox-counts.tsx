"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getReceivedInvitations } from "@/services/invitations";
import { getNotifications } from "@/services/notifications";

type InboxCounts = {
  /** Invitaciones pendientes recibidas. */
  invitations: number;
  /** Avisos sin leer. */
  unread: number;
  refresh: () => void;
};

const InboxContext = createContext<InboxCounts>({ invitations: 0, unread: 0, refresh: () => {} });

/** Contadores de la barra lateral («Invitaciones» y «Notificaciones»). */
export function useInboxCounts(): InboxCounts {
  return useContext(InboxContext);
}

/**
 * Pide los contadores al entrar y en cada cambio de pantalla. Si la petición
 * falla, los contadores se quedan como estaban: son una ayuda, no un dato
 * crítico.
 */
export function InboxCountsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ invitations: 0, unread: 0 });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getReceivedInvitations(), getNotifications()])
      .then(([invitations, notifications]) => {
        if (active) setCounts({ invitations: invitations.length, unread: notifications.filter((n) => !n.read_at).length });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return <InboxContext.Provider value={{ ...counts, refresh }}>{children}</InboxContext.Provider>;
}
