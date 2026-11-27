import type { MetadataRoute } from "next";

/**
 * Mejora 13: TaskIn se puede instalar como aplicación (escritorio y móvil).
 * Se abre en su propia ventana, sin barra del navegador. No hay service worker:
 * la aplicación necesita la API para todo, así que no funciona sin conexión.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaskIn",
    short_name: "TaskIn",
    description: "Gestiona tus tareas y listas personales y compartidas.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#141110",
    theme_color: "#141110",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mis listas", url: "/lists" },
      { name: "Notificaciones", url: "/notifications" },
    ],
  };
}
