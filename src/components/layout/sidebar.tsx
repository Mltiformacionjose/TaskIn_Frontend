"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/features/auth/session-provider";
import { useInboxCounts } from "@/features/inbox/inbox-counts";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; glyph: string; counter?: "invitations" | "unread" };

// Navegación del prototipo aprobado (I-25: «Invitaciones» en lugar de «Compartidas»).
// «Invitaciones» cuenta las pendientes recibidas; «Notificaciones», los avisos sin leer.
const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Inicio", glyph: "⌂" },
  { href: "/lists", label: "Mis listas", glyph: "▤" },
  { href: "/stats", label: "Estadísticas", glyph: "▥" },
  { href: "/invitations", label: "Invitaciones", glyph: "✉", counter: "invitations" },
  { href: "/notifications", label: "Notificaciones", glyph: "◉", counter: "unread" },
];

const SETTINGS: NavItem = { href: "/settings", label: "Ajustes", glyph: "⚙" };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const counts = useInboxCounts();
  const count = item.counter === "invitations" ? counts.invitations : item.counter === "unread" ? counts.unread : 0;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-[9px] px-2 py-2 text-sm whitespace-nowrap md:my-[3px] md:gap-[13px] md:px-[13px] md:py-[13px]",
        active ? "bg-accent-tint text-fg" : "text-muted hover:bg-accent-tint hover:text-fg",
      )}
    >
      <span aria-hidden="true" className={cn("w-[18px] text-center", active ? "text-accent-text" : "text-muted")}>
        {item.glyph}
      </span>
      {item.label}
      {count > 0 && (
        <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">({count} sin revisar)</span>
        </span>
      )}
    </Link>
  );
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

/**
 * Barra lateral de las pantallas con sesión. En pantallas estrechas pasa a ser
 * una barra superior desplazable, como en el CSS del prototipo (I-26).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useSession();

  return (
    <aside className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-sidebar px-3 py-2.5 md:min-h-screen md:w-[248px] md:flex-col md:items-stretch md:gap-0 md:overflow-visible md:border-b-0 md:px-4 md:pt-[27px] md:pb-[18px]">
      <p className="mr-2 text-[15px] font-extrabold tracking-[0.04em] md:mx-3 md:text-[22px]">TASKIN</p>
      <p className="mx-3 mt-1.5 mb-8 hidden text-xs tracking-[0.08em] text-muted md:block">ORGANIZACIÓN PERSONAL</p>
      <p className="mx-3 mb-3.5 hidden text-xs font-bold tracking-[0.08em] text-muted md:block">MENÚ PRINCIPAL</p>

      <nav aria-label="Principal" className="flex items-center gap-0.5 md:flex-col md:items-stretch md:gap-0">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="flex items-center md:mt-auto md:block md:border-t md:border-line md:pt-[18px]">
        <nav aria-label="Cuenta">
          <NavLink item={SETTINGS} pathname={pathname} />
        </nav>
        <div className="hidden items-center gap-2.5 px-2.5 pt-3 md:flex">
          <span
            aria-hidden="true"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-chip text-xs font-bold"
          >
            {initials(user.username)}
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-sm">{user.username}</strong>
            <small className="block truncate text-xs text-muted">{user.email}</small>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="ml-1 cursor-pointer rounded-[9px] px-2 py-2 text-sm whitespace-nowrap text-muted hover:text-fg md:mt-2 md:ml-0 md:px-[13px]"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
