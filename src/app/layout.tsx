import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskIn",
  description: "Gestiona tus tareas y listas personales y compartidas.",
  // Instalada en iOS (mejora 13): nombre bajo el icono y barra de estado oscura.
  appleWebApp: { title: "TaskIn", statusBarStyle: "black-translucent" },
};

/** Color de la barra del navegador y de la ventana instalada, según el tema del sistema. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0eb" },
    { media: "(prefers-color-scheme: dark)", color: "#141110" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme lo corrige el script antes de pintar (modo claro u oscuro, mejora 12);
    // suppressHydrationWarning acepta ese cambio al hidratar, como indica la guía de Next.js.
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
