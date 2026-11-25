import { expect, test } from "@playwright/test";
import { api, createList, day, signIn } from "./helpers";

// En un móvil (390 px) ninguna pantalla debe desplazarse en horizontal:
// las tablas anchas se desplazan dentro de su panel.

test("las pantallas con sesión caben a lo ancho en un móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "mobile");
  const list = await createList(page, "Proyecto final");
  await api(page).post(`/lists/${list.id}/tasks`, {
    title: "Definir alcance del MVP",
    description: null,
    due_date: day(1),
    assignee_ids: [],
  });

  for (const url of ["/", "/lists", `/lists/${list.id}`, `/lists/${list.id}/participants`, "/invitations", "/notifications", "/settings", "/stats", "/trash"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, url).toBeLessThanOrEqual(390);
  }
});
