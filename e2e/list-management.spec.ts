import { expect, test, type Browser, type Page } from "@playwright/test";
import { api, createList, defaultListId, signIn, unique, type Person } from "./helpers";

// Gestión de listas (deseables): editar y convertir en compartida (RF-16),
// abandonar (RF-13), transferir la propiedad (RF-15) y aviso de edición
// simultánea de una tarea (RF-29).

type Invitation = { id: number; list_id: number };

/** Abre otra sesión que participa en la lista (invitada por `owner` y con la invitación aceptada). */
async function participant(owner: Page, browser: Browser, listId: number): Promise<{ page: Page; person: Person }> {
  const page = await browser.newPage();
  const person = await signIn(page, "guest");
  await api(owner).post(`/lists/${listId}/invitations`, { identifier: person.username });
  const [invitation] = await api(page).get<Invitation[]>("/invitations");
  await api(page).post(`/invitations/${invitation.id}/accept`);
  return { page, person };
}

function membersPanel(page: Page, heading: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: heading }) });
}

test("editar una lista personal y convertirla en compartida", async ({ page }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Casa"), "personal");
  const name = unique("Hogar");

  await page.goto(`/lists/${list.id}`);
  await expect(page.getByRole("link", { name: "＋ Invitar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Editar lista" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lista" });
  await dialog.getByLabel("Nombre *").fill(name);
  await dialog.getByLabel("Descripción").fill("Tareas de casa");
  await dialog.getByLabel("Convertir en lista compartida").check();
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: "Tareas de casa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "＋ Invitar" })).toBeVisible();

  // Ya es compartida: no se ofrece volver a personal.
  await page.getByRole("button", { name: "Editar lista" }).click();
  await expect(dialog.getByLabel("Convertir en lista compartida")).toHaveCount(0);
});

test("«Mis tareas» se puede renombrar pero no compartir", async ({ page }) => {
  await signIn(page, "owner");
  const listId = await defaultListId(page);

  await page.goto(`/lists/${listId}`);
  await page.getByRole("button", { name: "Editar lista" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar lista" });
  await expect(dialog.getByLabel("Convertir en lista compartida")).toHaveCount(0);
  await dialog.getByLabel("Nombre *").fill("");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
});

test("un participante abandona la lista y deja de verla", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guest = await participant(page, browser, list.id);

  await guest.page.goto(`/lists/${list.id}`);
  await expect(guest.page.getByRole("button", { name: "Editar lista" })).toHaveCount(0);
  await guest.page.getByRole("button", { name: "Abandonar lista" }).click();
  await guest.page.getByRole("dialog").getByRole("button", { name: "Abandonar lista" }).click();
  await expect(guest.page).toHaveURL(/\/lists$/);
  await expect(guest.page.getByRole("main").getByRole("article").filter({ hasText: list.name })).toHaveCount(0);
  await guest.page.close();

  await page.goto(`/lists/${list.id}/participants`);
  await expect(membersPanel(page, "Participantes actuales").getByText(guest.person.username)).toHaveCount(0);
  // El propietario no ve «Abandonar».
  await page.goto(`/lists/${list.id}`);
  await expect(page.getByRole("button", { name: "Abandonar lista" })).toHaveCount(0);
});

test("transferir la propiedad a un participante", async ({ page, browser }) => {
  const owner = await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guest = await participant(page, browser, list.id);

  await page.goto(`/lists/${list.id}/participants`);
  const row = membersPanel(page, "Participantes actuales").getByRole("listitem").filter({ hasText: guest.person.username });
  await row.getByRole("button", { name: "Hacer propietario" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Transferir" }).click();

  // Vuelve al detalle: ahora es participante y puede abandonar.
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));
  await expect(page.getByRole("button", { name: "Abandonar lista" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar lista" })).toHaveCount(0);
  const members = membersPanel(page, "Participantes");
  await expect(members.getByRole("listitem").filter({ hasText: owner.username })).toContainText("Participante");
  await expect(members.getByRole("listitem").filter({ hasText: guest.person.username })).toContainText("Propietario");

  await guest.page.goto(`/lists/${list.id}`);
  await expect(guest.page.getByRole("button", { name: "Editar lista" })).toBeVisible();
  await expect(guest.page.getByRole("link", { name: "＋ Invitar" })).toBeVisible();
  await guest.page.close();
});

test("aviso al guardar una tarea que otra persona ha cambiado", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guest = await participant(page, browser, list.id);
  const task = await api(page).post<{ id: number }>(`/lists/${list.id}/tasks`, { title: "Informe" });

  await page.goto(`/lists/${list.id}/tasks/${task.id}`);
  await expect(page.getByLabel("Título *")).toHaveValue("Informe");
  // Mientras tanto, el participante la cambia.
  await api(guest.page).patch(`/tasks/${task.id}`, { title: "Informe final" });
  await guest.page.close();

  await page.getByLabel("Título *").fill("Mi informe");
  await page.getByRole("button", { name: /Guardar/ }).click();
  await expect(page.getByText("Alguien ha cambiado esta tarea mientras la editabas.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Cargar la versión actual" }).click();
  await expect(page.getByLabel("Título *")).toHaveValue("Informe final");
  await page.getByLabel("Título *").fill("Mi informe");
  await page.getByRole("button", { name: /Guardar/ }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));
  await expect(page.getByRole("main").getByText("Mi informe").first()).toBeVisible();
});
