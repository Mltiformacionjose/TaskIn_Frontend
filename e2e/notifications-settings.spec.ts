import { expect, test, type Page } from "@playwright/test";
import { api, createList, day, defaultListId, signIn, unique, type Person } from "./helpers";

// WF-006 Notificaciones, WF-010 Ajustes (RF-33, RF-36) y nueva contraseña (RF-03).

async function teamWith(owner: Page, member: Page, memberPerson: Person) {
  const list = await createList(owner, unique("Equipo"));
  const invitation = await api(owner).post<{ id: number }>(`/lists/${list.id}/invitations`, { identifier: memberPerson.username });
  await api(member).post(`/invitations/${invitation.id}/accept`);
  return list;
}

function assign(owner: Page, listId: number, title: string, userId: number, due_date: string | null = null) {
  return api(owner).post<{ id: number }>(`/lists/${listId}/tasks`, { title, description: null, due_date, assignee_ids: [userId] });
}

test("un aviso de asignación lleva a la tarea y se marca como leído", async ({ page, browser }) => {
  const ownerPage = await browser.newPage();
  await signIn(ownerPage, "owner");
  const me = await signIn(page, "member");
  const list = await teamWith(ownerPage, page, me);
  const task = await assign(ownerPage, list.id, "Revisar memoria", me.id);
  await ownerPage.close();

  await page.goto("/notifications");
  const item = page.getByRole("listitem").filter({ hasText: "Te han asignado una tarea" });
  await expect(item).toContainText(`Tienes asignada «Revisar memoria» en «${list.name}».`);
  // Invitación recibida + asignación, sin leer.
  await expect(page.getByRole("link", { name: "Notificaciones (2 sin revisar)" })).toBeVisible();

  await item.getByRole("button", { name: "Marcar como leída" }).click();
  await expect(item.getByRole("button", { name: "Marcar como no leída" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notificaciones (1 sin revisar)" })).toBeVisible();

  await page.getByRole("button", { name: "No leídas · 1" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Nueva invitación" })).toBeVisible();
  await expect(item).toHaveCount(0);

  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await item.getByRole("link", { name: "Ver tarea" }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/tasks/${task.id}$`));
});

test("marcar todas como leídas deja el contador a cero", async ({ page }) => {
  await signIn(page, "late");
  await api(page).post(`/lists/${await defaultListId(page)}/tasks`, {
    title: "Entregar práctica",
    description: null,
    due_date: day(-1),
    assignee_ids: [],
  });

  await page.goto("/notifications");
  await expect(page.getByRole("listitem").filter({ hasText: "Tienes una tarea vencida" })).toContainText("«Entregar práctica»");
  await page.getByRole("button", { name: "Marcar todas como leídas" }).click();
  await expect(page.getByRole("button", { name: "No leídas · 0" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notificaciones", exact: true })).toBeVisible();
});

test("con las notificaciones desactivadas no llegan avisos nuevos, y el ajuste se guarda", async ({ page, browser }) => {
  const me = await signIn(page, "quiet");
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: "Activar notificaciones" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(page.getByText("Notificaciones desactivadas.")).toBeVisible();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  const ownerPage = await browser.newPage();
  await signIn(ownerPage, "owner");
  const list = await teamWith(ownerPage, page, me);
  await assign(ownerPage, list.id, "No me avises", me.id);
  await ownerPage.close();

  await page.goto("/notifications");
  await expect(page.getByText("No tienes avisos de los últimos 30 días.")).toBeVisible();
});

test("ajustes muestra la cuenta y permite cerrar sesión", async ({ page }) => {
  const me = await signIn(page, "settings");
  await page.goto("/settings");
  await expect(page.getByRole("main").getByText(me.email)).toBeVisible();

  await page.getByRole("main").getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("nueva contraseña: sin enlace, contraseñas distintas y enlace no válido", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByText("El enlace no es válido. Pide uno nuevo")).toBeVisible();

  await page.goto("/reset-password?token=inventado");
  await page.getByLabel("Nueva contraseña").fill("corta");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("La contraseña debe tener al menos 12 caracteres.")).toBeVisible();

  await page.getByLabel("Nueva contraseña").fill("una-contraseña-larga");
  await page.getByLabel("Repite la contraseña").fill("otra-contraseña-larga");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();

  await page.getByLabel("Repite la contraseña").fill("una-contraseña-larga");
  await page.getByLabel("Nueva contraseña").fill("una-contraseña-larga");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("El enlace no es válido o ha caducado. Pide uno nuevo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir otro enlace" })).toBeVisible();
});
