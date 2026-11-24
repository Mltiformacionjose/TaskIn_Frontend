# TaskIn — Frontend

TaskIn es una aplicación web de gestión de tareas y listas personales y compartidas: permite crear y organizar tareas, compartir listas con otras personas, recibir avisos y ver un resumen del trabajo. Este repositorio contiene el **frontend**, la interfaz de usuario. El backend vive en otro repositorio.

> **Estado real (2026-11-24):** el frontend está **conectado a la API real** y cubre todas las pantallas imprescindibles del MVP: inicio de sesión, registro y recuperación de contraseña (WF-007 a WF-009, más `/reset-password`), dashboard (WF-001), mis listas (WF-002), detalle de lista (WF-003), crear y editar tarea (WF-004), participantes (WF-005), notificaciones (WF-006), ajustes (WF-010) e invitaciones recibidas (WF-013). Deseables hechos: vistas Lista, Calendario y Kanban (WF-011, WF-012) en el detalle de lista y en el panel «Mis tareas» del dashboard, y filtro por responsable. Pruebas de extremo a extremo con Playwright: 37 en verde.

## Probar las pantallas

El frontend usa siempre la **API real** (el modo simulado se retiró el 2026-11-24, al completarse el backend).

1. Arranca el backend de TaskIn en `http://localhost:8000` (ver su README).
2. `npm run dev` y abre `http://localhost:3000/register` para crear una cuenta, o `/login`.
3. Usa siempre `localhost` (no `127.0.0.1`): CORS y la cookie de sesión dependen del origen.

## Responsabilidad del frontend

Mostrar la interfaz, recoger acciones del usuario y comunicarse con la API del backend. **No accede a PostgreSQL**, no aplica reglas de negocio ni sustituye la autorización del backend. Ver ARCHITECTURE_FRONTEND (`Nexora-Documentation/10-frontend/ARCHITECTURE_FRONTEND.md`).

## Tecnologías

Next.js 16.4.6 (App Router), React 19.3.0, TypeScript 5 (estricto), Tailwind CSS 4.3.3, ESLint 9.

> **Importante:** esta versión de Next.js tiene cambios incompatibles con versiones anteriores. Consulta la documentación incluida en `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).

## Requisitos previos

- Node.js con npm (el proyecto se ha usado con Node 24; la versión mínima no está documentada).
- El backend de TaskIn en ejecución (también para las pruebas E2E, que lo arrancan solas desde la carpeta hermana `Nexora_Backend`).

## Instalación (PowerShell, desde esta carpeta)

```powershell
npm ci
```

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta el valor. `.env.local` está ignorado por Git.

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base de la API del backend (ejemplo: `http://localhost:8000/api/v1`). Es **pública**: no pongas secretos. |

## Ejecución local

```powershell
npm run dev
```

Abre `http://localhost:3000`. Rutas: `/` (dashboard), `/lists`, `/lists/[listId]`, `/lists/[listId]/tasks/new`, `/lists/[listId]/tasks/[taskId]`, `/lists/[listId]/participants`, `/invitations`, `/notifications`, `/settings`; sin sesión, `/login`, `/register`, `/forgot-password` y `/reset-password?token=…`.

## Comandos de comprobación y build

```powershell
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # compilación de producción
npm run start       # sirve la compilación
npm run smoke:api   # escenarios contra la API real (requiere backend)
npm run test:e2e    # pruebas de extremo a extremo con Playwright
```

A 2026-11-24 pasan lint, tipos, build y las 37 pruebas E2E.

### Pruebas de extremo a extremo (Playwright)

`npm run test:e2e` levanta **su propio** backend (puerto 8100, desde `../Nexora_Backend`, o `BACKEND_DIR`) y el frontend compilado (puerto 3100), así que no chocan con los servidores de desarrollo. Usan una base propia, **`taskin_e2e`** (la URL del `.env` del backend con ese nombre de base, o `E2E_DATABASE_URL`), a la que aplican las migraciones antes de arrancar; así `taskin_dev` queda limpia. Hay que crearla una vez (ver TESTING_FRONTEND). Cada prueba crea usuarios con nombre único. La primera vez hay que instalar el navegador: `npx playwright install chromium`.

## Estructura del proyecto

```
src/app/(public)/   login, register, forgot-password, reset-password (sin sesión)
src/app/(private)/  marco con barra lateral: dashboard, lists, invitations, notifications, settings
src/components/     ui/ (primitivos) y layout/ (barra lateral, encabezado)
src/features/       una carpeta por módulo: auth, dashboard, lists, tasks, invitations, notifications, settings, inbox
src/services/       llamadas a la API (una función por ruta)
src/lib/ types/     utilidades (fechas, validaciones) y tipos de la API
src/hooks/          useLoad (carga de datos con reintento)
scripts/            api-smoke.mjs
e2e/                pruebas Playwright y sus utilidades (helpers.ts)
```

## Comunicación con el backend

Todas las llamadas pasan por `src/services/` (JSON, sesión por cookie `HttpOnly`, `credentials: "include"`). Hay una función por ruta del contrato (`Nexora-Documentation/11-backend/API_CONTRACT.md`, 28 rutas); los tipos de `src/types/api.ts` copian sus respuestas. El backend solo acepta peticiones que cambian datos desde `FRONTEND_ORIGIN` (CORS y CSRF, AT-04): usa `localhost`, no `127.0.0.1`.

## Documentación

Este repositorio no contiene documentación (petición de la profesora; ADR-0002 v0.2). Toda la documentación del proyecto, incluida la técnica del frontend, está en la carpeta independiente **Nexora-Documentation**: `10-frontend/` (arquitectura, estructura, pruebas y demás) y el resto de carpetas (requisitos, flujos, dominio, diseño, decisiones).
