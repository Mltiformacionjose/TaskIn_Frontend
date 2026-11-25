import { expect, test, type Page } from "@playwright/test";
import { api, createList, defaultListId, signIn, unique } from "./helpers";

// Últimos deseables: verificar el correo (RF-06), estadísticas (RF-39) e
// historial de actividad (RF-31, RF-32). El backend de las E2E escribe los
// correos en su consola, así que el enlace válido lo cubren las pruebas del
// backend; aquí, el aviso, el reenvío y un enlace no válido.

type Task = { id: number; title: string };

async function newTask(page: Page, listId: number, title: string): Promise<Task> {
  return api(page).post<Task>(`/lists/${listId}/tasks`, { title, description: null, due_date: null, assignee_ids: [] });
}

test("aviso de correo sin confirmar, reenvío y enlace no válido", async ({ page }) => {
  const me = await signIn(page, "verify");

  await page.goto("/");
  const banner = page.getByRole("region", { name: "Correo sin confirmar" });
  await expect(banner).toContainText(me.email);
  await banner.getByRole("button", { name: "Reenviar enlace" }).click();
  await expect(banner.getByRole("status")).toHaveText(`Te hemos enviado un enlace nuevo a ${me.email}.`);

  await page.goto("/settings");
  await expect(page.getByText("Sin confirmar: revisa tu bandeja", { exact: false })).toBeVisible();

  await page.goto("/verify-email?token=no-vale");
  await expect(page.getByText("El enlace de verificación no es válido o ha caducado.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir otro enlace en Ajustes" })).toBeVisible();
});

test("estadísticas: totales, cumplimiento, filtro por lista y periodo personalizado", async ({ page }) => {
  await signIn(page, "stats");
  const shared = await createList(page, unique("Club"));
  const personal = await defaultListId(page);
  const done = await newTask(page, shared.id, "Hecha");
  await newTask(page, shared.id, "Pendiente");
  await newTask(page, personal, "Mía");
  await api(page).patch(`/tasks/${done.id}`, { status: "done" });

  await page.goto("/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Estadísticas" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Estadísticas" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Resumen del periodo" });
  await expect(summary.getByText("Creadas").locator("..")).toContainText("3");
  await expect(summary.getByText("Completadas").locator("..")).toContainText("1");
  await expect(summary.getByText("Sin fechas límite vencidas en el periodo")).toBeVisible();
  await expect(page.getByRole("table", { name: "Tareas creadas y completadas por semana" })).toBeAttached();
  const byList = page.locator("section", { has: page.getByRole("heading", { name: "Por lista" }) });
  await expect(byList.getByRole("listitem").filter({ hasText: shared.name })).toContainText("1 de 2 hechas");

  await page.getByRole("combobox", { name: "Lista" }).selectOption({ label: shared.name });
  await expect(summary.getByText("Creadas").locator("..")).toContainText("2");
  await expect(byList.getByRole("listitem")).toHaveCount(1);

  // Un periodo que termina ayer no incluye las tareas de hoy.
  await page.getByRole("button", { name: "Personalizado" }).click();
  const yesterday = new Date(Date.now() - 86_400_000);
  const iso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Hasta").fill(iso);
  await expect(summary.getByText("Creadas").locator("..")).toContainText("0");
});

test("historial: la actividad de la lista y los cambios de estado de una tarea", async ({ page }) => {
  await signIn(page, "activity");
  const list = await createList(page, unique("Club"));
  const task = await newTask(page, list.id, "Informe");

  await page.goto(`/lists/${list.id}`);
  const activity = page.locator("section", { has: page.getByRole("heading", { name: "Actividad reciente" }) });
  await expect(activity.getByRole("listitem").first()).toContainText("creó «Informe»");

  await page.getByRole("combobox", { name: "Estado de «Informe»" }).selectOption({ label: "Hecha" });
  await expect(activity.getByRole("listitem").first()).toContainText("pasó «Informe» a Hecha");
  await expect(activity.getByRole("listitem").first()).toContainText("(tú)");

  await activity.getByRole("link", { name: "«Informe»" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/lists/${list.id}/tasks/${task.id}$`));
  const history = page.locator("section", { has: page.getByRole("heading", { name: "Historial" }) });
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByRole("listitem").first()).toContainText("a Hecha");
  await expect(history.getByRole("listitem").last()).toContainText("creó");
});
