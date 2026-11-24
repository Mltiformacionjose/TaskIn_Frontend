import { expect, test } from "@playwright/test";
import { PASSWORD, registerPerson, unique } from "./helpers";

// WF-007 a WF-009: registro, acceso, cierre de sesión y recuperación (RF-01 a RF-03).

test("registro: crea la cuenta y lleva a iniciar sesión, sin abrir sesión", async ({ page }) => {
  const username = unique("reg");
  await page.goto("/register");
  await page.getByLabel("Nombre de usuario").fill(username);
  await page.getByLabel("Correo electrónico").fill(`${username}@example.com`);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("status")).toContainText("Cuenta creada");
  await page.getByRole("link", { name: "Ir a iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("registro: el correo repetido con otras mayúsculas se rechaza en su campo", async ({ page }) => {
  const person = await registerPerson(page.request);
  await page.goto("/register");
  await page.getByLabel("Nombre de usuario").fill(unique("otro"));
  await page.getByLabel("Correo electrónico").fill(person.email.toUpperCase());
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByText("Ya existe una cuenta con ese correo.")).toBeVisible();
});

test("acceso: contraseña incorrecta da un mensaje genérico", async ({ page }) => {
  const person = await registerPerson(page.request);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(person.email);
  await page.getByLabel("Contraseña").fill("incorrecta-1234");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
});

test("acceso correcto, la sesión sobrevive a recargar y cerrar sesión la termina", async ({ page }) => {
  const person = await registerPerson(page.request);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(person.email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(person.username).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(person.username).first()).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/login$/);
});

test("sin sesión, las pantallas privadas llevan a iniciar sesión", async ({ page }) => {
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/login$/);
});

test("recuperar contraseña: el mensaje no revela si la cuenta existe", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Correo electrónico").fill(`${unique("nadie")}@example.com`);
  await page.getByRole("button", { name: "Enviar instrucciones" }).click();

  await expect(page.getByRole("status")).toContainText("Si existe una cuenta con esa dirección");
});
