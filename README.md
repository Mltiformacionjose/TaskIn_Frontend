# TaskIn — Frontend

TaskIn es una aplicación web de gestión de tareas y listas personales y compartidas: permite crear y organizar tareas, compartir listas con otras personas, recibir avisos y ver un resumen del trabajo. Este repositorio contiene el **frontend**, la interfaz de usuario. El backend vive en otro repositorio.

> **Estado real (2026-11-19):** el proyecto se llama TaskIn (antes Nexora) y usa la paleta naranja de Factoría F5 (tema oscuro; el modo claro está por decidir). Desarrollo en marcha, pieza a pieza y con un commit por pieza. Hecho: fundación visual del diseño aprobado, componentes base, capa de servicios hacia la API y las pantallas **inicio de sesión (WF-007), registro (WF-008), recuperar contraseña (WF-009), mis listas (WF-002) y nueva tarea (WF-004)**, dentro del marco con barra lateral. `/lists/[listId]` es una página provisional hasta WF-003. Como el backend aún no tiene endpoints, funcionan en **modo simulado**: los datos viven en el navegador y no se guarda nada en una base de datos. La página `/` sigue siendo un muestrario temporal.

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
- El backend de TaskIn en ejecución.

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

Abre `http://localhost:3000`. Rutas disponibles: `/login`, `/register`, `/forgot-password`, `/lists`, `/lists/[listId]` (provisional), `/lists/[listId]/tasks/new` y `/` (muestrario temporal).

## Comandos de comprobación y build

```powershell
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # compilación de producción
npm run start       # sirve la compilación
npm run smoke:api   # escenarios contra la API real (requiere backend)
```

A 2026-11-19 pasan lint, tipos y build. No hay pruebas automáticas de interfaz todavía (TESTING_FRONTEND, `Nexora-Documentation/10-frontend/TESTING_FRONTEND.md`).

## Estructura del proyecto

```
src/app/(public)/   login, register, forgot-password (sin sesión)
src/app/(private)/  marco con barra lateral; lists/[listId]/tasks/new
src/components/     ui/ (primitivos) y layout/ (barra lateral, encabezado)
src/features/       auth/ y tasks/ (formularios y pantallas); el resto vacías
src/services/       llamadas a la API (una función por ruta)
src/lib/ types/     utilidades, validaciones y tipos de la API
scripts/            api-smoke.mjs
```

## Comunicación con el backend

Todas las llamadas pasan por `src/services/` (JSON, sesión por cookie `HttpOnly`, `credentials: "include"`). **El contrato HTTP está en estado de propuesta** y no hay endpoints implementados: ver el contrato de API del backend (`Nexora-Documentation/11-backend/API_CONTRACT.md`). Si el backend usa otro dominio, tendrá que permitir CORS con credenciales para el origen del frontend (AT-04, Pendiente).

## Documentación

Este repositorio no contiene documentación (petición de la profesora; ADR-0002 v0.2). Toda la documentación del proyecto, incluida la técnica del frontend, está en la carpeta independiente **Nexora-Documentation**: `10-frontend/` (arquitectura, estructura, pruebas y demás) y el resto de carpetas (requisitos, flujos, dominio, diseño, decisiones).
