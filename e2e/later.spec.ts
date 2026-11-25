import { expect, test, type Page } from "@playwright/test";
import { api, createList, day, defaultListId, PASSWORD, signIn, unique } from "./helpers";

// Requisitos posteriores (propuesta de modelo v0.8): papelera de tareas y
// listas (RF-18, RF-30), fecha límite obligatoria por lista (RF-28),
// antelación configurable (RF-27), eliminar la cuenta (RF-07) y evolución en
// las estadísticas (RF-40).

type Task = { id: number; title: string };

async function newTask(page: Page, listId: number, title: string, dueDate: string | null = null): Promise<Task> {
  return api(page).post<Task>(`/lists/${listId}/tasks`, { title, description: null, due_date: dueDate, assignee_ids: [] });
}

function panel(page: Page, heading: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) });
}

test("papelera: una tarea y una lista eliminadas se recuperan", async ({ page }) => {
  await signIn(page, "trash");
  const list = await createList(page, unique("Club"));
  const task = await newTask(page, list.id, "Informe");

  await page.goto(`/lists/${list.id}/tasks/${task.id}`);
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await expect(page.getByRole("dialog")).toContainText("irá a la papelera");
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar tarea" }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Papelera" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Papelera" })).toBeVisible();
  const tasks = panel(page, "Tareas");
  await expect(tasks.getByRole("listitem")).toContainText("Eliminada por ti");
  await tasks.getByRole("button", { name: "Recuperar la tarea Informe" }).click();
  await expect(page.getByText("Tarea «Informe» recuperada.")).toBeVisible();
  await expect(tasks.getByText("No hay tareas en la papelera.")).toBeVisible();

  await page.goto(`/lists/${list.id}`);
  await expect(page.getByRole("link", { name: "Informe" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Eliminar lista" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar lista" }).click();
  await expect(page).toHaveURL(/\/lists$/);

  await page.goto("/trash");
  const lists = panel(page, "Listas");
  await expect(lists.getByRole("listitem")).toContainText("1 tarea");
  await lists.getByRole("button", { name: `Recuperar la lista ${list.name}` }).click();
  await page.getByRole("link", { name: "Abrir la lista" }).click();
  await expect(page.getByRole("heading", { level: 1, name: list.name })).toBeVisible();
  const activity = panel(page, "Actividad reciente");
  await expect(activity.getByRole("listitem").first()).toContainText("recuperó la lista de la papelera");
});

test("una lista que exige fecha límite no deja crear tareas sin fecha", async ({ page }) => {
  await signIn(page, "strict");
  const name = unique("Entregas");
  await page.goto("/lists");
  await page.getByRole("button", { name: "＋ Nueva lista" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre *").fill(name);
  await dialog.getByLabel("Exigir fecha límite").check();
  await dialog.getByRole("button", { name: "Crear lista" }).click();

  await page.getByRole("link", { name }).first().click();
  await expect(page.getByText("Fecha límite obligatoria en cada tarea")).toBeVisible();
  await page.getByRole("link", { name: "＋ Nueva tarea" }).click();
  await page.getByLabel("Título *").fill("Memoria");
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Esta lista exige fecha límite en cada tarea." })).toBeVisible();

  await page.getByLabel("Fecha de vencimiento *").fill(day(3));
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea «Memoria» creada.")).toBeVisible();
});

test("la antelación de «próximas a vencer» se cambia en Ajustes", async ({ page }) => {
  await signIn(page, "soon");
  await newTask(page, await defaultListId(page), "Dentro de cinco días", day(5));

  await page.goto("/");
  const upcoming = panel(page, "Próximas tareas");
  await expect(upcoming).toContainText("en los próximos 2 días");
  await expect(upcoming.getByText("Dentro de cinco días")).toHaveCount(0);

  await page.goto("/settings");
  await page.getByLabel("Antelación de «próximas a vencer»").selectOption("7");
  await expect(page.getByText("Antelación guardada.")).toBeVisible();

  await page.goto("/");
  await expect(upcoming).toContainText("en los próximos 7 días");
  await expect(upcoming.getByText("Dentro de cinco días")).toBeVisible();
});

test("eliminar la cuenta: primero hay que dejar las listas compartidas", async ({ page }) => {
  const me = await signIn(page, "bye");
  const list = await createList(page, unique("Club"));

  await page.goto("/settings");
  const danger = panel(page, "Eliminar la cuenta");
  await danger.getByLabel("Contraseña actual").fill(PASSWORD);
  await danger.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(danger.getByRole("alert")).toContainText(`«${list.name}»`);

  await api(page).delete(`/lists/${list.id}`);
  // React vacía el formulario tras cada envío: se vuelve a escribir la contraseña.
  await danger.getByLabel("Contraseña actual").fill(PASSWORD);
  await danger.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/account-deleted$/);
  await expect(page.getByRole("heading", { name: "Cuenta eliminada" })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(me.email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
});

test("estadísticas: pendientes, actividad y quién hace más", async ({ page }) => {
  await signIn(page, "evol");
  const list = await createList(page, unique("Club"));
  const done = await newTask(page, list.id, "Hecha");
  await newTask(page, list.id, "Pendiente");
  await api(page).patch(`/tasks/${done.id}`, { status: "done" });

  await page.goto("/stats");
  await expect(page.getByRole("table", { name: "Tareas pendientes y acciones por semana" })).toBeAttached();
  const people = panel(page, "Quién hace más");
  await expect(people.getByRole("listitem")).toHaveCount(1);
  await expect(people.getByRole("listitem")).toContainText("(tú)");
  await expect(people.getByRole("listitem")).toContainText("3 acciones · 1 completada");
});
