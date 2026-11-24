/**
 * URL base de la API real (ADR-0009, prefijo /api/v1).
 *
 * Desde el 2026-11-24 el frontend usa siempre la API real: el modo de datos
 * simulados se retiró al completarse el backend. Para usar las pantallas hay
 * que tener el backend en marcha.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
