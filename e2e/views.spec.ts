import { expect, test, type Page } from "@playwright/test";
import { api, createList, defaultListId, signIn, unique } from "./helpers";

// Deseables: vistas Calendario (WF-011) y Kanban (WF-012), filtro por
// responsable (WF-003) y panel «Mis tareas» del dashboard (WF-001, P-34).

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Un día del mes actual (`AAAA-MM-DD`). */
function thisMonth(day: number) {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addTask(page: Page, listId: number, title: string, fields: Record<string, unknown> = {}) {
  return api(page).post<{ id: number }>(`/lists/${listId}/tasks`, {
    title,
    description: null,
    due_date: null,
    assignee_ids: [],
    ...fields,
  });
}

test("calendario: cada tarea en su día, las sin fecha debajo y navegación por meses", async ({ page }) => {
  await signIn(page, "cal");
  const listId = await defaultListId(page);
  await addTask(page, listId, "Entrega parcial", { due_date: thisMonth(15) });
  await addTask(page, listId, "Idea sin fecha");
  await page.goto(`/lists/${listId}`);
  await page.getByRole("button", { name: "Calendario" }).click();

  const now = new Date();
  const title = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const calendar = page.getByRole("table", { name: `Calendario de ${title}` });
  await expect(calendar.getByRole("cell").filter({ hasText: /^15/ }).getByRole("link")).toHaveText("Entrega parcial");
  await expect(page.getByText("Sin fecha de vencimiento:")).toContainText("Idea sin fecha");

  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await expect(page.getByRole("link", { name: "Entrega parcial" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hoy" }).click();
  await expect(page.getByRole("table", { name: `Calendario de ${title}` })).toBeVisible();
});

test("kanban: columnas por estado; mover con el selector y arrastrando", async ({ page }) => {
  await signIn(page, "kanban");
  const listId = await defaultListId(page);
  await addTask(page, listId, "Primera");
  await addTask(page, listId, "Segunda");
  await page.goto(`/lists/${listId}`);
  await page.getByRole("button", { name: "Kanban" }).click();

  const column = (name: string) => page.getByRole("region", { name: new RegExp(`^${name}: `) });
  await expect(column("Por hacer").getByRole("article")).toHaveCount(2);

  await column("Por hacer").getByLabel("Estado de «Primera»").selectOption("in_progress");
  await expect(column("En progreso").getByRole("article")).toHaveText(/Primera/);

  await column("Por hacer").getByRole("article").filter({ hasText: "Segunda" }).dragTo(column("Hecha"));
  await expect(column("Hecha").getByRole("article")).toHaveText(/Segunda/);
  await expect(column("Hecha").getByRole("article")).toContainText("completada");
  await expect(column("Por hacer").getByRole("article")).toHaveCount(0);
});

test("filtro por responsable en una lista compartida", async ({ page, browser }) => {
  const ana = await signIn(page, "ana");
  const luisPage = await browser.newPage();
  const luis = await signIn(luisPage, "luis");
  const list = await createList(page, unique("Equipo"));
  const invitation = await api(page).post<{ id: number }>(`/lists/${list.id}/invitations`, { identifier: luis.username });
  await api(luisPage).post(`/invitations/${invitation.id}/accept`);
  await luisPage.close();
  await addTask(page, list.id, "De Ana", { assignee_ids: [ana.id] });
  await addTask(page, list.id, "De Luis", { assignee_ids: [luis.id] });
  await addTask(page, list.id, "De nadie");

  await page.goto(`/lists/${list.id}`);
  const titles = page.getByRole("row").filter({ has: page.getByRole("link") }).getByRole("link");
  await expect(titles).toHaveCount(3);
  await page.getByLabel("Filtrar por responsable").selectOption({ label: luis.username });
  await expect(titles).toHaveText(["De Luis"]);
  await page.getByLabel("Filtrar por responsable").selectOption("none");
  await expect(titles).toHaveText(["De nadie"]);
});

test("dashboard: «Mis tareas» separa creadas y asignadas, con su lista", async ({ page, browser }) => {
  const ana = await signIn(page, "ana");
  const luisPage = await browser.newPage();
  await signIn(luisPage, "luis");
  const list = await createList(luisPage, unique("Club"));
  const invitation = await api(luisPage).post<{ id: number }>(`/lists/${list.id}/invitations`, { identifier: ana.username });
  await api(page).post(`/invitations/${invitation.id}/accept`);
  await addTask(luisPage, list.id, "Me la asigna Luis", { assignee_ids: [ana.id] });
  await luisPage.close();
  await addTask(page, list.id, "La creo yo");

  await page.goto("/");
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Mis tareas", exact: true }) });
  const rows = panel.getByRole("row").filter({ has: page.getByRole("link") });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Me la asigna Luis" })).toContainText(list.name);

  await panel.getByRole("button", { name: "Creadas por mí" }).click();
  await expect(rows.getByRole("link")).toHaveText(["La creo yo"]);
  await panel.getByRole("button", { name: "Asignadas a mí" }).click();
  await expect(rows.getByRole("link")).toHaveText(["Me la asigna Luis"]);

  await panel.getByRole("button", { name: "Kanban" }).click();
  await expect(panel.getByRole("article")).toContainText(list.name);
});
