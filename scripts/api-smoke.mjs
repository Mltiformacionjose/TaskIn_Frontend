// Comprobación de humo contra la API REAL de TaskIn.
//
// Repite contra el backend los escenarios que el modo `mock` ya cumple, para
// verificar que backend y base de datos aplican las mismas reglas:
// registro, inicio de sesión, unicidad, lista por defecto, acceso a listas y
// creación de tareas (modelo de datos v0.6, PROPUESTA).
//
// Uso (PowerShell, desde frontend/), con el backend en marcha:
//   node scripts/api-smoke.mjs
//   $env:API_URL="http://localhost:8000/api/v1"; node scripts/api-smoke.mjs
//
// AVISO: crea usuarios, una lista y una tarea en la base de datos a la que
// apunte el backend. Úsalo solo con una base de datos de desarrollo.
// Las rutas, cuerpos y códigos son los del contrato de API en estado de
// PROPUESTA: si el contrato cambia, hay que ajustar este script.

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
// El backend exige Origin = FRONTEND_ORIGIN en POST, PATCH y DELETE (CSRF, AT-04).
// El navegador lo envía solo; aquí hay que ponerlo a mano.
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const run = Date.now().toString(36);
const password = "smoke-password-1234";

let cookie = "";
let failures = 0;

async function call(method, path, body) {
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
  return { status: response.status, data };
}

async function check(label, expected, action) {
  const { status, data } = await action();
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  if (!ok) failures++;
  const detail = data?.error?.message ?? "";
  console.log(`${ok ? "ok  " : "FAIL"} ${label} → ${status} (esperado ${expected}) ${detail}`);
  return data;
}

console.log(`API: ${API_URL}\n`);

try {
  await check("Sin sesión, GET /me responde 401", 401, () => call("GET", "/me"));

  const owner = await check("Registro de usuario nuevo", 201, () =>
    call("POST", "/auth/register", { username: `smoke_${run}`, email: `smoke_${run}@example.com`, password }),
  );
  const other = await check("Registro de un segundo usuario", 201, () =>
    call("POST", "/auth/register", { username: `smoke2_${run}`, email: `smoke2_${run}@example.com`, password }),
  );
  await check("Correo duplicado (otras mayúsculas) responde 409", 409, () =>
    call("POST", "/auth/register", { username: `x_${run}`, email: `SMOKE_${run}@example.com`, password }),
  );
  await check("Usuario duplicado (otras mayúsculas) responde 409", 409, () =>
    call("POST", "/auth/register", { username: `SMOKE_${run}`, email: `y_${run}@example.com`, password }),
  );
  await check("Contraseña corta responde 422", [400, 422], () =>
    call("POST", "/auth/register", { username: `z_${run}`, email: `z_${run}@example.com`, password: "corta" }),
  );

  await check("Login con contraseña incorrecta responde 401", 401, () =>
    call("POST", "/auth/login", { email: `smoke_${run}@example.com`, password: "incorrecta-123" }),
  );
  await check("Login correcto", 200, () =>
    call("POST", "/auth/login", { email: `smoke_${run}@example.com`, password }),
  );
  await check("Con sesión, GET /me responde 200", 200, () => call("GET", "/me"));

  // Modelo v0.6 (P-26): el registro crea la lista personal por defecto «Mis tareas».
  const lists = await check("GET /lists responde 200", 200, () => call("GET", "/lists"));
  const defaults = Array.isArray(lists) ? lists.filter((l) => l.is_default) : [];
  const defaultOk = defaults.length === 1 && defaults[0].list_type === "personal";
  if (!defaultOk) failures++;
  console.log(`${defaultOk ? "ok  " : "FAIL"} El usuario nuevo tiene una única lista por defecto, personal`);
  // WF-002 (PROPUESTA de contrato v0.3): cada lista trae su resumen numérico.
  const summaryOk =
    Array.isArray(lists) &&
    lists.every((l) => ["task_count", "done_count", "member_count"].every((k) => Number.isInteger(l[k])));
  if (!summaryOk) failures++;
  console.log(`${summaryOk ? "ok  " : "FAIL"} GET /lists incluye task_count, done_count y member_count`);
  if (defaults[0]?.id) {
    await check("Tarea suelta en la lista por defecto", 201, () =>
      call("POST", `/lists/${defaults[0].id}/tasks`, { title: "Suelta", description: null, due_date: null, assignee_ids: [] }),
    );
    await check("La lista por defecto no se puede eliminar", 409, () => call("DELETE", `/lists/${defaults[0].id}`));
  }

  const list = await check("Crear lista compartida", 201, () =>
    call("POST", "/lists", { name: `Smoke ${run}`, description: null, list_type: "shared" }),
  );
  const personal = await check("Crear lista personal", 201, () =>
    call("POST", "/lists", { name: `Personal ${run}`, description: null, list_type: "personal" }),
  );

  if (list?.id) {
    await check("Título vacío responde 422", [400, 422], () =>
      call("POST", `/lists/${list.id}/tasks`, { title: "  ", description: null, due_date: null, assignee_ids: [] }),
    );
    await check("Responsable que no es miembro responde 422", [400, 422], () =>
      call("POST", `/lists/${list.id}/tasks`, {
        title: "No miembro",
        description: null,
        due_date: null,
        assignee_ids: [other?.id ?? -1],
      }),
    );
    const task = await check("Crear tarea con responsable miembro", 201, () =>
      call("POST", `/lists/${list.id}/tasks`, {
        title: "Tarea de humo",
        description: "Creada por api-smoke",
        due_date: "2030-01-15",
        assignee_ids: [owner?.id ?? -1],
      }),
    );
    if (task) {
      const ok = task.status === "todo" && task.completed_at === null;
      if (!ok) failures++;
      console.log(`${ok ? "ok  " : "FAIL"} La tarea nueva empieza en «todo» sin fecha de finalización`);
    }
  }

  if (personal?.id) {
    await check("Responsables en lista personal responde 422", [400, 422], () =>
      call("POST", `/lists/${personal.id}/tasks`, {
        title: "Con responsable",
        description: null,
        due_date: null,
        assignee_ids: [owner?.id ?? -1],
      }),
    );
  }

  // El segundo usuario no es miembro: no debe ver la lista (404 propuesto, no 403).
  await check("Login del segundo usuario", 200, () =>
    call("POST", "/auth/login", { email: `smoke2_${run}@example.com`, password }),
  );
  if (list?.id) await check("Lista ajena no es accesible", [403, 404], () => call("GET", `/lists/${list.id}`));

  await check("Cerrar sesión responde 204", 204, () => call("POST", "/auth/logout"));
  await check("Tras cerrar sesión, GET /me responde 401", 401, () => call("GET", "/me"));
} catch (error) {
  failures++;
  console.log(`FAIL No se pudo conectar con ${API_URL}: ${error.message}`);
}

console.log(failures ? `\n${failures} comprobación(es) fallida(s).` : "\nTodas las comprobaciones han pasado.");
process.exit(failures ? 1 : 0);
