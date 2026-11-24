import { expect, test } from "@playwright/test";
import { api, day, defaultListId, signIn } from "./helpers";

// WF-001 Dashboard (RF-26, RF-37, RF-38).

test("una cuenta nueva ve el dashboard vacío y su lista «Mis tareas»", async ({ page }) => {
  const me = await signIn(page, "dash");
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: `Hola, ${me.username}` })).toBeVisible();
  const totals = page.getByRole("region", { name: "Totales de mis tareas" });
  await expect(totals).toContainText("Por hacer0");
  await expect(page.getByText("No tienes tareas vencidas.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mis tareas" })).toBeVisible();
});

test("cuenta las tareas por estado y separa próximas y vencidas", async ({ page }) => {
  await signIn(page, "dash");
  const listId = await defaultListId(page);
  const post = (title: string, due_date: string | null) =>
    api(page).post<{ id: number }>(`/lists/${listId}/tasks`, { title, description: null, due_date, assignee_ids: [] });
  await post("Entregar memoria", day(-1));
  await post("Preparar defensa", day(1));
  await post("Sin fecha", null);
  const done = await post("Ya hecha", day(-3));
  await api(page).patch(`/tasks/${done.id}`, { status: "done" });

  await page.goto("/");

  const totals = page.getByRole("region", { name: "Totales de mis tareas" });
  await expect(totals).toContainText("Por hacer3");
  await expect(totals).toContainText("Hechas1");
  await expect(totals).toContainText("Vencidas1");
  const upcoming = page.locator("section", { has: page.getByRole("heading", { name: "Próximas tareas" }) });
  await expect(upcoming.getByRole("link", { name: "Preparar defensa" })).toBeVisible();
  const overdue = page.locator("section", { has: page.getByRole("heading", { name: "Vencidas" }) });
  await expect(overdue.getByRole("link", { name: "Entregar memoria" })).toBeVisible();
  await expect(overdue.getByText("Ya hecha")).toHaveCount(0);
});

test("«Crear tarea» abre el formulario en «Mis tareas»", async ({ page }) => {
  await signIn(page, "dash");
  const listId = await defaultListId(page);
  await page.goto("/");
  await page.getByRole("link", { name: "＋ Crear tarea" }).click();

  await expect(page).toHaveURL(new RegExp(`/lists/${listId}/tasks/new$`));
});
