import { expect, test, type Page } from "@playwright/test";
import { api, createList, day, defaultListId, signIn, unique, type Person } from "./helpers";

// WF-003 Detalle de lista y WF-004 Crear y editar tarea (RF-17, RF-19 a RF-25).

async function addTask(page: Page, listId: number, title: string, fields: Record<string, unknown> = {}) {
  return api(page).post<{ id: number }>(`/lists/${listId}/tasks`, {
    title,
    description: null,
    due_date: null,
    assignee_ids: [],
    ...fields,
  });
}

/** Lista compartida de `owner` con `member` como participante (invitación aceptada por la API). */
async function sharedWith(owner: Page, member: Page, memberPerson: Person) {
  const list = await createList(owner, unique("Equipo"));
  const invitation = await api(owner).post<{ id: number }>(`/lists/${list.id}/invitations`, {
    identifier: memberPerson.username,
  });
  await api(member).post(`/invitations/${invitation.id}/accept`);
  return list;
}

function taskRows(page: Page) {
  return page.getByRole("row").filter({ has: page.getByRole("link") });
}

test("las tareas salen por fecha, sin fecha al final, y las vencidas se marcan", async ({ page }) => {
  await signIn(page, "detail");
  const listId = await defaultListId(page);
  await addTask(page, listId, "Sin fecha");
  await addTask(page, listId, "Pasado mañana", { due_date: day(2) });
  await addTask(page, listId, "Ayer", { due_date: day(-1) });

  await page.goto(`/lists/${listId}`);

  await expect(taskRows(page).getByRole("link")).toHaveText(["Ayer", "Pasado mañana", "Sin fecha"]);
  await expect(taskRows(page).first()).toContainText("Vencida");
  await expect(page.getByRole("region", { name: "Resumen de la lista" })).toContainText("Tareas totales3");
});

test("filtrar por estado y cambiar el estado desde la fila", async ({ page }) => {
  await signIn(page, "detail");
  const listId = await defaultListId(page);
  await addTask(page, listId, "Primera");
  await addTask(page, listId, "Segunda");
  await page.goto(`/lists/${listId}`);

  await page.getByLabel("Estado de «Primera»").selectOption("done");
  await expect(page.getByRole("region", { name: "Resumen de la lista" })).toContainText("Completadas1");

  await page.getByRole("button", { name: "Hecha" }).click();
  await expect(taskRows(page).getByRole("link")).toHaveText(["Primera"]);
  await page.getByRole("button", { name: "Por hacer" }).click();
  await expect(taskRows(page).getByRole("link")).toHaveText(["Segunda"]);
});

test("crear una tarea en una lista personal no ofrece responsables", async ({ page }) => {
  await signIn(page, "detail");
  const listId = await defaultListId(page);
  await page.goto(`/lists/${listId}`);
  await page.getByRole("link", { name: "＋ Nueva tarea" }).click();

  await expect(page.getByRole("group", { name: /Responsables/ })).toHaveCount(0);
  await page.getByLabel("Título *").fill("Comprar libros");
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea «Comprar libros» creada.")).toBeVisible();
});

test("editar una tarea: título, fecha y estado; al guardar vuelve a la lista", async ({ page }) => {
  await signIn(page, "detail");
  const listId = await defaultListId(page);
  const task = await addTask(page, listId, "Borrador", { due_date: day(5) });
  await page.goto(`/lists/${listId}/tasks/${task.id}`);

  await page.getByLabel("Título *").fill("Versión final");
  await page.getByLabel("Fecha de vencimiento").fill("");
  await page.getByLabel("Estado", { exact: true }).selectOption("done");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));
  const row = taskRows(page).filter({ hasText: "Versión final" });
  await expect(row).toContainText("Sin fecha");
  await expect(row.getByRole("combobox")).toHaveValue("done");
});

test("eliminar una tarea pide confirmación", async ({ page }) => {
  await signIn(page, "detail");
  const listId = await defaultListId(page);
  const task = await addTask(page, listId, "Para borrar");
  await page.goto(`/lists/${listId}/tasks/${task.id}`);

  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar tarea" }).click();

  await expect(page).toHaveURL(new RegExp(`/lists/${listId}$`));
  await expect(page.getByText("Esta lista aún no tiene tareas.")).toBeVisible();
});

test("en una lista compartida se asignan responsables entre los participantes", async ({ page, browser }) => {
  const owner = await signIn(page, "owner");
  const memberPage = await browser.newPage();
  const member = await signIn(memberPage, "member");
  const list = await sharedWith(page, memberPage, member);

  await page.goto(`/lists/${list.id}/tasks/new`);
  await page.getByLabel("Título *").fill("Repartir trabajo");
  await page.getByText(member.username, { exact: true }).click();
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea «Repartir trabajo» creada.")).toBeVisible();

  await memberPage.goto(`/lists/${list.id}`);
  const row = taskRows(memberPage).filter({ hasText: "Repartir trabajo" });
  await expect(row.getByText(member.username)).toBeAttached();
  const participants = memberPage.locator("section", { has: memberPage.getByRole("heading", { name: "Participantes" }) });
  await expect(participants.getByText(owner.username)).toBeVisible();
  await memberPage.close();
});

test("el propietario elimina su lista; un participante no ve esa acción", async ({ page, browser }) => {
  await signIn(page, "owner");
  const memberPage = await browser.newPage();
  const member = await signIn(memberPage, "member");
  const list = await sharedWith(page, memberPage, member);

  await memberPage.goto(`/lists/${list.id}`);
  await expect(memberPage.getByRole("heading", { level: 1, name: list.name })).toBeVisible();
  await expect(memberPage.getByRole("button", { name: "Eliminar lista" })).toHaveCount(0);
  await expect(memberPage.getByRole("link", { name: "＋ Invitar" })).toHaveCount(0);
  await memberPage.close();

  await page.goto(`/lists/${list.id}`);
  await page.getByRole("button", { name: "Eliminar lista" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar lista" }).click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mis listas" })).toBeVisible();
  // Next.js conserva oculta la página anterior: se comprueban solo las tarjetas.
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("article").filter({ hasText: list.name })).toHaveCount(0);
});

test("«Mis tareas» no se puede eliminar", async ({ page }) => {
  await signIn(page, "detail");
  await page.goto(`/lists/${await defaultListId(page)}`);

  await expect(page.getByRole("heading", { level: 1, name: "Mis tareas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eliminar lista" })).toHaveCount(0);
});
