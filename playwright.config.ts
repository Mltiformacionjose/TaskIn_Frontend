import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo (AT-08: Playwright, 2026-11-24).
 *
 * Levantan su propio entorno para no chocar con los servidores de desarrollo:
 * - backend en E2E_API_PORT (8100), desde BACKEND_DIR (por defecto la carpeta
 *   hermana del backend), con FRONTEND_ORIGIN apuntando al frontend de pruebas;
 * - frontend compilado (`next build` + `next start`) en E2E_WEB_PORT (3100).
 * Cada ejecución arranca un backend nuevo, así el límite de intentos empieza
 * a cero.
 *
 * Base de datos: la del `.env` del backend (taskin_dev) salvo que se indique
 * E2E_DATABASE_URL. Cada prueba crea usuarios con nombre único.
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8100);
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}/api/v1`;
const BACKEND_DIR = path.resolve(process.env.BACKEND_DIR ?? path.join(__dirname, "..", "Nexora_Backend"));
const PYTHON = path.join(BACKEND_DIR, ".venv", process.platform === "win32" ? "Scripts" : "bin", "python");

process.env.E2E_API_URL = API_URL;
process.env.E2E_WEB_URL = WEB_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : 3,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: WEB_URL,
    locale: "es-ES",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `"${PYTHON}" -m uvicorn app.main:app --port ${API_PORT}`,
      cwd: BACKEND_DIR,
      url: `http://localhost:${API_PORT}/docs`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        FRONTEND_ORIGIN: WEB_URL,
        ...(process.env.E2E_DATABASE_URL ? { DATABASE_URL: process.env.E2E_DATABASE_URL } : {}),
      },
    },
    {
      command: `npm run build && npm run start -- --port ${WEB_PORT}`,
      url: WEB_URL + "/login",
      reuseExistingServer: false,
      timeout: 240_000,
      env: { NEXT_PUBLIC_API_URL: API_URL },
    },
  ],
});
