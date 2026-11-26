// Datos de demostración para enseñar TaskIn (mejora 6, 2026-11-26).
//
// Crea tres personas, listas personales y compartidas, tareas con fechas
// repartidas (vencidas, próximas, sin fecha), responsables, cambios de estado
// hechos por distintas personas, avisos, una invitación pendiente y una tarea
// en la papelera. Todo pasa por la API, así que cumple las mismas reglas que
// la aplicación (no toca la base de datos directamente).
//
// Uso (PowerShell, desde esta carpeta), con el backend en marcha:
//   npm run demo:seed
//   $env:DEMO_SUFFIX="2"; npm run demo:seed      # otro juego de cuentas
//   $env:API_URL="http://localhost:8000/api/v1"; npm run demo:seed
//
// AVISO: úsalo solo con una base de desarrollo o de demostración, nunca con
// datos reales. Las cuentas usan una contraseña conocida (abajo).

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
// El backend exige Origin = FRONTEND_ORIGIN en POST, PATCH y DELETE (CSRF, AT-04).
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const SUFFIX = process.env.DEMO_SUFFIX ?? "";
const PASSWORD = "demo-taskin-2026";

/** Una sesión por persona: cada una guarda su cookie. */
function session() {
  let cookie = "";
  return async function call(method, path, body) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.getSetCookie?.() ?? [];
    if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`${method} ${path} → ${response.status} ${data?.error?.message ?? ""}`);
      error.status = response.status;
      error.code = data?.error?.code;
      throw error;
    }
    return data;
  };
}

/** Fecha AAAA-MM-DD a `days` días de hoy (hora local). */
function day(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function person(name) {
  const call = session();
  const username = `${name}${SUFFIX}`;
  const email = `${username}@example.com`;
  try {
    await call("POST", "/auth/register", { username, email, password: PASSWORD });
  } catch (error) {
    if (error.status === 409) {
      throw new Error(
        `La cuenta «${username}» ya existe. Usa otra base o un sufijo: $env:DEMO_SUFFIX="2"; npm run demo:seed`,
      );
    }
    throw error;
  }
  await call("POST", "/auth/login", { email, password: PASSWORD });
  const me = await call("GET", "/me");
  return { call, id: me.id, username, email };
}

async function main() {
  console.log(`API: ${API_URL}\n`);
  const ana = await person("ana");
  const bruno = await person("bruno");
  const carla = await person("carla");

  const newList = (who, name, description, list_type, due_date_required = false) =>
    who.call("POST", "/lists", { name, description, list_type, due_date_required });
  const newTask = (who, listId, title, due_date, assignee_ids = [], description = null) =>
    who.call("POST", `/lists/${listId}/tasks`, { title, description, due_date, assignee_ids });
  const status = (who, task, value) => who.call("PATCH", `/tasks/${task.id}`, { status: value });
  const invite = async (owner, list, guest) => {
    const invitation = await owner.call("POST", `/lists/${list.id}/invitations`, { identifier: guest.username });
    await guest.call("POST", `/invitations/${invitation.id}/accept`);
  };

  // Ana: lista compartida principal, con Bruno y Carla.
  const tfg = await newList(ana, "Trabajo de fin de grado", "Memoria, prototipo y defensa", "shared");
  await invite(ana, tfg, bruno);
  await invite(ana, tfg, carla);
  const memoria = await newTask(ana, tfg.id, "Redactar la memoria", day(2), [ana.id], "Capítulos 1 a 4 y conclusiones.");
  const proto = await newTask(ana, tfg.id, "Prototipo navegable", day(-3), [bruno.id]);
  await newTask(ana, tfg.id, "Revisar la bibliografía", day(-1), [carla.id]);
  const defensa = await newTask(bruno, tfg.id, "Ensayar la defensa", day(9), [ana.id, bruno.id, carla.id]);
  await newTask(carla, tfg.id, "Diapositivas de la presentación", day(6), [carla.id]);
  await newTask(bruno, tfg.id, "Pruebas de usabilidad", day(4), [bruno.id, carla.id]);
  await newTask(ana, tfg.id, "Ideas para el trabajo futuro", null);
  await status(ana, memoria, "in_progress");
  await status(bruno, proto, "done");
  await status(carla, defensa, "in_progress");
  await ana.call("PATCH", `/tasks/${memoria.id}`, { title: "Redactar la memoria final" });
  const borrador = await newTask(carla, tfg.id, "Borrador antiguo del índice", null);
  await carla.call("DELETE", `/tasks/${borrador.id}`); // queda en la papelera

  // Ana: listas personales; una exige fecha límite (RF-28).
  const casa = await newList(ana, "Casa", "Recados y pagos", "personal");
  const compra = await newTask(ana, casa.id, "Hacer la compra", day(0));
  await newTask(ana, casa.id, "Pagar la matrícula", day(5));
  await newTask(ana, casa.id, "Renovar el abono de transporte", day(-2));
  await status(ana, compra, "done");
  const entregas = await newList(ana, "Entregas de la asignatura", "Cada práctica con su fecha", "personal", true);
  await newTask(ana, entregas.id, "Práctica 3", day(3));
  await newTask(ana, entregas.id, "Práctica 4", day(10));

  // Bruno: su propia lista compartida con Ana; Carla tiene la invitación pendiente.
  const viaje = await newList(bruno, "Viaje de fin de curso", "Organización entre todos", "shared");
  await invite(bruno, viaje, ana);
  await bruno.call("POST", `/lists/${viaje.id}/invitations`, { identifier: carla.username });
  const reservas = await newTask(bruno, viaje.id, "Reservar alojamiento", day(1), [bruno.id]);
  await newTask(bruno, viaje.id, "Comprar los billetes", day(7), [ana.id]);
  await status(bruno, reservas, "in_progress");

  // Antelación de «próximas» de Ana: una semana (RF-27).
  await ana.call("PATCH", "/me/settings", { due_soon_days: 7 });

  console.log("Datos de demostración creados. Cuentas (contraseña para todas: " + PASSWORD + "):");
  for (const p of [ana, bruno, carla]) console.log(`  ${p.username.padEnd(10)} ${p.email}`);
  console.log("\nEntra con ana: tiene listas propias y compartidas, avisos, tareas vencidas y próximas.");
}

main().catch((error) => {
  console.error(`\nNo se pudieron crear los datos: ${error.message}`);
  process.exit(1);
});
