import { expect, test, type Page } from "@playwright/test";
import { api, createList, signIn, unique } from "./helpers";

// WF-005 Gestionar participantes y WF-013 Invitaciones recibidas (RF-11, RF-12, RF-14).

async function inviteFromScreen(page: Page, listId: number, identifier: string) {
  await page.goto(`/lists/${listId}/participants`);
  await page.getByLabel("Correo electrónico o nombre de usuario").fill(identifier);
  await page.getByRole("button", { name: "＋ Enviar invitación" }).click();
}

test("invitar por correo, aceptar y aparecer como participante", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");

  await inviteFromScreen(page, list.id, guest.email.toUpperCase());
  await expect(page.getByText(`Invitación enviada a ${guest.username}.`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invitaciones pendientes · 1" })).toBeVisible();

  // La invitación pendiente no da acceso (CA-22) y se ve en la barra lateral.
  await guestPage.goto(`/lists/${list.id}`);
  await expect(guestPage.getByText("La lista no existe o no tienes acceso a ella.")).toBeVisible();
  await expect(guestPage.getByRole("link", { name: "Invitaciones (1 sin revisar)" })).toBeVisible();

  await guestPage.getByRole("link", { name: /Invitaciones/ }).click();
  await guestPage.getByRole("button", { name: `Aceptar la invitación a ${list.name}` }).click();
  await expect(guestPage).toHaveURL(new RegExp(`/lists/${list.id}$`));
  await expect(guestPage.getByRole("heading", { level: 1, name: list.name })).toBeVisible();
  await guestPage.close();

  await page.reload();
  const current = page.locator("section", { has: page.getByRole("heading", { name: "Participantes actuales" }) });
  await expect(current.getByRole("listitem").filter({ hasText: guest.username })).toContainText("Participante");
  await expect(page.getByRole("heading", { name: "Invitaciones pendientes · 0" })).toBeVisible();
});

test("rechazar una invitación la quita y no da acceso", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");
  await api(page).post(`/lists/${list.id}/invitations`, { identifier: guest.username });

  await guestPage.goto("/invitations");
  await guestPage.getByRole("button", { name: `Rechazar la invitación a ${list.name}` }).click();
  await expect(guestPage.getByText("Invitación rechazada.")).toBeVisible();
  await expect(guestPage.getByText("No tienes invitaciones pendientes.")).toBeVisible();
  await guestPage.close();
});

test("errores al invitar: persona inexistente, el propio propietario y duplicada", async ({ page, browser }) => {
  const owner = await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");
  await guestPage.close();

  await inviteFromScreen(page, list.id, unique("nadie"));
  await expect(page.getByText("No hay ninguna cuenta con ese correo o usuario.")).toBeVisible();

  await page.getByLabel("Correo electrónico o nombre de usuario").fill(owner.username);
  await page.getByRole("button", { name: "＋ Enviar invitación" }).click();
  await expect(page.getByText("Esa persona ya participa en la lista.")).toBeVisible();

  await page.getByLabel("Correo electrónico o nombre de usuario").fill(guest.username);
  await page.getByRole("button", { name: "＋ Enviar invitación" }).click();
  await expect(page.getByText(`Invitación enviada a ${guest.username}.`)).toBeVisible();
  await page.getByLabel("Correo electrónico o nombre de usuario").fill(guest.username);
  await page.getByRole("button", { name: "＋ Enviar invitación" }).click();
  await expect(page.getByText("Esa persona ya tiene una invitación pendiente.")).toBeVisible();
});

test("cancelar una invitación pendiente", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");
  await api(page).post(`/lists/${list.id}/invitations`, { identifier: guest.username });

  await page.goto(`/lists/${list.id}/participants`);
  await page.getByRole("button", { name: `Cancelar la invitación de ${guest.username}` }).click();
  await expect(page.getByText("No hay invitaciones pendientes.")).toBeVisible();

  await guestPage.goto("/invitations");
  await expect(guestPage.getByText("No tienes invitaciones pendientes.")).toBeVisible();
  await guestPage.close();
});

test("expulsar a un participante le quita el acceso y sus asignaciones", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");
  const invitation = await api(page).post<{ id: number }>(`/lists/${list.id}/invitations`, { identifier: guest.username });
  await api(guestPage).post(`/invitations/${invitation.id}/accept`);
  const task = await api(page).post<{ id: number }>(`/lists/${list.id}/tasks`, {
    title: "Tarea de Luis",
    description: null,
    due_date: null,
    assignee_ids: [guest.id],
  });

  await page.goto(`/lists/${list.id}/participants`);
  await page.getByRole("button", { name: "Expulsar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Expulsar" }).click();
  await expect(page.getByText("1 persona")).toBeVisible();

  const after = await api(page).get<{ assignee_ids: number[] }>(`/tasks/${task.id}`);
  expect(after.assignee_ids).toEqual([]);
  await guestPage.goto(`/lists/${list.id}`);
  await expect(guestPage.getByText("La lista no existe o no tienes acceso a ella.")).toBeVisible();
  await guestPage.close();
});

test("un participante que no es propietario no puede gestionar", async ({ page, browser }) => {
  await signIn(page, "owner");
  const list = await createList(page, unique("Club"));
  const guestPage = await browser.newPage();
  const guest = await signIn(guestPage, "guest");
  const invitation = await api(page).post<{ id: number }>(`/lists/${list.id}/invitations`, { identifier: guest.username });
  await api(guestPage).post(`/invitations/${invitation.id}/accept`);

  await guestPage.goto(`/lists/${list.id}/participants`);
  await expect(guestPage.getByText("Solo el propietario de la lista gestiona sus participantes.")).toBeVisible();
  await expect(guestPage.getByLabel("Correo electrónico o nombre de usuario")).toHaveCount(0);
  await guestPage.close();
});
