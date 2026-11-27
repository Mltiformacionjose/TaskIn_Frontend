/**
 * Tema de la interfaz (mejora 12, P-28): «system» sigue al sistema operativo.
 * La preferencia vive en localStorage de este navegador (no es un dato de la
 * cuenta: no cambia el modelo de datos).
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "taskin-theme";

/**
 * Script en línea de <head> (app/layout.tsx): fija data-theme en <html> antes
 * de pintar, para que no parpadee. Con «system» también sigue los cambios del
 * sistema mientras la página está abierta. Debe ser autocontenido.
 */
export const THEME_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}",d=document.documentElement,m=matchMedia("(prefers-color-scheme: light)");function a(){var p=localStorage.getItem(k);d.setAttribute("data-theme",p==="light"||p==="dark"?p:m.matches?"light":"dark")}a();m.addEventListener("change",a)}catch(e){}})()`;

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Guarda la preferencia y la aplica en el acto (sin recargar). */
export function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Sin localStorage (modo privado estricto): se aplica solo a esta página.
  }
  const resolved =
    preference === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : preference;
  document.documentElement.setAttribute("data-theme", resolved);
}
