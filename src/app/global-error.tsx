"use client"; // Los límites de error son componentes de cliente.

import "./globals.css";

/**
 * Último recurso: un fallo en el propio marco raíz. Sustituye al layout raíz,
 * así que define su propio <html> y <body> e importa los estilos.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="grid min-h-screen place-items-center bg-canvas px-4">
        <title>Algo ha fallado · TaskIn</title>
        <div className="w-full max-w-[440px] rounded-[17px] border border-line bg-panel p-[38px]">
          <p className="mb-[35px] text-2xl font-extrabold tracking-[0.04em]">TASKIN</p>
          <h1 className="mb-[9px] text-[25px] font-bold">Algo ha fallado</h1>
          <p className="mb-[26px] text-sm leading-normal text-muted">
            TaskIn no ha podido cargarse. Inténtalo de nuevo; tus datos no se han perdido.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="w-full cursor-pointer rounded-[9px] bg-accent-strong px-[17px] py-3 text-xs font-bold text-on-accent hover:bg-accent-strong-hover"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
