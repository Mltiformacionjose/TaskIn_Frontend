import { expect, test } from "@playwright/test";
import { API, PASSWORD, signIn, unique, WEB } from "./helpers";

// WF-010 Ajustes, datos de la cuenta y contraseña (RF-05).

function accountPanel(page: import("@playwright/test").Page, heading: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: heading, exact: true }) });
}

test("cambiar el nombre de usuario se ve en la barra lateral", async ({ page }) => {
  await signIn(page, "acc");
  const username = unique("nuevo");

  await page.goto("/settings");
  const panel = accountPanel(page, "Cuenta");
  await panel.getByLabel("Nombre de usuario").fill(username);
  await expect(panel.getByLabel("Contraseña actual")).toHaveCount(0);
  await panel.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(panel.getByText("Datos de la cuenta guardados.")).toBeVisible();
  await expect(page.getByRole("complementary").getByText(username)).toBeVisible();
});

test("cambiar el correo pide la contraseña actual", async ({ page }) => {
  await signIn(page, "acc");
  const email = `${unique("correo")}@example.com`;

  await page.goto("/settings");
  const panel = accountPanel(page, "Cuenta");
  await panel.getByLabel("Correo electrónico").fill(email);
  await panel.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(panel.getByText("Escribe tu contraseña actual para cambiar el correo.")).toBeVisible();

  await panel.getByLabel("Contraseña actual").fill("no-es-la-contraseña");
  await panel.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(panel.getByText("La contraseña actual no es correcta.")).toBeVisible();

  await panel.getByLabel("Contraseña actual").fill(PASSWORD);
  await panel.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(panel.getByText("Datos de la cuenta guardados.")).toBeVisible();
  await expect(panel.getByLabel("Correo electrónico")).toHaveValue(email);
});

test("cambiar la contraseña mantiene esta sesión y cierra las demás", async ({ page, browser }) => {
  const person = await signIn(page, "acc");
  const other = await browser.newPage();
  await other.request.post(`${API}/auth/login`, {
    headers: { Origin: WEB },
    data: { email: person.email, password: PASSWORD },
  });
  const newPassword = "otra-contraseña-e2e-5678";

  await page.goto("/settings");
  const panel = accountPanel(page, "Contraseña");
  await panel.getByLabel("Contraseña actual").fill(PASSWORD);
  await panel.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword);
  await panel.getByLabel("Repite la nueva contraseña").fill("no-coincide-para-nada");
  await panel.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(panel.getByText("Las contraseñas no coinciden.")).toBeVisible();

  await panel.getByLabel("Contraseña actual").fill(PASSWORD);
  await panel.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword);
  await panel.getByLabel("Repite la nueva contraseña").fill(newPassword);
  await panel.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(panel.getByText("Contraseña cambiada. Se han cerrado tus sesiones en otros dispositivos.")).toBeVisible();

  // Esta sesión sigue; la otra ya no.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
  await other.goto("/settings");
  await expect(other).toHaveURL(/\/login/);
  await other.close();
});
