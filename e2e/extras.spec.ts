import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { api, createList, day, signIn } from "./helpers";

// Mejoras «si sobra tiempo» del 2026-11-26: exportar a calendario (10),
// atajos de teclado (11), modo claro (12) y aplicación instalable (13).

type Task = { id: number; title: string };

async function newTask(page: Page, listId: number, title: string, due: string | null): Promise<Task> {
  return api(page).post<Task>(`/lists/${listId}/tasks`, { title, description: null, due_date: due, assignee_ids: [] });
}

test("exportar a calendario descarga un .ics con las tareas pendientes con fecha", async ({ page }) => {
  await signIn(page, "ics");
  const list = await createList(page, "Entregas, curso 2026");
  await newTask(page, list.id, "Práctica 3; revisión", day(3));
  const done = await newTask(page, list.id, "Práctica 2", day(1));
  await newTask(page, list.id, "Sin fecha", null);
  await api(page).patch(`/tasks/${done.id}`, { status: "done" });

  await page.goto(`/lists/${list.id}`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar a calendario" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`taskin-lista-${list.id}.ics`);
  const ics = fs.readFileSync((await file.path())!, "utf-8");

  expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(ics).toContain("SUMMARY:Práctica 3\\; revisión");
  expect(ics).toContain(`DTSTART;VALUE=DATE:${day(3).replaceAll("-", "")}`);
  expect(ics).toContain("X-WR-CALNAME:TaskIn · Entregas\\, curso 2026");
  await expect(page.getByText("1 tarea exportada")).toBeVisible();
});

test("sin tareas pendientes con fecha, avisa en lugar de descargar", async ({ page }) => {
  await signIn(page, "ics");
  await page.goto("/");
  await page.getByRole("button", { name: "Exportar a calendario" }).click();
  await expect(page.getByText("No hay tareas pendientes con fecha límite para exportar.")).toBeVisible();
});

test("atajos de teclado: ayuda, ir a pantallas, buscar y nueva tarea", async ({ page }) => {
  await signIn(page, "keys");
  const list = await createList(page, "Club");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.keyboard.press("?");
  const help = page.getByRole("dialog", { name: "Atajos de teclado" });
  await expect(help).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();

  await page.keyboard.press("g");
  await page.keyboard.press("l");
  await expect(page).toHaveURL(/\/lists$/);
  await page.keyboard.press("/");
  await expect(page.getByLabel("Buscar una lista por nombre")).toBeFocused();
  // Escribiendo en un campo, las teclas no son atajos.
  await page.keyboard.type("n");
  await expect(page).toHaveURL(/\/lists$/);

  await page.goto(`/lists/${list.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Club" })).toBeVisible();
  await page.keyboard.press("n");
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/tasks/new$`));

  // El formulario puede poner el foco en «Título»: fuera de un campo, los atajos vuelven a funcionar.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("g");
  await page.keyboard.press("a");
  await expect(page.getByRole("heading", { level: 1, name: "Ajustes" })).toBeVisible();
});

test("modo claro: se elige en Ajustes, se aplica al momento y se recuerda", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await signIn(page, "theme");
  await page.goto("/settings");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");

  const theme = page.getByRole("group", { name: "Tema" });
  await theme.getByRole("button", { name: "Claro" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(canvas).toBe("rgb(245, 240, 235)");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(theme.getByRole("button", { name: "Claro" })).toHaveAttribute("aria-pressed", "true");

  // «Sistema» sigue al sistema operativo, también si cambia con la página abierta.
  await theme.getByRole("button", { name: "Sistema" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("la aplicación se puede instalar: manifiesto e iconos", async ({ page, request }) => {
  await page.goto("/login");
  const href = await page.locator("link[rel='manifest']").getAttribute("href");
  expect(href).toBeTruthy();

  const response = await request.get(href!);
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "TaskIn", start_url: "/", display: "standalone" });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons as { src: string }[]) {
    const image = await request.get(icon.src);
    expect(image.headers()["content-type"]).toBe("image/png");
  }
  await expect(page.locator("link[rel='icon'][type='image/svg+xml']")).toHaveCount(1);
});
