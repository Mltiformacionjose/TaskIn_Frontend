import { expect, test, type Page } from "@playwright/test";
import { api, createList, signIn } from "./helpers";

// Mejoras del 2026-11-26: «Deshacer» al eliminar (7), páginas de error propias
// (4), cabeceras de seguridad (5), contraste AA del botón primario (3) y
// aclaración de los totales del dashboard.

type Task = { id: number; title: string };

async function newTask(page: Page, listId: number, title: string): Promise<Task> {
  return api(page).post<Task>(`/lists/${listId}/tasks`, { title, description: null, due_date: null, assignee_ids: [] });
}

test("deshacer al eliminar una tarea la devuelve sin pasar por la papelera", async ({ page }) => {
  await signIn(page, "undo");
  const list = await createList(page, "Club de lectura");
  const task = await newTask(page, list.id, "Elegir libro");

  await page.goto(`/lists/${list.id}/tasks/${task.id}`);
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar tarea" }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));

  const toast = page.getByRole("status").filter({ hasText: "enviada a la papelera" });
  await expect(toast).toContainText("Tarea «Elegir libro» enviada a la papelera.");
  await toast.getByRole("button", { name: "Deshacer" }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/tasks/${task.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Editar tarea" })).toBeVisible();

  const trash = await api(page).get<{ tasks: unknown[] }>("/trash");
  expect(trash.tasks).toHaveLength(0);
});

test("deshacer al eliminar una lista la recupera y vuelve a ella", async ({ page }) => {
  await signIn(page, "undo");
  const list = await createList(page, "Viaje");

  await page.goto(`/lists/${list.id}`);
  await page.getByRole("button", { name: "Eliminar lista" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar lista" }).click();
  await expect(page).toHaveURL(/\/lists$/);

  const toast = page.getByRole("status").filter({ hasText: "enviada a la papelera" });
  await toast.getByRole("button", { name: "Deshacer" }).click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Viaje" })).toBeVisible();
});

test("el aviso se puede cerrar", async ({ page }) => {
  await signIn(page, "undo");
  const list = await createList(page, "Varios");
  const task = await newTask(page, list.id, "Algo");
  await page.goto(`/lists/${list.id}/tasks/${task.id}`);
  await page.getByRole("button", { name: "Eliminar tarea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar tarea" }).click();

  await page.getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(page.getByText("enviada a la papelera")).toHaveCount(0);
});

test("una dirección inexistente muestra la página 404 de TaskIn", async ({ page }) => {
  const response = await page.goto("/esta-pagina-no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("las páginas llevan cabeceras de seguridad", async ({ page }) => {
  const response = await page.goto("/login");
  const headers = response!.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain(new URL(process.env.E2E_API_URL!).origin);
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("el botón primario cumple el contraste AA (4,5:1)", async ({ page }) => {
  await page.goto("/login");
  // El color calculado puede venir como rgb(…), color(srgb …) u oklch(…): se pinta en un canvas para leer RGB.
  const [fg, bg] = await page.getByRole("button", { name: "Iniciar sesión" }).evaluate((el) => {
    const style = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d")!;
    return [style.color, style.backgroundColor].map((css) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
    });
  });
  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
});

test("el dashboard explica qué cuentan los totales", async ({ page }) => {
  await signIn(page, "dash");
  await page.goto("/");
  const totals = page.getByRole("region", { name: "Totales de mis tareas" });
  await expect(totals).toContainText("Cuentan las tareas asignadas a ti y las de tus listas personales.");
  await expect(totals).toContainText("Pendientes, asignadas a ti");
});
