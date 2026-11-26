"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, logout as logoutRequest } from "@/services/auth";
import { ApiError } from "@/services/errors";
import type { User } from "@/types/api";

type Session = {
  user: User;
  logout: () => Promise<void>;
  /** Sustituye los datos del usuario tras cambiar el perfil (RF-05). */
  setUser: (user: User) => void;
};

const SessionContext = createContext<Session | null>(null);

/** Usuario de la sesión actual. Solo se usa dentro de las rutas privadas. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession debe usarse dentro de <SessionProvider>.");
  return session;
}

/**
 * Comprueba la sesión al entrar en una ruta privada y, si no hay sesión,
 * lleva a /login. Es solo comodidad de navegación: la autorización real la
 * aplica el backend en cada petición (ADR-0008, Pendiente).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((current) => active && setUser(current))
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) router.replace("/login");
        else setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (failed) {
    return (
      <p role="alert" className="grid min-h-screen place-items-center px-4 text-center text-muted">
        No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo.
      </p>
    );
  }

  if (!user) {
    return (
      <p role="status" className="grid min-h-screen place-items-center text-muted">
        Comprobando sesión…
      </p>
    );
  }

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      // Aunque la petición falle (sesión ya caducada), se sale siempre a /login.
      window.location.replace("/login");
    }
  };

  return <SessionContext.Provider value={{ user, logout, setUser }}>{children}</SessionContext.Provider>;
}
