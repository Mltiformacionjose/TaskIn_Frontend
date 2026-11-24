import { expect, test } from "@playwright/test";
import { createList, signIn, unique } from "./helpers";

// WF-002 Mis listas (RF-08 a RF-10).

test("una cuenta nueva tiene solo «Mis tareas», personal y por defecto", async ({ page }) => {
  await signIn(page, "lists");
  await page.goto("/lists");

  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Mis tareas");
  await expect(cards.first()).toContainText("Por defecto");
});

test("crear una lista compartida la muestra con 0 tareas y 1 participante", async ({ page }) => {
  await signIn(page, "lists");
  const name = unique("Proyecto");
  await page.goto("/lists");
  await page.getByRole("button", { name: "＋ Nueva lista" }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva lista" });
  await dialog.getByLabel("Nombre *").fill(name);
  await dialog.getByText("Compartida", { exact: true }).click();
  await dialog.getByRole("button", { name: "Crear lista" }).click();

  const card = page.getByRole("article").filter({ hasText: name });
  await expect(card).toContainText("0 tareas");
  await expect(card).toContainText("1 participante");
});

test("el nombre vacío se rechaza antes de enviar", async ({ page }) => {
  await signIn(page, "lists");
  await page.goto("/lists");
  await page.getByRole("button", { name: "＋ Nueva lista" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Crear lista" }).click();

  await expect(page.getByText("El nombre de la lista es obligatorio.")).toBeVisible();
});

test("las listas de otra persona no aparecen y su dirección da «no accesible»", async ({ page, browser }) => {
  const owner = await browser.newPage();
  await signIn(owner, "owner");
  const foreign = await createList(owner, unique("Ajena"));
  await owner.close();

  await signIn(page, "other");
  await page.goto("/lists");
  await expect(page.getByText(foreign.name)).toHaveCount(0);
  await page.goto(`/lists/${foreign.id}`);
  await expect(page.getByText("La lista no existe o no tienes acceso a ella.")).toBeVisible();
});
